# SplitEase/backend/schemas/people.py


from pydantic import BaseModel
from typing import Optional


class PersonCreate(BaseModel):
    display_name:   str
    linked_user_id: Optional[int] = None


class EntryCreate(BaseModel):
    direction:   str
    amount:      float
    note:        Optional[str] = None
    entry_date:  str
    sender_name: Optional[str] = None

class EntryRepay(BaseModel):
    repayment_amount: float
    repayment_date:   Optional[str] = None  # YYYY-MM-DD; defaults to today if omitted


class SettleUpIn(BaseModel):
    settlement_date: Optional[str] = None  # YYYY-MM-DD; defaults to today if omitted