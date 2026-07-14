# SplitEase/backend/repositories/ledger_notification_repository.py


from core.database import get_connection


def create_ledger_notif(
    recipient_id: int,
    sender_id:    int,
    notif_type:   str,
    message:      str,
    entry_id:     int | None = None,
) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Ledger_Notifications
                (entry_id, recipient_id, sender_id, type, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (entry_id, recipient_id, sender_id, notif_type, message),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_ledger_notifs(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT  ln.notif_id, ln.entry_id, ln.type, ln.message,
                ln.is_read, ln.created_at,
                u.name  AS sender_name,
                le.direction, le.amount,
                p.display_name AS person_name
        FROM    Ledger_Notifications ln
        JOIN    Users u  ON u.user_id  = ln.sender_id
        LEFT JOIN Ledger_Entries le ON le.entry_id = ln.entry_id
        LEFT JOIN People p          ON p.person_id = le.person_id
        WHERE   ln.recipient_id = %s
        ORDER   BY ln.created_at DESC
        LIMIT   50
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else None
        r["amount"]     = float(r["amount"]) if r.get("amount") else None
    return rows


def get_unread_count(user_id: int) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM Ledger_Notifications WHERE recipient_id = %s AND is_read = 0",
        (user_id,),
    )
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count


# Categorizes unread notifications the same way PendingRequestsScreen's
# Entries / Confirmations sub-tabs do, so each level of the badge cascade
# (Loans tab -> People button -> Requests button -> sub-tab) can show a dot
# for exactly what's unread beneath it, not just "something happened".
_CATEGORY_TYPES = {
    "entries":       ["entry_request"],
    "confirmations": ["repayment_request", "settlement_request"],
}


def get_unread_counts_by_category(user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        SELECT
            SUM(CASE WHEN type = 'entry_request' THEN 1 ELSE 0 END) AS entries,
            SUM(CASE WHEN type IN ('repayment_request','settlement_request') THEN 1 ELSE 0 END) AS confirmations
        FROM Ledger_Notifications
        WHERE recipient_id = %s AND is_read = 0
        """,
        (user_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    entries       = int(row[0] or 0)
    confirmations = int(row[1] or 0)
    # `count` kept for backward compatibility with existing badge callers
    # that only read res.data.count.
    return {"entries": entries, "confirmations": confirmations, "count": entries + confirmations}


def mark_category_read(user_id: int, category: str) -> None:
    """
    Marks only one category's notifications as read — e.g. opening the
    Entries sub-tab shouldn't silently clear an unread Confirmation the
    person hasn't actually looked at yet.
    """
    types = _CATEGORY_TYPES.get(category)
    if not types:
        return
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        placeholders = ",".join(["%s"] * len(types))
        cur.execute(
            f"UPDATE Ledger_Notifications SET is_read = 1 "
            f"WHERE recipient_id = %s AND is_read = 0 AND type IN ({placeholders})",
            (user_id, *types),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def mark_read(notif_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Ledger_Notifications SET is_read = 1 WHERE notif_id = %s AND recipient_id = %s",
            (notif_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def mark_all_read(user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Ledger_Notifications SET is_read = 1 WHERE recipient_id = %s",
            (user_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()