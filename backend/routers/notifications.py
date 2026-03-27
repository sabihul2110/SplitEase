# --- backend/routers/notifications.py ---

"""
routers/notifications.py

BUG FIX: current_user from JWT only has {user_id, email, role}.
         It does NOT have 'name'. We fetch the sender's name from
         the DB before building the notification message.

GET  /notifications/              → get my notifications (latest 50)
GET  /notifications/unread-count  → lightweight count for bell badge
POST /notifications/read/{id}     → mark one notification as read
POST /notifications/read-all      → mark all as read
POST /groups/{group_id}/remind    → send reminder to a debtor (creditor only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user

router = APIRouter()


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_user_name(user_id: int) -> str:
    """Fetch a user's display name by ID. Returns 'Someone' as fallback."""
    conn = db.get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT name FROM Users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else "Someone"


def create_notification(
    user_id:      int,
    message:      str,
    type:         str = "reminder",
    from_user_id: int | None = None,
    group_id:     int | None = None,
) -> None:
    conn = db.get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO Notifications (user_id, from_user_id, type, message, group_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, from_user_id, type, message, group_id),
        )
        conn.commit()
    finally:
        cur.close(); conn.close()


def get_user_by_name_in_group(name: str, group_id: int) -> dict | None:
    """Find a group member by their display name."""
    conn = db.get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT u.user_id, u.name, u.email
        FROM   Group_Members gm
        JOIN   Users u ON u.user_id = gm.user_id
        WHERE  gm.group_id = %s AND u.name = %s
        """,
        (group_id, name),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/notifications/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)):
    conn = db.get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM Notifications WHERE user_id = %s AND is_read = 0",
        (current_user["user_id"],),
    )
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return {"count": count}


@router.get("/notifications/")
def get_notifications(current_user: dict = Depends(get_current_user)):
    conn = db.get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            n.notification_id, n.type, n.message,
            n.is_read, n.group_id, n.created_at,
            u.name AS from_name
        FROM   Notifications n
        LEFT JOIN Users u ON u.user_id = n.from_user_id
        WHERE  n.user_id = %s
        ORDER  BY n.created_at DESC
        LIMIT  50
        """,
        (current_user["user_id"],),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


@router.post("/notifications/read/{notification_id}")
def mark_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = db.get_connection()
    cur  = conn.cursor()
    cur.execute(
        "UPDATE Notifications SET is_read = 1 WHERE notification_id = %s AND user_id = %s",
        (notification_id, current_user["user_id"]),
    )
    conn.commit()
    cur.close(); conn.close()
    return {"message": "Marked as read."}


@router.post("/notifications/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    conn = db.get_connection()
    cur  = conn.cursor()
    cur.execute(
        "UPDATE Notifications SET is_read = 1 WHERE user_id = %s",
        (current_user["user_id"],),
    )
    conn.commit()
    cur.close(); conn.close()
    return {"message": "All marked as read."}


# ── Send Reminder ──────────────────────────────────────────────────────────────

class ReminderRequest(BaseModel):
    debtor_name: str
    amount:      float


@router.post("/groups/{group_id}/remind", status_code=status.HTTP_201_CREATED)
def send_reminder(
    group_id:     int,
    body:         ReminderRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Creditor sends a reminder to a debtor.
    FIX: sender name is fetched from DB — not from JWT (which doesn't have name).
    """
    sender_id = current_user["user_id"]

    # Must be a group member to send reminders
    if not db.is_group_member(group_id, sender_id):
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    # ✅ FIX: fetch sender name from DB, not from current_user dict
    sender_name = get_user_name(sender_id)

    # Find the debtor in this group
    debtor = get_user_by_name_in_group(body.debtor_name, group_id)
    if not debtor:
        raise HTTPException(status_code=404, detail="Member not found in this group.")

    if debtor["user_id"] == sender_id:
        raise HTTPException(status_code=400, detail="Cannot remind yourself.")

    message = (
        f"{sender_name} sent you a reminder: "
        f"you owe ₹{body.amount:,.0f} in this group."
    )

    create_notification(
        user_id      = debtor["user_id"],
        from_user_id = sender_id,
        type         = "reminder",
        message      = message,
        group_id     = group_id,
    )

    return {"message": f"Reminder sent to {debtor['name']}."}