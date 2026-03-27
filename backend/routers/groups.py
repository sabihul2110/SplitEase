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


@router.delete("/{group_id}")
def delete_group(group_id: int, current_user: dict = Depends(require_admin)):
    db.delete_group(group_id)
    return {"message": "Group deleted."}