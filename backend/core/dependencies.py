# SplitEase/backend/core/dependencies.py
"""
FastAPI dependencies.
get_current_user and require_admin live here — not in auth.py —
so auth.py stays pure crypto (no DB imports, no circular deps).
"""

import time
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.security import decode_token
from repositories import user_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# In-process cache: user_id -> (token_version, cached_at).
# Avoids a DB round trip on every request while still catching
# revoked/deleted sessions within _CACHE_TTL_SECONDS.
# Per-process cache — fine on a single Render instance. If you scale to
# multiple instances, staleness is bounded by _CACHE_TTL_SECONDS rather
# than being unbounded, which is what happens today.
_token_version_cache: dict[int, tuple[int, float]] = {}
_CACHE_TTL_SECONDS = 30


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Decodes the JWT, then confirms the session hasn't been revoked:
      - user still exists (catches admin_wipe_app / delete_user)
      - token_version still matches (catches admin_wipe_app /
        reset_user_data / change_password)
    Cached per user for _CACHE_TTL_SECONDS to keep DB hits low.
    """
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    now = time.time()
    cached = _token_version_cache.get(user_id)

    if cached is None or (now - cached[1]) > _CACHE_TTL_SECONDS:
        auth_state = user_repository.fetch_user_auth_state(user_id)
        if auth_state is None:
            _token_version_cache.pop(user_id, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session no longer valid. Please log in again.",
            )
        current_version = auth_state["token_version"]
        _token_version_cache[user_id] = (current_version, now)
    else:
        current_version = cached[0]

    if payload.get("token_version") != current_version:
        _token_version_cache.pop(user_id, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session no longer valid. Please log in again.",
        )

    return payload


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user