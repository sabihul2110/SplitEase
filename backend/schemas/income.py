# backend/schemas/income.py
from pydantic import BaseModel


class IncomeIn(BaseModel):
    amount:      float
    source_type: str        = "other"  # salary | pocket_money | stipend | other
    note:        str | None = None
    income_date: str  # YYYY-MM-DD