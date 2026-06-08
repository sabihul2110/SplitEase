# backend/schemas/users.py
from pydantic import BaseModel, EmailStr


class UpdateUserRequest(BaseModel):
    name:   str
    email:  EmailStr
    upi_id: str | None = None