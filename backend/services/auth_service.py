# backend/services/auth_service.py
"""
Auth business logic that sits above repositories and crypto.
Keeps auth_router.py thin — it handles HTTP, this handles logic.
"""

import random
import string
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from repositories import auth_repository, user_repository
from core.security import hash_password, verify_password, create_access_token


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def login_user(email: str, password: str) -> dict | None:
    """
    Verify credentials. Returns token payload dict on success, None on failure.
    Caller raises HTTPException on None.
    """
    user = user_repository.fetch_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return {
        "access_token": create_access_token({
            "user_id":       user["user_id"],
            "email":         user["email"],
            "role":          user["role"],
            "token_version": user.get("token_version", 0),
        }),
        "token_type": "bearer",
        "user_id":    user["user_id"],
        "name":       user["name"],
        "role":       user["role"],
        "email":      user["email"],
    }


def register_user(name: str, email: str, password: str, upi_id: str | None = None) -> dict:
    """
    Create account. Assigns admin role to first user.
    Returns same shape as login_user.
    """
    role = "admin" if user_repository.count_users() == 0 else "user"
    user_id = user_repository.insert_user_with_auth(
        name=name,
        email=email,
        password_hash=hash_password(password),
        upi_id=upi_id,
        role=role,
    )
    return {
        "access_token": create_access_token({
            "user_id":       user_id,
            "email":         email,
            "role":          role,
            "token_version": 0,
        }),
        "token_type": "bearer",
        "user_id":    user_id,
        "name":       name,
        "role":       role,
        "email":      email,
    }


def initiate_password_reset(email: str) -> dict | None:
    """
    Generate a 6-digit OTP, store its hash, return (raw_token, user) or None.
    Returns None if email not found — caller should NOT reveal this.
    """
    user = user_repository.fetch_user_by_email(email)
    if not user:
        return None

    # Generate a secure 6-digit numeric OTP
    raw_token = "".join(random.choices(string.digits, k=6))
    
    # Hash the OTP before saving it to the database
    token_hash = _hash_token(raw_token)
    
    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=15)
    ).strftime("%Y-%m-%d %H:%M:%S")

    auth_repository.create_reset_token(user["user_id"], token_hash, expires_at)
    
    # Return the unhashed OTP so the email service can send it to the user
    return {"raw_token": raw_token, "user": user}


def complete_password_reset(raw_token: str, new_password: str) -> bool:
    """
    Validate token and update password.
    Returns True on success, raises ValueError with reason on failure.
    """
    token_hash = _hash_token(raw_token)
    row = auth_repository.get_reset_token(token_hash)

    if not row:
        raise ValueError("Invalid or expired reset link.")
    if row["used"]:
        raise ValueError("This reset link has already been used.")

    expires = row["expires_at"]
    if hasattr(expires, "tzinfo") and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        raise ValueError("Reset link has expired. Please request a new one.")

    auth_repository.use_reset_token(token_hash, row["user_id"], hash_password(new_password))
    return True


def change_user_password(
    user_id: int,
    email: str,
    current_password: str,
    new_password: str,
) -> None:
    """
    Change password for authenticated user.
    Raises ValueError with reason on any validation failure.
    """
    user = user_repository.fetch_user_by_email(email)
    if not user:
        raise ValueError("User not found.")
    if not verify_password(current_password, user["password_hash"]):
        raise ValueError("Current password is incorrect.")

    auth_repository.update_password_and_bump_version(user_id, hash_password(new_password))