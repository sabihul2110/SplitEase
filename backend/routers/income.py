# --- backend/routers/income.py ---
"""
Income routes.

GET  /income/          → list current user's income entries
POST /income/          → add income entry
DELETE /income/{id}    → delete (owner only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user

router = APIRouter()

VALID_SOURCE_TYPES = {"salary", "pocket_money", "stipend", "other"}


class IncomeIn(BaseModel):
    amount:      float
    source_type: str  = "other"   # salary | pocket_money | stipend | other
    note:        str | None = None
    income_date: str               # YYYY-MM-DD


@router.get("/income/")
def list_income(current_user: dict = Depends(get_current_user)):
    return db.fetch_income(current_user["user_id"])


@router.post("/income/", status_code=status.HTTP_201_CREATED)
def add_income(
    body: IncomeIn,
    current_user: dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    if body.source_type not in VALID_SOURCE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"source_type must be one of {sorted(VALID_SOURCE_TYPES)}",
        )
    new_id = db.insert_income(
        user_id     = current_user["user_id"],
        amount      = body.amount,
        source_type = body.source_type,
        note        = body.note,
        income_date = body.income_date,
    )
    return {"income_id": new_id, "message": "Income recorded."}


@router.delete("/income/{income_id}", status_code=status.HTTP_200_OK)
def delete_income(
    income_id: int,
    current_user: dict = Depends(get_current_user),
):
    db.delete_income(income_id, current_user["user_id"])
    return {"message": "Deleted."}