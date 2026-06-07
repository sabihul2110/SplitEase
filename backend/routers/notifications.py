# --- backend/routers/notifications.py ---
"""
routers/notifications.py

GET  /notifications/              → get my notifications (latest 50)
GET  /notifications/unread-count  → lightweight count for bell badge
POST /notifications/read/{id}     → mark one notification as read
POST /notifications/read-all      → mark all as read
POST /groups/{group_id}/remind    → send reminder to a debtor (creditor only)

FIX #13: get_user_by_name_in_group replaced with get_user_by_id_in_group.
          The remind endpoint now accepts debtor_user_id (integer) instead of
          debtor_name (string). Matching by name is unreliable when two group
          members share a display name — the wrong person could receive the
          reminder. The frontend (Groups.jsx) already has each member's
          user_id from the settlements result and passes it in.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

import db
from repositories import notification_repository
from auth import get_current_user

router = APIRouter()


# ── DB helpers ────────────────────────────────────────────────────────────────
# All local DB helpers have been moved to repositories/notification_repository.py

# def get_user_name(user_id: int) -> str:
#     """Fetch a user's display name by ID. Returns 'Someone' as fallback."""
#     conn = db.get_connection()
#     cur  = conn.cursor()
#     cur.execute("SELECT name FROM Users WHERE user_id = %s", (user_id,))
#     row = cur.fetchone()
#     cur.close(); conn.close()
#     return row[0] if row else "Someone"

# def get_group_name(group_id: int) -> str:
#     conn = db.get_connection()
#     cur  = conn.cursor()
#     cur.execute("SELECT group_name FROM `Groups` WHERE group_id = %s", (group_id,))
#     row = cur.fetchone()
#     cur.close(); conn.close()
#     return row[0] if row else "your group"

# def create_notification(
#     user_id:           int,
#     message:           str,
#     notification_type: str = "reminder",
#     from_user_id:      int | None = None,
#     group_id:          int | None = None,
# ) -> None:
#     conn = db.get_connection()
#     cur  = conn.cursor()
#     try:
#         cur.execute(
#             """
#             INSERT INTO Notifications (user_id, from_user_id, type, message, group_id)
#             VALUES (%s, %s, %s, %s, %s)
#             """,
#             (user_id, from_user_id, notification_type, message, group_id),
#         )
#         conn.commit()
#     finally:
#         cur.close(); conn.close()


# def get_user_by_id_in_group(user_id: int, group_id: int) -> dict | None:
#     """
#     FIX #13: Look up a group member by user_id (not name).
#     Returns the member row or None if the user isn't in this group.
#     This is unambiguous even when two members share the same display name.
#     """
#     conn = db.get_connection()
#     cur  = conn.cursor(dictionary=True)
#     cur.execute(
#         """
#         SELECT u.user_id, u.name, u.email
#         FROM   Group_Members gm
#         JOIN   Users u ON u.user_id = gm.user_id
#         WHERE  gm.group_id = %s AND gm.user_id = %s
#         """,
#         (group_id, user_id),
#     )
#     row = cur.fetchone()
#     cur.close(); conn.close()
#     return row


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/notifications/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)):
    count = notification_repository.get_unread_count(current_user["user_id"])
    return {"count": count}


@router.get("/notifications/")
def get_notifications(
    limit:  int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0,  ge=0),
    current_user: dict = Depends(get_current_user),
):
    return notification_repository.fetch_notifications(current_user["user_id"], limit, offset)


@router.post("/notifications/read/{notification_id}")
def mark_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    notification_repository.mark_notification_read(notification_id, current_user["user_id"])
    return {"message": "Marked as read."}


@router.post("/notifications/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    notification_repository.mark_all_read(current_user["user_id"])
    return {"message": "All marked as read."}


@router.delete("/notifications/read")
def delete_read_notifications(current_user: dict = Depends(get_current_user)):
    """Bulk delete all read notifications for the current user."""
    count = notification_repository.delete_read_notifications(current_user["user_id"])
    return {"message": f"Deleted {count} read notifications."}


@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a single notification."""
    notification_repository.delete_notification(notification_id, current_user["user_id"])
    return {"message": "Notification deleted."}


# ── Send Reminder ─────────────────────────────────────────────────────────────

class ReminderRequest(BaseModel):
    debtor_user_id: int    # FIX #13: was debtor_name (string) — now integer ID
    amount:         float


@router.post("/groups/{group_id}/remind", status_code=status.HTTP_201_CREATED)
def send_reminder(
    group_id:     int,
    body:         ReminderRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Creditor sends a payment reminder to a debtor.

    FIX #13: debtor is now identified by user_id, not display name.
    get_user_by_id_in_group() verifies the debtor is actually a member
    of this group before sending — prevents reminders being sent to
    arbitrary user IDs outside the group.
    """
    sender_id = current_user["user_id"]

    if not db.is_group_member(group_id, sender_id):
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    if body.debtor_user_id == sender_id:
        raise HTTPException(status_code=400, detail="Cannot send a reminder to yourself.")

    # Fetch sender name from DB (JWT has no name field)
    sender_name = notification_repository.get_user_name(sender_id)

    # FIX #13: look up debtor by user_id, not name
    debtor = notification_repository.get_user_by_id_in_group(body.debtor_user_id, group_id)
    if not debtor:
        raise HTTPException(status_code=404, detail="Member not found in this group.")

    group_name = notification_repository.get_group_name(group_id)
    message = (
        f"{sender_name} sent you a reminder: "
        f"you owe ₹{body.amount:,.0f} in '{group_name}'."
    )

    notification_repository.create_notification(
        user_id           = debtor["user_id"],
        from_user_id      = sender_id,
        notification_type = "reminder",
        message           = message,
        group_id          = group_id,
    )

    return {"message": f"Reminder sent to {debtor['name']}."}