# backend/schemas/borrows.py
from pydantic import BaseModel


class BorrowIn(BaseModel):
    lender_name: str
    amount:      float
    note:        str | None = None
    borrow_date: str  # YYYY-MM-DD


class BorrowRepayIn(BaseModel):
    repayment_amount: float