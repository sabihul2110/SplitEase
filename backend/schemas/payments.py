# backend/schemas/payments.py
from pydantic import BaseModel
from datetime import date


class AllocationItem(BaseModel):
    expense_id:    int
    allocated_amt: float


class AddPaymentRequest(BaseModel):
    payer_id:     int
    payee_id:     int
    amount:       float
    note:         str | None = None
    payment_date: date
    allocations:  list[AllocationItem] = []