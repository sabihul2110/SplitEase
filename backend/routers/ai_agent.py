# backend/routers/ai_agent.py
"""
routers/ai_agent.py — Intelligent Reflex Agent

FIX #20: ReceiptScannerAgent is now a module-level singleton.
          Previously a new instance was created on every POST /ai/scan-receipt,
          which re-initialised the google-genai Client object on every request.
          The Client is stateless and safe to share — creating it once at import
          time eliminates the per-request overhead.

FIX #21: CATEGORY_RULES now only maps to categories that actually exist in the
          seeded database (Travel, Accommodation, Food & Dining, Activities,
          Utilities, Groceries). Previous version mapped to Transport, Shopping,
          Entertainment, Healthcare, Education — none of which are seeded,
          so cat_id was always None for those categories and the subcategory
          link was also lost. The prompt's category list is now derived from
          CATEGORY_RULES values so the LLM never returns an unmappable name.
"""

import json
import re
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
    expense_date:     str
    merchant_name:    str | None
    confidence:       str


# ─────────────────────────────────────────────
#  Intelligent Reflex Agent
# ─────────────────────────────────────────────

class ReceiptScannerAgent:
    """
    Simple Reflex Agent for receipt parsing (Russell & Norvig).

    FIX #21: CATEGORY_RULES now maps ONLY to the 6 seeded DB categories.
    Keywords are expanded to cover what the old Transport/Shopping/etc.
    categories were catching, re-routed to the nearest valid DB category.
    """

    # Maps lowercase keywords → seeded DB category names ONLY
    CATEGORY_RULES: dict[str, str] = {
        # Food & Dining (was also capturing cafe/coffee)
        "restaurant":  "Food & Dining",
        "cafe":        "Food & Dining",
        "coffee":      "Food & Dining",
        "food":        "Food & Dining",
        "dining":      "Food & Dining",
        "swiggy":      "Food & Dining",
        "zomato":      "Food & Dining",
        "bakery":      "Food & Dining",
        "dhaba":       "Food & Dining",
        "meal":        "Food & Dining",
        "snack":       "Food & Dining",
        # Travel (absorbs transport keywords — nearest valid category)
        "train":       "Travel",
        "flight":      "Travel",
        "uber":        "Travel",
        "ola":         "Travel",
        "metro":       "Travel",
        "taxi":        "Travel",
        "cab":         "Travel",
        "bus":         "Travel",
        "rapido":      "Travel",
        "auto":        "Travel",
        "fuel":        "Travel",
        "petrol":      "Travel",
        "diesel":      "Travel",
        # Groceries (absorbs shopping keywords)
        "grocery":     "Groceries",
        "groceries":   "Groceries",
        "supermarket": "Groceries",
        "vegetables":  "Groceries",
        "fruits":      "Groceries",
        "reliance":    "Groceries",
        "dmart":       "Groceries",
        "bigbasket":   "Groceries",
        "zepto":       "Groceries",
        "blinkit":     "Groceries",
        "kirana":      "Groceries",
        # Utilities
        "electricity": "Utilities",
        "water":       "Utilities",
        "internet":    "Utilities",
        "broadband":   "Utilities",
        "mobile":      "Utilities",
        "recharge":    "Utilities",
        "rent":        "Utilities",
        "bill":        "Utilities",
        # Accommodation (absorbs hotel/shopping for durable goods — nearest valid)
        "hotel":       "Accommodation",
        "hostel":      "Accommodation",
        "airbnb":      "Accommodation",
        "pg":          "Accommodation",
        # Activities (absorbs entertainment/sports/education)
        "movie":       "Activities",
        "cinema":      "Activities",
        "pvr":         "Activities",
        "inox":        "Activities",
        "bookmyshow":  "Activities",
        "concert":     "Activities",
        "gym":         "Activities",
        "sport":       "Activities",
        "cricket":     "Activities",
        "football":    "Activities",
        "badminton":   "Activities",
        "sightseeing": "Activities",
        "trekking":    "Activities",
        "adventure":   "Activities",
    }

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def _build_prompt(self) -> str:
        today      = date.today().isoformat()
        # FIX #21: only expose valid DB category names to the LLM
        categories = sorted(set(self.CATEGORY_RULES.values()))
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

    def _map_to_db_ids(
        self,
        category_name:    str,
        subcategory_name: str | None,
        db_categories:    list[dict],
        db_subcategories: list[dict],
    ) -> tuple[int | None, int | None]:
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

    def perceive_and_act(
        self,
        image_bytes:          bytes,
        mime_type:            str,
        db_categories:        list[dict],
        db_subcategories_map: dict[int, list[dict]],
    ) -> dict:
        image_part  = genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        prompt_part = self._build_prompt()

        response = self.client.models.generate_content(
            model    = "gemini-2.5-flash",
            contents = [image_part, prompt_part],
        )
        raw_text = (response.text or "").strip()
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$",           "", raw_text)
        parsed   = json.loads(raw_text)

        all_subcats = [s for subs in db_subcategories_map.values() for s in subs]
        cat_id, sub_id = self._map_to_db_ids(
            parsed.get("category_name", ""),
            parsed.get("subcategory_name"),
            db_categories,
            all_subcats,
        )

        return {
            "amount":           float(parsed.get("amount", 0)),
            "description":      parsed.get("description", ""),
            "category_name":    parsed.get("category_name", ""),
            "subcategory_name": parsed.get("subcategory_name"),
            "category_id":      cat_id,
            "subcategory_id":   sub_id,
            "expense_date":     parsed.get("expense_date", date.today().isoformat()),
            "merchant_name":    parsed.get("merchant_name"),
            "confidence":       parsed.get("confidence", "low"),
        }


# ─────────────────────────────────────────────
#  FIX #20: Singleton — created ONCE at module import, shared across requests
# ─────────────────────────────────────────────
_agent: ReceiptScannerAgent | None = None

def get_agent() -> ReceiptScannerAgent:
    global _agent
    if _agent is None:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="AI receipt scanning is not configured. Set GEMINI_API_KEY in .env.",
            )
        _agent = ReceiptScannerAgent(api_key=GEMINI_API_KEY)
    return _agent


# ─────────────────────────────────────────────
#  FastAPI endpoint
# ─────────────────────────────────────────────

@router.post("/scan-receipt", response_model=ReceiptScanResult)
async def scan_receipt(
    file:         UploadFile = File(...),
    current_user: dict       = Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, or WEBP image.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10 MB.")

    categories  = db.fetch_categories()
    subcats_map = {cat["category_id"]: db.fetch_subcategories(cat["category_id"]) for cat in categories}

    # FIX #20: use singleton agent, not a new instance per request
    agent = get_agent()

    try:
        result = agent.perceive_and_act(
            image_bytes          = image_bytes,
            mime_type            = file.content_type,
            db_categories        = categories,
            db_subcategories_map = subcats_map,
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Agent could not parse the receipt. Try a clearer image.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return result