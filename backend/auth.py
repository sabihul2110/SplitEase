# --- backend/auth.py ---
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

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# ── Password hashing ───────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

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


# ── Dependency injected into protected routes ──────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency. Add `current_user: dict = Depends(get_current_user)`
    to any route that requires login.

    FIX S3b: After decoding the JWT, fetch token_version from the DB.
    If the value in the token is less than the current DB value, the token
    predates a password change and is no longer valid.

    Returns the decoded token payload:
        { "user_id": int, "email": str, "role": str, "token_version": int }
    """
    payload = decode_token(token)

    # Validate token_version against current DB value.
    # Import here to avoid circular import (auth ← db ← config ← auth).
    import db as _db
    conn = _db.get_connection()
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

    db_version    = row[0]
    token_version = payload.get("token_version", 0)

    if token_version < db_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency for admin-only routes.
    Use: `current_user: dict = Depends(require_admin)`
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user