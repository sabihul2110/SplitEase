# backend/schemas/ai.py
from pydantic import BaseModel


class ReceiptScanResult(BaseModel):
    amount:           float
    description:      str
    category_name:    str
    subcategory_name: str | None
    category_id:      int | None
    subcategory_id:   int | None
    expense_date:     str
    merchant_name:    str | None
    confidence:       str