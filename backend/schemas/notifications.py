# backend/schemas/notifications.py
from pydantic import BaseModel


class ReminderRequest(BaseModel):
    debtor_user_id: int
    amount:         float