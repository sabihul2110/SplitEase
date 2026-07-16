# SplitEase/backend/repositories/recurring_bill_repository.py


import json
from core.database import get_connection


def _hydrate(row: dict) -> dict:
    if row.get("split_config"):
        row["split_config"] = json.loads(row["split_config"]) if isinstance(row["split_config"], str) else row["split_config"]
    return row


def fetch_bills(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Recurring_Bills WHERE user_id = %s ORDER BY bill_id ASC",
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [_hydrate(r) for r in rows]


def fetch_bill(bill_id: int, user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Recurring_Bills WHERE bill_id = %s AND user_id = %s",
        (bill_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return _hydrate(row) if row else None


def fetch_distinct_bill_owners() -> list[int]:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT DISTINCT user_id FROM Recurring_Bills")
    ids = [row[0] for row in cur.fetchall()]
    cur.close(); conn.close()
    return ids


def insert_bill(
    user_id: int, name: str, icon_name: str, group_id: int | None,
    category_id: int, subcategory_id: int | None, cron_day: int,
    split_type: str, split_config: list[dict] | None,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Recurring_Bills
                (user_id, name, icon_name, group_id, category_id, subcategory_id,
                 cron_day, split_type, split_config)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id, name.strip(), icon_name, group_id,
                category_id, subcategory_id, cron_day,
                split_type, json.dumps(split_config) if split_config else None,
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_bill(
    bill_id: int, user_id: int, name: str, icon_name: str, group_id: int | None,
    category_id: int, subcategory_id: int | None, cron_day: int,
    split_type: str, split_config: list[dict] | None,
) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            UPDATE Recurring_Bills
            SET name=%s, icon_name=%s, group_id=%s, category_id=%s, subcategory_id=%s,
                cron_day=%s, split_type=%s, split_config=%s
            WHERE bill_id=%s AND user_id=%s
            """,
            (
                name.strip(), icon_name, group_id, category_id, subcategory_id,
                cron_day, split_type, json.dumps(split_config) if split_config else None,
                bill_id, user_id,
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_bill(bill_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Recurring_Bills WHERE bill_id = %s AND user_id = %s",
            (bill_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()