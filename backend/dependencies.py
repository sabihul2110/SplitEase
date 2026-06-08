# backend/dependencies.py
"""
FastAPI dependencies.
get_current_user and require_admin live here — not in auth.py —
so auth.py stays pure crypto (no DB imports, no circular deps).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from auth import decode_token
from database import get_connection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decodes and validates the JWT.
    token_version DB check removed for latency — free tier cross-region
    round-trip added ~150ms to every authenticated request.
    Re-enable when Redis is available for caching.
    """
    return decode_token(token)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user