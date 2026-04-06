# backend/routers/ai_agent.py
"""
routers/ai_agent.py — Intelligent Reflex Agent (AI Course Requirement)

Architecture (per Russell & Norvig):
  Percept    → The raw receipt image uploaded by the user
  Agent Fn   → ReceiptScannerAgent.perceive_and_act()
  Knowledge Base → Google Gemini Vision API (gemini-2.0-flash)
  Action     → Structured JSON: { amount, description, category_name,
                                   subcategory_name, expense_date }

The agent is purely reactive: one image in → one structured dict out.
No memory, no planning, no world model — classic Simple Reflex Agent.
"""

import json
import re
import base64
from datetime import date

from google import genai
from google.genai import types as genai_types

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from config import GEMINI_API_KEY
import db
from auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Agent"])


# ─────────────────────────────────────────────
#  Response schema
# ─────────────────────────────────────────────

class ReceiptScanResult(BaseModel):
    amount:           float
    description:      str
    category_name:    str
    subcategory_name: str | None
    category_id:      int | None
    subcategory_id:   int | None
    expense_date:     str          # YYYY-MM-DD
    merchant_name:    str | None
    confidence:       str          # "high" | "medium" | "low"


# ─────────────────────────────────────────────
#  Intelligent Reflex Agent class
# ─────────────────────────────────────────────

class ReceiptScannerAgent:
    """
    Simple Reflex Agent for receipt parsing.

    The agent's condition-action rules are embedded in the prompt:
      IF image contains a total amount  → extract it as float
      IF image contains a date          → extract as YYYY-MM-DD
      IF image contains merchant/items  → map to closest category
      ELSE                              → return best-effort defaults
    """

    # Condition-action rule table: maps keywords the LLM might return
    # to our DB category names. Acts as the agent's internal rule base.
    CATEGORY_RULES: dict[str, str] = {
        # Food & Dining
        "restaurant": "Food & Dining",
        "cafe":        "Food & Dining",
        "coffee":      "Food & Dining",
        "food":        "Food & Dining",
        "dining":      "Food & Dining",
        "swiggy":      "Food & Dining",
        "zomato":      "Food & Dining",
        "bakery":      "Food & Dining",
        "dhaba":       "Food & Dining",
        # Transport
        "fuel":        "Transport",
        "petrol":      "Transport",
        "diesel":      "Transport",
        "uber":        "Transport",
        "ola":         "Transport",
        "metro":       "Transport",
        "taxi":        "Transport",
        "auto":        "Transport",
        "bus":         "Transport",
        # Groceries
        "grocery":     "Groceries",
        "supermarket": "Groceries",
        "vegetables":  "Groceries",
        "fruits":      "Groceries",
        "reliance":    "Groceries",
        "dmart":       "Groceries",
        "bigbasket":   "Groceries",
        # Shopping
        "amazon":      "Shopping",
        "flipkart":    "Shopping",
        "mall":        "Shopping",
        "shop":        "Shopping",
        "store":       "Shopping",
        "clothing":    "Shopping",
        # Entertainment
        "movie":       "Entertainment",
        "cinema":      "Entertainment",
        "pvr":         "Entertainment",
        "inox":        "Entertainment",
        "bookmyshow":  "Entertainment",
        "concert":     "Entertainment",
        # Utilities
        "electricity": "Utilities",
        "water":       "Utilities",
        "internet":    "Utilities",
        "mobile":      "Utilities",
        "recharge":    "Utilities",
        "bill":        "Utilities",
        # Healthcare
        "pharmacy":    "Healthcare",
        "hospital":    "Healthcare",
        "doctor":      "Healthcare",
        "medicine":    "Healthcare",
        "medical":     "Healthcare",
        "clinic":      "Healthcare",
        # Education
        "college":     "Education",
        "university":  "Education",
        "books":       "Education",
        "stationery":  "Education",
        "tuition":     "Education",
        # Accommodation
        "hotel":       "Accommodation",
        "hostel":      "Accommodation",
        "rent":        "Accommodation",
        "pg":          "Accommodation",
    }

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    # ── Knowledge base query (prompt = encoded rules) ──────────────────
    def _build_prompt(self) -> str:
        today = date.today().isoformat()
        categories = list(set(self.CATEGORY_RULES.values()))
        return f"""You are a receipt parser. Analyse this receipt image and extract information.

Return ONLY a valid JSON object with these exact keys (no markdown, no explanation):
{{
  "amount": <total bill amount as a number, e.g. 450.00>,
  "description": <short description like "Dinner at Cafe Coffee Day" — max 60 chars>,
  "category_name": <one of: {categories}>,
  "subcategory_name": <specific subcategory or null>,
  "expense_date": <date on receipt as YYYY-MM-DD, or "{today}" if not visible>,
  "merchant_name": <merchant or store name, or null>,
  "confidence": <"high" if you can clearly read amount and merchant, "medium" if partially visible, "low" if unclear>
}}

Rules:
- amount must be the FINAL total (after tax, after discounts).
- If multiple totals exist, pick the largest one marked as "Total", "Grand Total", or "Amount Due".
- description should be merchant + item summary (e.g. "Groceries at DMart").
- category_name must be EXACTLY one of the options listed above.
- If the image is not a receipt, return amount: 0 and confidence: "low"."""

    # ── Action: map category name → DB IDs ────────────────────────────
    def _map_to_db_ids(
        self,
        category_name: str,
        subcategory_name: str | None,
        db_categories: list[dict],
        db_subcategories: list[dict],
    ) -> tuple[int | None, int | None]:
        """
        Condition-action rule: match LLM category string to real DB IDs.
        Falls back to keyword scan of CATEGORY_RULES if exact match fails.
        """
        cat_id = None
        for cat in db_categories:
            if cat["category_name"].lower() == category_name.lower():
                cat_id = cat["category_id"]
                break

        if cat_id is None:
            lower_cat = category_name.lower()
            for keyword, mapped_name in self.CATEGORY_RULES.items():
                if keyword in lower_cat:
                    for cat in db_categories:
                        if cat["category_name"].lower() == mapped_name.lower():
                            cat_id = cat["category_id"]
                            break
                if cat_id:
                    break

        sub_id = None
        if cat_id and subcategory_name:
            for sub in db_subcategories:
                if sub["subcategory_name"].lower() == subcategory_name.lower():
                    sub_id = sub["subcategory_id"]
                    break

        return cat_id, sub_id

    # ── Main agent function ────────────────────────────────────────────
    def perceive_and_act(
        self,
        image_bytes: bytes,
        mime_type: str,
        db_categories: list[dict],
        db_subcategories_map: dict[int, list[dict]],
    ) -> dict:
        """
        Core agent loop:
          1. Build percept from image
          2. Query knowledge base (Gemini Vision)
          3. Parse response
          4. Apply condition-action rules to map categories → DB IDs
          5. Return action (structured dict)
        """
        # Build percept: image part + text prompt
        image_part = genai_types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )
        prompt_part = self._build_prompt()

        # Query knowledge base (gemini-2.0-flash supports vision)
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, prompt_part],
        )
        raw_text = response.text.strip()

        # Strip markdown fences if model wraps in ```json
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed = json.loads(raw_text)

        # Gather all subcategories (flatten map for lookup)
        all_subcats = []
        for subs in db_subcategories_map.values():
            all_subcats.extend(subs)

        category_name    = parsed.get("category_name", "")
        subcategory_name = parsed.get("subcategory_name")

        cat_id, sub_id = self._map_to_db_ids(
            category_name, subcategory_name, db_categories, all_subcats
        )

        return {
            "amount":           float(parsed.get("amount", 0)),
            "description":      parsed.get("description", ""),
            "category_name":    category_name,
            "subcategory_name": subcategory_name,
            "category_id":      cat_id,
            "subcategory_id":   sub_id,
            "expense_date":     parsed.get("expense_date", date.today().isoformat()),
            "merchant_name":    parsed.get("merchant_name"),
            "confidence":       parsed.get("confidence", "low"),
        }


# ─────────────────────────────────────────────
#  FastAPI endpoint
# ─────────────────────────────────────────────

@router.post("/scan-receipt", response_model=ReceiptScanResult)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    POST /ai/scan-receipt
    Accepts a receipt image, returns structured expense data.
    Used by both AddExpense (group) and AddEntryModal (personal).
    """
    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, or WEBP image."
        )

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10 MB.")

    categories = db.fetch_categories()
    subcats_map: dict[int, list[dict]] = {}
    for cat in categories:
        subcats_map[cat["category_id"]] = db.fetch_subcategories(cat["category_id"])

    agent = ReceiptScannerAgent(api_key=GEMINI_API_KEY)
    try:
        result = agent.perceive_and_act(
            image_bytes=image_bytes,
            mime_type=file.content_type,
            db_categories=categories,
            db_subcategories_map=subcats_map,
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="Agent could not parse the receipt. Try a clearer image."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return result