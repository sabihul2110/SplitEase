# --- backend/routers/users.py ---

"""
routers/users.py

GET    /users/          → all users (name + upi_id, for dropdowns)
GET    /users/all       → full user list, admin only
PUT    /users/me        → update own name / email / upi_id
PUT    /users/{user_id} → update any user (admin or self)
DELETE /users/{user_id} → delete user, admin only

FIX S5: DELETE now prevents an admin from deleting themselves if they are
        the last admin in the system. Orphaning all admin access is blocked.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from schemas.users import UpdateUserRequest
import mysql.connector

from repositories import user_repository, notification_repository
from core.database import get_connection, get_db
from core.dependencies import get_current_user, require_admin

router = APIRouter()


# class UpdateUserRequest(BaseModel):
#     name:   str
#     email:  EmailStr
#     upi_id: str | None = None


# ── Self-update ────────────────────────────────────────────────────────────
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
        user_repository.update_user(user_id, body.name.strip(), body.email.strip().lower(), body.upi_id or None)
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="That email is already in use by another account.")

    with get_db() as (conn, cur):
        cur.execute(
            "SELECT user_id, name, email, upi_id, role FROM Users WHERE user_id = %s",
            (user_id,),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


# ── List routes ────────────────────────────────────────────────────────────
@router.get("/")
def list_users(current_user: dict = Depends(get_current_user)):
    """Public (any logged-in user) — returns user_id, name, upi_id for dropdowns."""
    return user_repository.fetch_users()


@router.get("/all")
def list_all_users(current_user: dict = Depends(require_admin)):
    """Admin only — returns full user details."""
    return user_repository.fetch_all_users()


# ── Update ─────────────────────────────────────────────────────────────────
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
        user_repository.update_user(user_id, body.name, body.email, body.upi_id)
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already in use.")
    return {"message": "User updated."}


# ── Delete ─────────────────────────────────────────────────────────────────
@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: dict = Depends(require_admin)):
    """
    Admin only.

    FIX S5: Block deletion if the target is the last admin in the system.
    This prevents the admin panel becoming permanently inaccessible.

    Rules:
      - Admins cannot delete themselves at all (use account management for that).
      - If the target user is an admin and is the only admin, block deletion.
    """
    # Prevent self-deletion — avoids accidental lockout
    if current_user["user_id"] == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account. Ask another admin or use account settings.",
        )

    # If the target is an admin, ensure at least one admin will remain
    target = user_repository.fetch_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.get("role") == "admin":
        admin_count = user_repository.count_admins()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last admin account. Promote another user first.",
            )

    user_repository.delete_user(user_id)
    return {"message": "User deleted."}



def _notify_write_offs(sender_id: int, sender_name: str, targets: list[dict], background_tasks: BackgroundTasks):
    """Tells each affected counterparty their ledger balance with this user
    was just resolved by an account reset — otherwise the balance silently
    changing to ₹0 in their People screen would have no explanation."""
    from repositories import ledger_notification_repository, push_repository
    from services.push_service import send_push
    from core.push_channels import CHANNEL_LEDGER

    for t in targets:
        msg = (
            f"{sender_name} reset their account. Your ₹{t['net_amount']:,.0f} balance "
            f"with them has been {'written off' if t['they_were_owed'] else 'cleared'} — "
            f"it no longer needs to be settled."
        )
        notification_repository.create_notification(
            user_id       = t["linked_user_id"],
            from_user_id  = sender_id,
            notification_type = "entry_outcome",
            message       = msg,
        )
        ledger_notification_repository.create_ledger_notif(
            recipient_id = t["linked_user_id"],
            sender_id    = sender_id,
            notif_type   = "entry_deleted",
            message      = msg,
        )
        token = push_repository.get_push_token(t["linked_user_id"])
        background_tasks.add_task(send_push, token, "Ledger Balance Cleared", msg, {}, channel_id=CHANNEL_LEDGER)


@router.post("/reset-my-data")
def reset_my_data(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    pending = user_repository.get_user_pending_settlements(user_id)
    if pending:
        has_debts = any(float(p["net_balance"]) < -0.005 for p in pending)
        return {
            "status": "pending_settlements",
            "message": (
                "You owe money to someone. Settle up before resetting."
                if has_debts else
                "People owe you money. Resetting will forgive these amounts."
            ),
            "pending": pending,
            "has_debts": has_debts,
        }
    summary, write_off_targets = user_repository.reset_user_data(user_id)
    if write_off_targets:
        sender_name = notification_repository.get_user_name(user_id)
        _notify_write_offs(user_id, sender_name, write_off_targets, background_tasks)
    return {"status": "ok", "deleted": summary}


@router.post("/reset-my-data/force")
def reset_my_data_force(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Reset even with pending settlements — but ONLY the creditor case.
    Owing money is a hard, non-bypassable block: "force" exists to skip
    past the *warning* shown when the user is owed money, not to skip
    past a genuine debt. Re-validates server-side rather than trusting
    the client already showed the right confirmation dialog — the plain
    /reset-my-data endpoint above never actually blocks with an HTTP
    error, it just returns info, so without this check here, calling
    /force directly (bypassing the UI entirely) let a user with real
    debts wipe their account with zero enforcement.
    """
    user_id = current_user["user_id"]
    pending = user_repository.get_user_pending_settlements(user_id)
    has_debts = any(float(p["net_balance"]) < -0.005 for p in pending)
    if has_debts:
        raise HTTPException(
            status_code=400,
            detail="You owe money to someone — this cannot be forced. Settle up first.",
        )
    summary, write_off_targets = user_repository.reset_user_data(user_id)
    if write_off_targets:
        sender_name = notification_repository.get_user_name(user_id)
        _notify_write_offs(user_id, sender_name, write_off_targets, background_tasks)
    return {"status": "ok", "deleted": summary}


@router.post("/admin-wipe")
def admin_wipe(current_user: dict = Depends(require_admin)):
    result = user_repository.admin_wipe_app(current_user["user_id"])
    return result


@router.post("/repair-my-people")
def repair_my_people(current_user: dict = Depends(get_current_user)):
    """One-time self-service repair for duplicate People rows from the pre-fix bug."""
    from repositories import people_repository
    result = people_repository.repair_duplicate_people_for_user(current_user["user_id"])
    return result


from repositories import push_repository as _push_repo

@router.get("/search")
def search_users(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    return _push_repo.search_users(q.strip(), current_user["user_id"])


@router.post("/push-token")
def save_push_token(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    token = body.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=422, detail="Token is required.")
    _push_repo.save_push_token(current_user["user_id"], token)
    return {"message": "Push token saved."}