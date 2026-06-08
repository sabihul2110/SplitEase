# backend/schemas/invites.py
from pydantic import BaseModel


class GenerateInviteRequest(BaseModel):
    expires_hours: int | None = None