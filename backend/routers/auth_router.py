# --- backend/routers/auth_router.py ---

"""
routers/auth_router.py

POST /auth/signup  → create account, return JWT
POST /auth/login   → verify credentials, return JWT
GET  /auth/me      → validate token, return current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import mysql.connector

import db
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    upi_id:   str | None = None


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    name:         str
    role:         str
    email:        str


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    role = "admin" if db.count_users() == 0 else "user"
    try:
        user_id = db.insert_user_with_auth(
            name=body.name, email=body.email,
            password_hash=hash_password(body.password),
            upi_id=body.upi_id, role=role,
        )
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    token = create_access_token({"user_id": user_id, "email": body.email, "role": role})
    return AuthResponse(access_token=token, user_id=user_id, name=body.name, role=role, email=body.email)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    user = db.fetch_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({
        "user_id": user["user_id"],
        "email":   user["email"],
        "role":    user["role"],
    })
    return AuthResponse(
        access_token=token,
        user_id=user["user_id"],
        name=user["name"],
        role=user["role"],
        email=user["email"],
    )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Validate the current token and return fresh user info.
    Called by frontend on every app load to check token is still valid.
    Returns 401 if token is expired or invalid (handled by auth dependency).
    """
    # Fetch fresh user data from DB (role may have changed, name updated, etc.)
    conn = db.get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, role, upi_id FROM Users WHERE user_id = %s",
        (current_user["user_id"],),
    )
    user = cur.fetchone()
    cur.close(); conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    return {
        "user_id": user["user_id"],
        "name":    user["name"],
        "email":   user["email"],
        "role":    user["role"],
        "upi_id":  user["upi_id"],
    }