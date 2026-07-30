# SplitEase/backend/repositories/quick_template_repository.py


import json
import datetime
from core.database import get_connection


def _hydrate(row: dict) -> dict:
    if row.get("split_config"):
        row["split_config"] = json.loads(row["split_config"]) if isinstance(row["split_config"], str) else row["split_config"]
    
    if row.get("default_time") is not None:
        dt = row["default_time"]
        if isinstance(dt, datetime.timedelta):
            secs = int(dt.total_seconds())
            h, rem = divmod(secs, 3600)
            m, s = divmod(rem, 60)
            row["default_time"] = f"{h:02d}:{m:02d}:{s:02d}"
        else:
            row["default_time"] = str(dt)
            
    return row


def fetch_templates(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Quick_Templates WHERE user_id = %s ORDER BY template_id ASC",
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [_hydrate(r) for r in rows]


def fetch_template(template_id: int, user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Quick_Templates WHERE template_id = %s AND user_id = %s",
        (template_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return _hydrate(row) if row else None


def insert_template(
    user_id: int, name: str, icon_name: str, default_amount: float | None,
    default_time: str, group_id: int | None, category_id: int,
    subcategory_id: int | None, split_type: str, split_config: list[dict] | None,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Quick_Templates
                (user_id, name, icon_name, default_amount, default_time, group_id,
                 category_id, subcategory_id, split_type, split_config)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id, name.strip(), icon_name, default_amount, default_time,
                group_id, category_id, subcategory_id,
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


def update_template(
    template_id: int, user_id: int, name: str, icon_name: str,
    default_amount: float | None, default_time: str, group_id: int | None,
    category_id: int, subcategory_id: int | None, split_type: str,
    split_config: list[dict] | None,
) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            UPDATE Quick_Templates
            SET name=%s, icon_name=%s, default_amount=%s, default_time=%s, group_id=%s,
                category_id=%s, subcategory_id=%s, split_type=%s, split_config=%s
            WHERE template_id=%s AND user_id=%s
            """,
            (
                name.strip(), icon_name, default_amount, default_time, group_id,
                category_id, subcategory_id, split_type,
                json.dumps(split_config) if split_config else None,
                template_id, user_id,
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_template(template_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Quick_Templates WHERE template_id = %s AND user_id = %s",
            (template_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()