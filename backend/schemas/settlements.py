# backend/schemas/settlements.py
from pydantic import BaseModel


class BulkSettlementRequest(BaseModel):
    group_ids: list[int]