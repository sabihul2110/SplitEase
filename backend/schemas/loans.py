# backend/schemas/loans.py
from pydantic import BaseModel


class LoanIn(BaseModel):
    borrower_name:  str
    amount:         float
    note:           str | None = None
    loan_date:      str  # YYYY-MM-DD
    linked_user_id: int | None = None


class RepaymentIn(BaseModel):
    repayment_amount: float