# --- backend/auth.py ---

"""
auth.py — password hashing and JWT utilities.
Nothing here touches the DB directly — it's pure crypto logic.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# ── Password hashing ───────────────────────────────
# bcrypt is the industry standard — slow on purpose to resist brute force.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────
# tokenUrl tells FastAPI's auto-docs where to get a token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict) -> str:
    """
    Sign a JWT containing `data`.
    Adds an `exp` (expiry) claim automatically.
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


# ── Dependency injected into protected routes ──────
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency. Add `current_user: dict = Depends(get_current_user)`
    to any route that requires login.
    Returns the decoded token payload:
        { "user_id": int, "email": str, "role": str }
    """
    return decode_token(token)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency for admin-only routes.
    Use: `current_user: dict = Depends(require_admin)`
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user