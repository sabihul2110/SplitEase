# SplitEase/backend/repositories/pending_bill_repository.py


from datetime import date
from core.database import get_connection


def fetch_pending_bills(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT pb.pending_id, pb.bill_id, pb.status, pb.generated_for_month,
               pb.created_at, pb.paid_at,
               rb.name, rb.icon_name, rb.group_id, rb.category_id, rb.subcategory_id
        FROM   Pending_Bills pb
        JOIN   Recurring_Bills rb ON rb.bill_id = pb.bill_id
        WHERE  pb.user_id = %s AND pb.status = 'pending'
        ORDER  BY pb.generated_for_month DESC, pb.pending_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["generated_for_month"] = str(r["generated_for_month"])
        r["created_at"] = str(r["created_at"])
        r["paid_at"] = str(r["paid_at"]) if r["paid_at"] else None
    return rows


def fetch_pending_bill(pending_id: int, user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Pending_Bills WHERE pending_id = %s AND user_id = %s",
        (pending_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def exists_for_month(bill_id: int, generated_for_month: date) -> bool:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT 1 FROM Pending_Bills WHERE bill_id = %s AND generated_for_month = %s",
        (bill_id, generated_for_month),
    )
    found = cur.fetchone() is not None
    cur.close(); conn.close()
    return found


def insert_pending_bill(bill_id: int, user_id: int, generated_for_month: date) -> int | None:
    """
    Idempotent via uq_pb_bill_month. If a concurrent sweep already inserted
    this month's row, swallow the duplicate-key error and return None.
    """
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Pending_Bills (bill_id, user_id, status, generated_for_month)
            VALUES (%s, %s, 'pending', %s)
            """,
            (bill_id, user_id, generated_for_month),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception as exc:
        conn.rollback()
        if "Duplicate entry" in str(exc):
            return None
        raise
    finally:
        cur.close(); conn.close()


def mark_paid(pending_id: int, resulting_expense_id: int | None, resulting_personal_expense_id: int | None) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            UPDATE Pending_Bills
            SET status = 'paid', paid_at = NOW(),
                resulting_expense_id = %s,
                resulting_personal_expense_id = %s
            WHERE pending_id = %s
            """,
            (resulting_expense_id, resulting_personal_expense_id, pending_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def dismiss_pending_bill(pending_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Pending_Bills SET status = 'dismissed' WHERE pending_id = %s AND user_id = %s",
            (pending_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_reminder_candidates() -> list[dict]:
    """
    All still-pending bills, joined with their Recurring_Bills.cron_day
    (to compute the due date) and the owner's push token. Excludes bills
    already paid or dismissed — those stop appearing here automatically
    since the WHERE is on Pending_Bills.status = 'pending'.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT pb.pending_id, pb.user_id, pb.generated_for_month, pb.last_reminded_date,
               rb.name, rb.cron_day,
               u.expo_push_token
        FROM   Pending_Bills pb
        JOIN   Recurring_Bills rb ON rb.bill_id = pb.bill_id
        JOIN   Users u            ON u.user_id  = pb.user_id
        WHERE  pb.status = 'pending'
        """
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["generated_for_month"] = str(r["generated_for_month"])
        r["last_reminded_date"]  = str(r["last_reminded_date"]) if r["last_reminded_date"] else None
    return rows


def mark_reminded(pending_id: int, today: date) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Pending_Bills SET last_reminded_date = %s WHERE pending_id = %s",
            (today, pending_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()