# SplitEase/backend/repositories/routine_repository.py


from core.database import get_connection


def fetch_routines(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Routines WHERE user_id = %s ORDER BY routine_id ASC",
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_routine_detail(routine_id: int, user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM Routines WHERE routine_id = %s AND user_id = %s",
        (routine_id, user_id),
    )
    routine = cur.fetchone()
    if routine is None:
        cur.close(); conn.close()
        return None
    cur.execute(
        """
        SELECT ri.item_id, ri.template_id, ri.sort_order, ri.default_included,
               qt.name, qt.icon_name, qt.default_amount, qt.default_time,
               qt.group_id, qt.category_id, qt.subcategory_id,
               qt.split_type, qt.split_config
        FROM   Routine_Items ri
        JOIN   Quick_Templates qt ON qt.template_id = ri.template_id
        WHERE  ri.routine_id = %s
        ORDER  BY ri.sort_order ASC
        """,
        (routine_id,),
    )
    routine["items"] = cur.fetchall()
    cur.close(); conn.close()
    return routine


def insert_routine(user_id: int, name: str, icon_name: str, active_days: str, items: list[dict]) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Routines (user_id, name, icon_name, active_days) VALUES (%s, %s, %s, %s)",
            (user_id, name.strip(), icon_name, active_days),
        )
        routine_id = cur.lastrowid
        cur.executemany(
            "INSERT INTO Routine_Items (routine_id, template_id, sort_order, default_included) VALUES (%s, %s, %s, %s)",
            [(routine_id, i["template_id"], i["sort_order"], i["default_included"]) for i in items],
        )
        conn.commit()
        return routine_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_routine(routine_id: int, user_id: int, name: str, icon_name: str, active_days: str, items: list[dict]) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Routines SET name=%s, icon_name=%s, active_days=%s WHERE routine_id=%s AND user_id=%s",
            (name.strip(), icon_name, active_days, routine_id, user_id),
        )
        cur.execute("DELETE FROM Routine_Items WHERE routine_id = %s", (routine_id,))
        cur.executemany(
            "INSERT INTO Routine_Items (routine_id, template_id, sort_order, default_included) VALUES (%s, %s, %s, %s)",
            [(routine_id, i["template_id"], i["sort_order"], i["default_included"]) for i in items],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_routine(routine_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Routines WHERE routine_id = %s AND user_id = %s", (routine_id, user_id))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()