# --- backend/routers/groups.py ---

"""
routers/groups.py

GET    /groups/                      → my groups
GET    /groups/all                   → all groups (admin)
POST   /groups/                      → create group
GET    /groups/{group_id}/members    → list members
PUT    /groups/{group_id}            → rename group (admin)
PUT    /groups/{group_id}/members    → replace member list (admin)
DELETE /groups/{group_id}            → delete group (admin)
GET    /groups/categories            → all categories
GET    /groups/subcategories/{cat_id}→ subcategories for a category
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user, require_admin

router = APIRouter()


class CreateGroupRequest(BaseModel):
    group_name: str
    user_ids:   list[int]   # members to add (must include creator)


class UpdateGroupRequest(BaseModel):
    group_name: str


class UpdateMembersRequest(BaseModel):
    user_ids: list[int]


@router.get("/")
def my_groups(current_user: dict = Depends(get_current_user)):
    return db.fetch_groups(current_user["user_id"])


@router.get("/all")
def all_groups(current_user: dict = Depends(require_admin)):
    return db.fetch_all_groups()


@router.get("/categories")
def categories(current_user: dict = Depends(get_current_user)):
    return db.fetch_categories()


@router.get("/subcategories/{category_id}")
def subcategories(category_id: int, current_user: dict = Depends(get_current_user)):
    return db.fetch_subcategories(category_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_group(body: CreateGroupRequest, current_user: dict = Depends(get_current_user)):
    if len(body.user_ids) < 2:
        raise HTTPException(status_code=400, detail="A group needs at least 2 members.")
    group_id = db.insert_group(body.group_name, body.user_ids)
    return {"group_id": group_id, "message": "Group created."}


@router.get("/{group_id}/members")
def group_members(group_id: int, current_user: dict = Depends(get_current_user)):
    if not db.is_group_member(group_id, current_user["user_id"]) and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return db.fetch_group_members(group_id)


@router.put("/{group_id}")
def update_group(group_id: int, body: UpdateGroupRequest, current_user: dict = Depends(require_admin)):
    db.update_group(group_id, body.group_name)
    return {"message": "Group renamed."}


@router.put("/{group_id}/members")
def update_members(group_id: int, body: UpdateMembersRequest, current_user: dict = Depends(require_admin)):
    db.update_group_members(group_id, body.user_ids)
    return {"message": "Members updated."}


# @router.delete("/{group_id}")
# def delete_group(group_id: int, current_user: dict = Depends(require_admin)):
#     db.delete_group(group_id)
#     return {"message": "Group deleted."}

@router.delete("/{group_id}")
def delete_group(group_id: int, current_user: dict = Depends(get_current_user)):
    is_admin   = current_user.get("role") == "admin"
    creator_id = db.fetch_group_creator(group_id)
    if not is_admin and current_user["user_id"] != creator_id:
        raise HTTPException(status_code=403, detail="Only the group creator can delete this group.")
    db.delete_group(group_id)
    return {"message": "Group deleted."}

# --- backend/routers/groups.py  (ADD these two endpoints) ---
#
# The frontend calls POST /groups/members-bulk but this route never existed.
# Add it alongside the existing groups routes.
#
# Also adds POST /groups/has-expenses-bulk which the frontend uses to
# correctly determine isEmpty (whether a group has any expenses at all).
#
# Paste both routes into your existing routers/groups.py


class BulkGroupIdsRequest(BaseModel):
    group_ids: list[int]


@router.post("/members-bulk")
def members_bulk(
    body: BulkGroupIdsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Return members for multiple groups in one DB call.
    Only returns data for groups the user belongs to.
    Returns: { group_id: [member_rows], ... }
    """
    if not body.group_ids:
        return {}

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

    return db.fetch_group_members_bulk(allowed_ids)


@router.post("/has-expenses-bulk")
def has_expenses_bulk(
    body: BulkGroupIdsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a dict of { group_id: bool } indicating whether each group
    has at least one expense. Used by the frontend to distinguish
    'new/empty group' from 'settled group'.
    """
    if not body.group_ids:
        return {}

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

    return db.fetch_groups_has_expenses(allowed_ids)


@router.delete("/{group_id}/members/{user_id}")
def leave_group(group_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    """
    A user can remove themselves (leave). Admins can remove anyone.
    Blocked if the member has a non-zero net balance in the group.
    """
    is_admin = current_user.get("role") == "admin"
    if not is_admin and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot remove another member.")

    if not db.is_group_member(group_id, user_id):
        raise HTTPException(status_code=404, detail="Member not found in group.")

    net = db.fetch_member_net_balance(group_id, user_id)
    if net is None:
        net = 0.0
    if abs(net) > 0.01:   # allow tiny float rounding
        raise HTTPException(
            status_code=400,
            detail=f"Cannot leave: net balance is ₹{net:,.0f}. Settle up first.",
        )

    db.remove_group_member(group_id, user_id)
    return {"message": "Left the group."}