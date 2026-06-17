# backend/schemas/borrows.py
from pydantic import BaseModel


class BorrowIn(BaseModel):
    lender_name:    str
    amount:         float
    note:           str | None = None
    borrow_date:    str  # YYYY-MM-DD
    linked_user_id: int | None = None


class BorrowRepayIn(BaseModel):
    repayment_amount: float