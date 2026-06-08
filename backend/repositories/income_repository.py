# backend/repositories/income_repository.py
from core.config import VALID_SOURCE_TYPES
from core.database import get_connection


def fetch_income(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT income_id, amount, source_type, note, income_date, created_at
        FROM   Income
        WHERE  user_id = %s
        ORDER  BY income_date DESC, income_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r.get("income_date"):
            r["income_date"] = str(r["income_date"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


def insert_income(
    user_id: int,
    amount: float,
    source_type: str,
    note: str | None,
    income_date: str,
) -> int:
    if source_type not in VALID_SOURCE_TYPES:
        raise ValueError(f"source_type must be one of {VALID_SOURCE_TYPES}")
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Income (user_id, amount, source_type, note, income_date)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, round(float(amount), 2), source_type, note or None, income_date),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_income(income_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Income WHERE income_id = %s AND user_id = %s",
            (income_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()