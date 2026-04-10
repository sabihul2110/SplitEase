# --- backend/routers/auth_router.py ---
"""
routers/auth_router.py

POST /auth/signup          → create account, return JWT
POST /auth/login           → verify credentials, return JWT
GET  /auth/me              → validate token, return current user info
POST /auth/change-password → change own password (requires current password)

FIX S3a: Rate limiting on POST /auth/login — max 10 attempts per IP per minute.
          Uses a simple in-process sliding-window counter (no Redis needed for
          a single-process college deployment). Resets automatically over time.

FIX S3b: Password change increments a token_version column in Users.
          The JWT now embeds token_version; get_current_user rejects tokens
          whose version is stale, effectively invalidating all sessions issued
          before the password change.

  MIGRATION REQUIRED — run this before deploying:
      ALTER TABLE Users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
"""

import time
import threading
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
import mysql.connector

import db
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user,
)

router = APIRouter(tags=["Auth"])


# ── FIX S3a: In-process rate limiter ──────────────────────────────────────
#
# Stores (ip → list[timestamp]) for login attempts.
# On each request we evict timestamps older than the window, then check count.
# Thread-safe via a lock (uvicorn runs multiple threads for sync routes).

_LOGIN_WINDOW_SECONDS = 60
_LOGIN_MAX_ATTEMPTS   = 10
_login_attempts: dict[str, list[float]] = defaultdict(list)
_login_lock = threading.Lock()


def _check_login_rate_limit(ip: str) -> None:
    """Raise HTTP 429 if this IP has exceeded the login attempt threshold."""
    now = time.monotonic()
    with _login_lock:
        # Evict attempts outside the sliding window
        _login_attempts[ip] = [
            t for t in _login_attempts[ip]
            if now - t < _LOGIN_WINDOW_SECONDS
        ]
        if len(_login_attempts[ip]) >= _LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Please wait {_LOGIN_WINDOW_SECONDS} seconds.",
                headers={"Retry-After": str(_LOGIN_WINDOW_SECONDS)},
            )
        _login_attempts[ip].append(now)


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


# ── Routes ─────────────────────────────────────────────────────────────────

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

    # New accounts start at token_version=0 (DEFAULT in schema)
    token = create_access_token({
        "user_id":       user_id,
        "email":         body.email,
        "role":          role,
        "token_version": 0,
    })
    return AuthResponse(access_token=token, user_id=user_id, name=body.name, role=role, email=body.email)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, request: Request):
    # FIX S3a: rate-limit by client IP before touching the DB
    client_ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(client_ip)

    user = db.fetch_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # FIX S3b: embed token_version so stale tokens can be rejected
    token = create_access_token({
        "user_id":       user["user_id"],
        "email":         user["email"],
        "role":          user["role"],
        "token_version": user.get("token_version", 0),
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

    FIX S3b: get_current_user now validates token_version (see auth.py).
    If the password was changed after this token was issued, this returns 401.
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


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body:         ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Change the authenticated user's password.

    FIX S3b: After updating the hash, increment token_version in the DB.
    All previously issued JWTs embed the old version number and will be
    rejected by get_current_user going forward — effectively logging out
    all other active sessions for this user.
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

    # 4. Hash + store the new password AND bump token_version atomically
    new_hash = hash_password(body.new_password)
    conn = db.get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            UPDATE Users
            SET    password_hash = %s,
                   token_version = token_version + 1
            WHERE  user_id = %s
            """,
            (new_hash, current_user["user_id"]),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()

    return {"message": "Password changed successfully. All other sessions have been logged out."}