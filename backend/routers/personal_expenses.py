# --- backend/routers/personal_expenses.py ---
"""
Personal expense routes (not group-based).

GET  /personal-expenses/          → list current user's personal expenses
POST /personal-expenses/          → add a personal expense
DELETE /personal-expenses/{id}    → delete (owner only)
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, condecimal

import db
from auth import get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PersonalExpenseIn(BaseModel):
    amount:       float
    category:     str  = "General"
    note:         str | None = None
    expense_date: str        # YYYY-MM-DD


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/personal-expenses/")
def list_personal_expenses(current_user: dict = Depends(get_current_user)):
    return db.fetch_personal_expenses(current_user["user_id"])


@router.post("/personal-expenses/", status_code=status.HTTP_201_CREATED)
def add_personal_expense(
    body: PersonalExpenseIn,
    current_user: dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    new_id = db.insert_personal_expense(
        user_id      = current_user["user_id"],
        amount       = body.amount,
        category     = body.category,
        note         = body.note,
        expense_date = body.expense_date,
    )
    return {"expense_id": new_id, "message": "Personal expense added."}


@router.delete("/personal-expenses/{expense_id}", status_code=status.HTTP_200_OK)
def delete_personal_expense(
    expense_id: int,
    current_user: dict = Depends(get_current_user),
):
    db.delete_personal_expense(expense_id, current_user["user_id"])
    return {"message": "Deleted."}