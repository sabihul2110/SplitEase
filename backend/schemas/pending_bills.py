# SplitEase/backend/schemas/pending_bills.py


from pydantic import BaseModel, field_validator


class PendingBillPayRequest(BaseModel):
    amount:       float
    expense_date: str
    expense_time: str | None = None
    payer_id:     int | None = None
    note:         str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be positive.")
        return v


class PendingBillOut(BaseModel):
    pending_id:          int
    bill_id:              int
    status:                str
    generated_for_month:   str
    created_at:             str
    paid_at:                str | None
    name:                    str
    icon_name:               str
    group_id:                int | None
    category_id:              int
    subcategory_id:            int | None