# --- backend/routers/timeline.py ---
"""
Unified financial timeline.

GET /timeline/   → merged, date-sorted feed of all financial events
                   for the current user (personal expenses, group expenses,
                   income, loans, settlements received).

Optional query param:  ?limit=100  (default 100, max 200)
"""

from fastapi import APIRouter, Depends, Query

import db
from auth import get_current_user

router = APIRouter()


@router.get("/timeline/")
def get_timeline(
    limit: int = Query(default=100, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    return db.fetch_unified_timeline(current_user["user_id"], limit=limit)