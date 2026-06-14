# SplitEase/backend/schemas/people.py


from pydantic import BaseModel
from typing import Optional


class PersonCreate(BaseModel):
    display_name: str


class EntryCreate(BaseModel):
    direction:  str        # 'lent' | 'borrowed'
    amount:     float
    note:       Optional[str] = None
    entry_date: str        # YYYY-MM-DD


class EntryRepay(BaseModel):
    repayment_amount: float