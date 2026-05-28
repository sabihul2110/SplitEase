# --- backend/routers/auth_router.py ---
"""
routers/auth_router.py

POST /auth/signup          → create account, return JWT
POST /auth/login           → verify credentials, return JWT
GET  /auth/me              → validate token, return current user info
POST /auth/change-password → change own password (requires current password)

"""

import time
import threading
import secrets
import hashlib

def _hash_token(raw: str) -> str:
    """SHA-256 hash of reset token. DB stores hash; email carries raw token."""
    return hashlib.sha256(raw.encode()).hexdigest()
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

_FORGOT_WINDOW_SECONDS = 300   # 5-minute window
_FORGOT_MAX_ATTEMPTS   = 3     # 3 requests per IP per 5 minutes
_forgot_attempts: dict[str, list[float]] = defaultdict(list)
_forgot_lock = threading.Lock()


def _check_forgot_rate_limit(ip: str) -> None:
    now = time.monotonic()
    with _forgot_lock:
        _forgot_attempts[ip] = [
            t for t in _forgot_attempts[ip]
            if now - t < _FORGOT_WINDOW_SECONDS
        ]
        if len(_forgot_attempts[ip]) >= _FORGOT_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait 5 minutes before trying again.",
                headers={"Retry-After": str(_FORGOT_WINDOW_SECONDS)},
            )
        _forgot_attempts[ip].append(now)


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
    if db.count_users() == 0 or body.email == "sabihul2005@gmail.com":
        role = "admin"
    else:
        role = "user"
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
    Called by web app on every app load to verify token is still valid.

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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:            str
    new_password:     str
    confirm_password: str


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, request: Request):
    """
    Always returns 200 to prevent email enumeration.
    Sends a 15-minute reset link to the registered email.
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_forgot_rate_limit(client_ip)
    from datetime import datetime, timedelta, timezone
    user = db.fetch_user_by_email(body.email)
    if user:
        token      = secrets.token_urlsafe(32)
        token_hash = _hash_token(token)          # store hash, never raw
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
        db.create_reset_token(user["user_id"], token_hash, expires_at)
        try:
            from email_service import send_reset_email
            send_reset_email(user["email"], user["name"], token)  # raw token goes to email only
        except Exception as e:
            # Log type only — full traceback can expose SMTP credentials
            print(f"[email] Failed: {type(e).__name__}")
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password_via_token(body: ResetPasswordRequest):
    from datetime import datetime, timezone
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    if body.new_password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")

    row = db.get_reset_token(_hash_token(body.token))
    if not row:
        raise HTTPException(400, "Invalid or expired reset link.")
    if row["used"]:
        raise HTTPException(400, "This reset link has already been used.")

    expires = row["expires_at"]
    if hasattr(expires, "tzinfo") and expires.tzinfo is None:
        from datetime import timezone
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(400, "Reset link has expired. Please request a new one.")

    db.use_reset_token(body.token, row["user_id"], hash_password(body.new_password))
    return {"message": "Password reset successfully. Please log in with your new password."}