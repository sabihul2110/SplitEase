# --- SplitEase/backend/core/auth.py ---
"""
auth.py — password hashing and JWT utilities.
Nothing here touches the DB directly — it's pure crypto logic,
except get_current_user which now validates token_version.

FIX S3b: get_current_user fetches token_version from the DB and compares
         it to the version embedded in the JWT. A mismatch means the
         password was changed after this token was issued → reject with 401.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# get_current_user and require_admin have moved to dependencies.py

# ── Password hashing ───────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """
    Sign a JWT containing `data`.
    Adds an `exp` (expiry) claim automatically.
    Callers should include token_version in data for invalidation support.
    """
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT.
    Raises HTTPException 401 if invalid or expired.
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )