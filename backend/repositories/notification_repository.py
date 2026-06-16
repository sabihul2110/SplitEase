# backend/repositories/notification_repository.py
from core.database import get_connection, get_db


def get_unread_count(user_id: int) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM Notifications WHERE user_id = %s AND is_read = 0",
        (user_id,),
    )
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count


def fetch_notifications(user_id: int, limit: int, offset: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT n.notification_id, n.type, n.message, n.is_read,
               n.group_id, n.created_at,
               u.name AS from_name, g.group_name
        FROM   Notifications n
        LEFT JOIN Users u ON u.user_id = n.from_user_id
        LEFT JOIN `Groups` g ON g.group_id = n.group_id
        WHERE  n.user_id = %s
        ORDER  BY n.created_at DESC
        LIMIT  %s OFFSET %s
        """,
        (user_id, limit, offset),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r.get("created_at"):
            ts = r["created_at"]
            r["created_at"] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
    return rows


def mark_notification_read(notification_id: int, user_id: int) -> None:
    with get_db() as (conn, cur):
        cur.execute(
            "UPDATE Notifications SET is_read = 1 WHERE notification_id = %s AND user_id = %s",
            (notification_id, user_id),
        )
        conn.commit()


def mark_all_read(user_id: int) -> None:
    with get_db() as (conn, cur):
        cur.execute(
            "UPDATE Notifications SET is_read = 1 WHERE user_id = %s",
            (user_id,),
        )
        conn.commit()


def delete_read_notifications(user_id: int) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "DELETE FROM Notifications WHERE user_id = %s AND is_read = 1",
        (user_id,),
    )
    count = cur.rowcount
    conn.commit()
    cur.close(); conn.close()
    return count


def delete_notification(notification_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "DELETE FROM Notifications WHERE notification_id = %s AND user_id = %s",
        (notification_id, user_id),
    )
    conn.commit()
    cur.close(); conn.close()


def create_notification(
    user_id: int,
    message: str,
    notification_type: str = "reminder",
    from_user_id: int | None = None,
    group_id: int | None = None,
) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO Notifications (user_id, from_user_id, type, message, group_id) VALUES (%s, %s, %s, %s, %s)",
            (user_id, from_user_id, notification_type, message, group_id),
        )
        conn.commit()
    finally:
        cur.close(); conn.close()


def get_user_name(user_id: int) -> str:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT name FROM Users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else "Someone"


def get_group_name(group_id: int) -> str:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT group_name FROM `Groups` WHERE group_id = %s", (group_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else "your group"


def create_ledger_outcome_notification(
    recipient_id: int,
    sender_id:    int,
    message:      str,
) -> None:
    """Write an entry_outcome notification to the main Notifications table.
    This is what User 1 (the creator) sees in their bell after User 2
    accepts or rejects their ledger entry request.
    """
    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO Notifications
                (user_id, from_user_id, type, message, group_id)
            VALUES (%s, %s, 'entry_outcome', %s, NULL)
            """,
            (recipient_id, sender_id, message),
        )
        conn.commit()
    finally:
        cur.close(); conn.close()


def get_user_by_id_in_group(user_id: int, group_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT u.user_id, u.name, u.email
        FROM   Group_Members gm
        JOIN   Users u ON u.user_id = gm.user_id
        WHERE  gm.group_id = %s AND gm.user_id = %s
        """,
        (group_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row