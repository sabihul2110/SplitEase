# --- backend/routers/auth_router.py ---
"""
routers/auth_router.py

POST /auth/signup          → create account, return JWT
POST /auth/login           → verify credentials, return JWT
GET  /auth/me              → validate token, return current user info
POST /auth/change-password → change own password (requires current password) ← NEW
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import mysql.connector
import db
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user,
)

router = APIRouter(tags=["Auth"])


# ── Pydantic models ────────────────────────────────────────────────────────

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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str


# ── Existing routes (unchanged) ────────────────────────────────────────────

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
    Called by frontend on every app load to verify token is still valid.
    """
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


# ── NEW: change password ───────────────────────────────────────────────────

@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body:         ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Change the authenticated user's password.
    Requires the current password for verification.
    Validates new password length and confirmation match server-side.
    """
    # 1. Validate inputs
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from the current one.")

    # 2. Fetch current hash from DB
    user = db.fetch_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # 3. Verify current password
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    # 4. Hash + store the new password
    new_hash = hash_password(body.new_password)
    conn = db.get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            "UPDATE Users SET password_hash = %s WHERE user_id = %s",
            (new_hash, current_user["user_id"]),  
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()

    return {"message": "Password changed successfully."}