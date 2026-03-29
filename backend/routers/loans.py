# --- backend/routers/loans.py ---
"""
Lending / loan routes.

GET  /loans/                         → list loans given by current user
POST /loans/                         → record a new loan
POST /loans/{id}/repay               → record a partial or full repayment
DELETE /loans/{id}                   → delete loan record (owner only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user

router = APIRouter()


class LoanIn(BaseModel):
    borrower_name: str
    amount:        float
    note:          str | None = None
    loan_date:     str          # YYYY-MM-DD


class RepaymentIn(BaseModel):
    repayment_amount: float


@router.get("/loans/")
def list_loans(current_user: dict = Depends(get_current_user)):
    return db.fetch_loans(current_user["user_id"])


@router.post("/loans/", status_code=status.HTTP_201_CREATED)
def add_loan(
    body: LoanIn,
    current_user: dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Loan amount must be positive.")
    if not body.borrower_name.strip():
        raise HTTPException(status_code=422, detail="Borrower name is required.")
    new_id = db.insert_loan(
        lender_user_id = current_user["user_id"],
        borrower_name  = body.borrower_name,
        amount         = body.amount,
        note           = body.note,
        loan_date      = body.loan_date,
    )
    return {"loan_id": new_id, "message": f"Loan to {body.borrower_name} recorded."}


@router.post("/loans/{loan_id}/repay", status_code=status.HTTP_200_OK)
def repay_loan(
    loan_id: int,
    body: RepaymentIn,
    current_user: dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = db.record_loan_repayment(
            loan_id          = loan_id,
            user_id          = current_user["user_id"],
            repayment_amount = body.repayment_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


@router.delete("/loans/{loan_id}", status_code=status.HTTP_200_OK)
def delete_loan(
    loan_id: int,
    current_user: dict = Depends(get_current_user),
):
    db.delete_loan(loan_id, current_user["user_id"])
    return {"message": "Loan record deleted."}