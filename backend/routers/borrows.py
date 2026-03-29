# --- backend/routers/borrows.py ---
"""
Borrow routes — money the current user BORROWED from someone.

GET  /borrows/                  → list borrows for current user
POST /borrows/                  → record a new borrow
POST /borrows/{id}/repay        → record repayment (reduces remaining)
DELETE /borrows/{id}            → delete borrow record (owner only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user

router = APIRouter()


class BorrowIn(BaseModel):
    lender_name:  str
    amount:       float
    note:         str | None = None
    borrow_date:  str          # YYYY-MM-DD


class BorrowRepayIn(BaseModel):
    repayment_amount: float


@router.get("/borrows/")
def list_borrows(current_user: dict = Depends(get_current_user)):
    return db.fetch_borrows(current_user["user_id"])


@router.post("/borrows/", status_code=status.HTTP_201_CREATED)
def add_borrow(
    body: BorrowIn,
    current_user: dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    if not body.lender_name.strip():
        raise HTTPException(status_code=422, detail="Lender name is required.")
    new_id = db.insert_borrow(
        borrower_user_id = current_user["user_id"],
        lender_name      = body.lender_name,
        amount           = body.amount,
        note             = body.note,
        borrow_date      = body.borrow_date,
    )
    return {"borrow_id": new_id, "message": f"Borrow from {body.lender_name} recorded."}


@router.post("/borrows/{borrow_id}/repay", status_code=status.HTTP_200_OK)
def repay_borrow(
    borrow_id: int,
    body: BorrowRepayIn,
    current_user: dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = db.record_borrow_repayment(
            borrow_id        = borrow_id,
            user_id          = current_user["user_id"],
            repayment_amount = body.repayment_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


@router.delete("/borrows/{borrow_id}", status_code=status.HTTP_200_OK)
def delete_borrow(
    borrow_id: int,
    current_user: dict = Depends(get_current_user),
):
    db.delete_borrow(borrow_id, current_user["user_id"])
    return {"message": "Borrow record deleted."}