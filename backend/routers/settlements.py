# --- backend/routers/settlements.py ---

"""
routers/settlements.py

GET /settlements/{group_id}          → raw balances (total_paid, total_owed, net)
GET /settlements/{group_id}/simplified → minimal payment transactions
"""

from fastapi import APIRouter, Depends, HTTPException

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
    """
    Returns minimal transactions needed to settle all debts.
    e.g. [{ "from": "Kabir", "to": "Ayaan", "amount": 500.0 }]
    """
    rows = db.calculate_settlements(group_id, current_user["user_id"])
    return db.simplify_debts(rows)