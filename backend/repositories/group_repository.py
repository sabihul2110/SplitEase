# backend/repositories/group_repository.py
from core.database import get_connection


def fetch_groups(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT g.group_id, g.group_name, g.created_at
        FROM   `Groups` g
        JOIN   Group_Members gm ON gm.group_id = g.group_id
        WHERE  gm.user_id = %s
        ORDER  BY g.group_id ASC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_all_groups() -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT g.group_id, g.group_name, g.created_at,
               COUNT(gm.user_id) AS member_count
        FROM `Groups` g
        LEFT JOIN Group_Members gm ON gm.group_id = g.group_id
        GROUP BY g.group_id, g.group_name, g.created_at
        ORDER BY g.group_id ASC
        """
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_group_members(group_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT u.user_id, u.name, u.upi_id
        FROM   Group_Members gm
        JOIN   Users u ON u.user_id = gm.user_id
        WHERE  gm.group_id = %s
        ORDER  BY u.user_id ASC
        """,
        (group_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_group_members_bulk(group_ids: list[int]) -> dict[int, list[dict]]:
    if not group_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT gm.group_id, u.user_id, u.name, u.upi_id
        FROM   Group_Members gm
        JOIN   Users u ON u.user_id = gm.user_id
        WHERE  gm.group_id IN ({placeholders})
        ORDER  BY gm.group_id, u.user_id ASC
        """,
        group_ids,
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    result: dict[int, list[dict]] = {gid: [] for gid in group_ids}
    for r in rows:
        gid = r.pop("group_id")
        result[gid].append(r)
    return result


def fetch_groups_has_expenses(group_ids: list[int]) -> dict[int, bool]:
    if not group_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        f"SELECT DISTINCT group_id FROM Expenses WHERE group_id IN ({placeholders})",
        group_ids,
    )
    has = {row[0] for row in cur.fetchall()}
    cur.close(); conn.close()
    return {gid: (gid in has) for gid in group_ids}


def insert_group(group_name: str, user_ids: list[int], created_by: int) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO `Groups` (group_name, created_by) VALUES (%s, %s)",
            (group_name.strip(), created_by),
        )
        group_id = cur.lastrowid
        for uid in user_ids:
            cur.execute(
                "INSERT INTO Group_Members (group_id, user_id) VALUES (%s, %s)",
                (group_id, uid),
            )
        conn.commit()
        return group_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_group(group_id: int, group_name: str) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE `Groups` SET group_name = %s WHERE group_id = %s",
            (group_name.strip(), group_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_group_members(group_id: int, user_ids: list[int]) -> None:
    """
    Diff-based member update — never deletes members who have expenses or payments
    in the group. Only adds new members and removes members with zero financial
    history in the group.
    """
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()

        # Current members
        cur.execute(
            "SELECT user_id FROM Group_Members WHERE group_id = %s",
            (group_id,),
        )
        current_ids = {row[0] for row in cur.fetchall()}
        new_ids     = set(user_ids)

        # Add new members
        to_add = new_ids - current_ids
        for uid in to_add:
            cur.execute(
                "INSERT INTO Group_Members (group_id, user_id) VALUES (%s, %s)",
                (group_id, uid),
            )

        # Remove only members with no financial history in this group
        to_remove = current_ids - new_ids
        for uid in to_remove:
            cur.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT expense_id FROM Expenses
                    WHERE group_id = %s AND payer_id = %s
                    UNION ALL
                    SELECT es.expense_id FROM Expense_Splits es
                    JOIN Expenses e ON e.expense_id = es.expense_id
                    WHERE e.group_id = %s AND es.user_id = %s
                    UNION ALL
                    SELECT payment_id FROM Payments
                    WHERE group_id = %s AND (payer_id = %s OR payee_id = %s)
                ) AS history
                """,
                (group_id, uid, group_id, uid, group_id, uid, uid),
            )
            count = cur.fetchone()[0]
            if count == 0:
                cur.execute(
                    "DELETE FROM Group_Members WHERE group_id = %s AND user_id = %s",
                    (group_id, uid),
                )
            # If count > 0: silently keep them — they have history, can't remove safely

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_group(group_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM `Groups` WHERE group_id = %s", (group_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def is_group_member(group_id: int, user_id: int) -> bool:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT 1 FROM Group_Members WHERE group_id = %s AND user_id = %s",
        (group_id, user_id),
    )
    found = cur.fetchone() is not None
    cur.close(); conn.close()
    return found


def is_member_of_any(group_ids: list[int], user_id: int) -> set[int]:
    """Return set of group_ids the user actually belongs to. Single query."""
    if not group_ids:
        return set()
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        f"SELECT group_id FROM Group_Members WHERE user_id = %s AND group_id IN ({placeholders})",
        [user_id] + group_ids,
    )
    result = {row[0] for row in cur.fetchall()}
    cur.close(); conn.close()
    return result


def fetch_group_creator(group_id: int) -> int | None:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT created_by FROM `Groups` WHERE group_id = %s",
        (group_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


def fetch_member_net_balance(group_id: int, user_id: int) -> float:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        SELECT
            IFNULL(paid.total_paid,        0)
          - IFNULL(owed.total_owed,        0)
          + IFNULL(psent.payments_sent,    0)
          - IFNULL(prec.payments_received, 0)
        FROM (SELECT 1) dummy
        LEFT JOIN (SELECT SUM(total_amount) AS total_paid   FROM Expenses WHERE group_id=%s AND payer_id=%s) paid  ON 1=1
        LEFT JOIN (SELECT SUM(es.amount_owed) AS total_owed FROM Expense_Splits es JOIN Expenses e ON e.expense_id=es.expense_id WHERE e.group_id=%s AND es.user_id=%s) owed ON 1=1
        LEFT JOIN (SELECT SUM(amount) AS payments_sent      FROM Payments WHERE group_id=%s AND payer_id=%s) psent ON 1=1
        LEFT JOIN (SELECT SUM(amount) AS payments_received  FROM Payments WHERE group_id=%s AND payee_id=%s) prec  ON 1=1
        """,
        (group_id, user_id, group_id, user_id, group_id, user_id, group_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return float(row[0]) if row and row[0] is not None else 0.0


def remove_group_member(group_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Group_Members WHERE group_id=%s AND user_id=%s",
            (group_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def admin_wipe_groups() -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Notifications WHERE group_id IS NOT NULL")
        cur.execute("DELETE FROM Invites")
        cur.execute("DELETE FROM Payment_Allocations")
        cur.execute("DELETE FROM Payments")
        cur.execute("DELETE FROM Expense_Splits")
        cur.execute("DELETE FROM Expenses")
        cur.execute("DELETE FROM Group_Members")
        cur.execute("DELETE FROM `Groups`")
        conn.commit()

        # DDL auto-commits — run after the DML transaction is committed.
        # Only include tables that actually have a surrogate AUTO_INCREMENT PK.
        # Junction tables like Group_Members (composite PK) will error if included — skip them.
        for table in ["`Groups`", "Expenses", "Payments", "Expense_Splits", "Invites", "Payment_Allocations"]:
            try:
                cur.execute(f"ALTER TABLE {table} AUTO_INCREMENT = 1")
            except Exception:
                pass  # table has no auto_increment column — safe to ignore

        return {"wiped": True, "message": "All groups and related data deleted."}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()