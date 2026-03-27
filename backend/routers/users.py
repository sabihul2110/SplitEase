# --- backend/routers/users.py ---

"""
routers/users.py

GET    /users/          → all users (name + upi_id, for dropdowns)
GET    /users/all       → full user list, admin only
PUT    /users/{user_id} → update name / email / upi_id
DELETE /users/{user_id} → delete user, admin only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import mysql.connector

import db
from auth import get_current_user, require_admin

router = APIRouter()


class UpdateUserRequest(BaseModel):
    name:   str
    email:  EmailStr
    upi_id: str | None = None


@router.get("/")
def list_users(current_user: dict = Depends(get_current_user)):
    """Public (any logged-in user) — returns user_id, name, upi_id for dropdowns."""
    return db.fetch_users()


@router.get("/all")
def list_all_users(current_user: dict = Depends(require_admin)):
    """Admin only — returns full user details."""
    return db.fetch_all_users()


@router.put("/{user_id}")
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    current_user: dict = Depends(get_current_user),
):
    """Users can only edit themselves. Admins can edit anyone."""
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed.")
    try:
        db.update_user(user_id, body.name, body.email, body.upi_id)
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already in use.")
    return {"message": "User updated."}


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: dict = Depends(require_admin)):
    """Admin only."""
    db.delete_user(user_id)
    return {"message": "User deleted."}