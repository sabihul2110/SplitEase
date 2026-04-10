# --- backend/routers/settlements.py ---
"""
routers/settlements.py

GET /settlements/{group_id}             → raw balances for one group
GET /settlements/{group_id}/simplified  → minimal payment transactions
POST /settlements/bulk                  → balances for multiple groups  ← NEW #15

FIX #15: New POST /settlements/bulk endpoint accepts a list of group_ids
          and returns all settlement rows in one DB round-trip.
          Replaces the N individual GET /settlements/{id} calls made by
          Dashboard.jsx, Groups.jsx, and Profile.jsx on every page load.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import get_current_user

router = APIRouter()


@router.get("/{group_id}")
def raw_settlements(group_id: int, current_user: dict = Depends(get_current_user)):
    """Returns one row per member with their net_balance."""
    rows = db.calculate_settlements(group_id, current_user["user_id"])
    if rows == [] and not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return rows


@router.get("/{group_id}/simplified")
def simplified_settlements(group_id: int, current_user: dict = Depends(get_current_user)):
    """Returns minimal transactions needed to settle all debts."""
    rows = db.calculate_settlements(group_id, current_user["user_id"])
    return db.simplify_debts(rows)


class BulkSettlementRequest(BaseModel):
    group_ids: list[int]


@router.post("/bulk")
def bulk_settlements(
    body:         BulkSettlementRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    FIX #15: Return settlement rows for multiple groups in one call.

    Only returns data for groups the user is a member of — non-member
    group_ids are silently dropped from the result (no 403, because the
    frontend just passes all its groups and expects data for its own).

    Returns: { group_id: [settlement_rows], ... }
    """
    if not body.group_ids:
        return {}

    # Filter to groups the user actually belongs to (security: no peeking)
    is_admin = current_user.get("role") == "admin"
    if is_admin:
        allowed_ids = body.group_ids
    else:
        allowed_ids = [
            gid for gid in body.group_ids
            if db.is_group_member(gid, current_user["user_id"])
        ]

    if not allowed_ids:
        return {}

    return db.fetch_settlements_for_groups(allowed_ids)