# backend/schemas/expenses.py
from pydantic import BaseModel
from datetime import date


class SplitItem(BaseModel):
    user_id:     int
    amount_owed: float
    share_pct:   float | None = None


class AddExpenseRequest(BaseModel):
    payer_id:       int
    category_id:    int
    subcategory_id: int | None = None
    total_amount:   float
    description:    str
    split_type:     str = "equal"
    expense_date:   date
    splits:         list[SplitItem]


class UpdateExpenseRequest(BaseModel):
    payer_id:       int
    category_id:    int
    subcategory_id: int | None = None
    total_amount:   float
    description:    str
    split_type:     str = "equal"
    expense_date:   date
    splits:         list[SplitItem]