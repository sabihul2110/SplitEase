# backend/schemas/personal_expenses.py
from pydantic import BaseModel


class PersonalExpenseIn(BaseModel):
    amount:         float
    category:       str        = "General"
    note:           str | None = None
    expense_date:   str  # YYYY-MM-DD
    subcategory_id: int | None = None
    merchant_name:  str | None = None