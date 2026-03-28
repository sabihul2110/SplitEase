# --- backend/routers/users.py ---
"""
routers/users.py

GET    /users/          → all users (name + upi_id, for dropdowns)
GET    /users/all       → full user list, admin only
PUT    /users/me        → update own name / email / upi_id       ← NEW
PUT    /users/{user_id} → update any user (admin or self)
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


# ── NEW: self-update endpoint ──────────────────────────────────────────────
@router.put("/me")
def update_me(
    body:         UpdateUserRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Authenticated user updates their own profile.
    Returns fresh user data so the frontend can update AuthContext immediately.
    """
    user_id = current_user["user_id"]

    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    try:
        db.update_user(user_id, body.name.strip(), body.email.strip().lower(), body.upi_id or None)
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="That email is already in use by another account.")

    # Return fresh row so frontend can sync AuthContext
    conn = db.get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, upi_id, role FROM Users WHERE user_id = %s",
        (user_id,),
    )
    user = cur.fetchone()
    cur.close(); conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


# ── Existing routes (unchanged) ────────────────────────────────────────────

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
    body:    UpdateUserRequest,
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