# SplitEase/backend/repositories/push_repository.py


from core.database import get_connection


def save_push_token(user_id: int, token: str) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
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