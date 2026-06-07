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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decodes JWT, then validates token_version against DB.
    Returns decoded payload: {user_id, email, role, token_version}.
    """
    payload = decode_token(token)

    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT token_version FROM Users WHERE user_id = %s",
        (payload.get("user_id"),),
    )
    row = cur.fetchone()
    cur.close(); conn.close()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("token_version", 0) < row[0]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user