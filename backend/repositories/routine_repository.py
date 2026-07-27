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

def fetch_run_dates(routine_id: int, since_date) -> set:
    """All Routine_Runs dates for this routine on/after since_date, as ISO strings."""
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT run_date FROM Routine_Runs WHERE routine_id = %s AND run_date >= %s",
        (routine_id, since_date),
    )
    dates = {str(row[0]) for row in cur.fetchall()}
    cur.close(); conn.close()
    return dates


def fetch_skipped_dates(routine_id: int, since_date) -> set:
    """All Routine_Skips dates for this routine on/after since_date, as ISO strings."""
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT skip_date FROM Routine_Skips WHERE routine_id = %s AND skip_date >= %s",
        (routine_id, since_date),
    )
    dates = {str(row[0]) for row in cur.fetchall()}
    cur.close(); conn.close()
    return dates


def insert_skip(routine_id: int, skip_date) -> bool:
    """Idempotent via uq_rskip_routine_date. Returns False if already skipped."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Routine_Skips (routine_id, skip_date) VALUES (%s, %s)",
            (routine_id, skip_date),
        )
        conn.commit()
        return True
    except Exception as exc:
        conn.rollback()
        if "Duplicate entry" in str(exc):
            return False
        raise
    finally:
        cur.close(); conn.close()


def delete_skip(routine_id: int, skip_date) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Routine_Skips WHERE routine_id = %s AND skip_date = %s",
            (routine_id, skip_date),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_reminder_candidates() -> list[dict]:
    """
    All routines whose owner has a push token. active_days / last_reminded_date
    live directly on Routines — no join needed for those. Whether "already ran
    today" is checked separately per-row against Routine_Runs in the service,
    since that's a per-date lookup, not a static join.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT r.routine_id, r.user_id, r.name, r.active_days, r.last_reminded_date,
               u.expo_push_token
        FROM   Routines r
        JOIN   Users u ON u.user_id = r.user_id
        WHERE  u.expo_push_token IS NOT NULL
        """
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["last_reminded_date"] = str(r["last_reminded_date"]) if r["last_reminded_date"] else None
    return rows


def has_run_on_date(routine_id: int, run_date) -> bool:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT 1 FROM Routine_Runs WHERE routine_id = %s AND run_date = %s",
        (routine_id, run_date),
    )
    found = cur.fetchone() is not None
    cur.close(); conn.close()
    return found


def log_routine_run(routine_id: int, user_id: int, run_date) -> None:
    """Idempotent via uq_rr_routine_date — re-running a routine same day is a no-op insert."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Routine_Runs (routine_id, user_id, run_date) VALUES (%s, %s, %s)",
            (routine_id, user_id, run_date),
        )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        if "Duplicate entry" not in str(exc):
            raise
    finally:
        cur.close(); conn.close()


def mark_reminded(routine_id: int, today) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Routines SET last_reminded_date = %s WHERE routine_id = %s",
            (today, routine_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


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