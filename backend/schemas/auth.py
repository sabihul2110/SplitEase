# backend/schemas/auth.py
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    upi_id:   str | None = None


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token:             str
    token_type:               str = "bearer"
    user_id:                  int
    name:                     str
    role:                     str
    email:                    str
    raw_verification_token:   str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:            str
    new_password:     str
    confirm_password: str