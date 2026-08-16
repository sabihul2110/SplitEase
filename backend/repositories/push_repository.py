# SplitEase/backend/repositories/push_repository.py


from core.database import get_connection


def save_push_token(user_id: int, token: str) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        # Strip this token off any OTHER account first. Without this, if
        # User A logged in on this device earlier, A's row still holds this
        # same token — and both A and B end up "owning" it, so a push meant
        # for A actually lands on this device while User B is logged in.
        cur.execute(
            "UPDATE Users SET expo_push_token = NULL "
            "WHERE expo_push_token = %s AND user_id != %s",
            (token, user_id),
        )
        cur.execute(
            "UPDATE Users SET expo_push_token = %s WHERE user_id = %s",
            (token, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def get_push_token(user_id: int) -> str | None:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT expo_push_token FROM Users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row and row[0] else None


def clear_push_token(user_id: int) -> None:
    """Called on logout. Prevents a stale token from a previous session on
    this device being used to notify the wrong account after the user
    switches accounts (log out / log in as someone else on the same phone)."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Users SET expo_push_token = NULL WHERE user_id = %s AND expo_push_token IS NOT NULL",
            (user_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def clear_push_token_by_value(token: str) -> None:
    """Belt-and-suspenders: also wipes this exact token off ANY other user
    row it might be sitting on (e.g. leftover from a prior account on this
    same device that never called logout cleanly)."""
    if not token:
        return
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Users SET expo_push_token = NULL WHERE expo_push_token = %s",
            (token,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def search_users(query: str, exclude_user_id: int) -> list[dict]:
    """Search users by name or email. Returns public fields only."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    q    = f"%{query.strip()}%"
    cur.execute(
        """
        SELECT user_id, name, email, upi_id
        FROM   Users
        WHERE  (name LIKE %s OR email LIKE %s)
          AND  user_id != %s
        ORDER  BY name
        LIMIT  10
        """,
        (q, q, exclude_user_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows