# backend/repositories/expense_repository.py
from database import get_connection


def fetch_group_expenses(group_id: int, user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT e.expense_id, e.description, e.total_amount, e.split_type,
               e.expense_date, u.name AS payer_name,
               c.category_name, sc.subcategory_name
        FROM   Expenses e
        JOIN   Users u             ON u.user_id         = e.payer_id
        JOIN   Categories c        ON c.category_id     = e.category_id
        LEFT JOIN Subcategories sc ON sc.subcategory_id = e.subcategory_id
        JOIN   Group_Members gm ON gm.group_id = e.group_id AND gm.user_id = %s
        WHERE  e.group_id = %s
        ORDER  BY e.expense_date DESC, e.expense_id DESC
        """,
        (user_id, group_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_group_expenses_admin(group_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT e.expense_id, e.description, e.total_amount, e.split_type,
               e.expense_date, u.name AS payer_name,
               c.category_name, sc.subcategory_name
        FROM   Expenses e
        JOIN   Users u             ON u.user_id         = e.payer_id
        JOIN   Categories c        ON c.category_id     = e.category_id
        LEFT JOIN Subcategories sc ON sc.subcategory_id = e.subcategory_id
        WHERE  e.group_id = %s
        ORDER  BY e.expense_date DESC, e.expense_id DESC
        """,
        (group_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_expense_splits(expense_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT u.name, u.user_id, es.amount_owed, es.share_pct
        FROM   Expense_Splits es
        JOIN   Users u ON u.user_id = es.user_id
        WHERE  es.expense_id = %s
        ORDER  BY u.user_id ASC
        """,
        (expense_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_expense_group_id(expense_id: int) -> int | None:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT group_id FROM Expenses WHERE expense_id = %s", (expense_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


def fetch_expense_settlement_status(group_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT es.expense_id, es.user_id, es.amount_owed,
               IFNULL(SUM(pa.allocated_amt), 0) AS allocated
        FROM   Expense_Splits es
        JOIN   Expenses e ON e.expense_id = es.expense_id
        LEFT JOIN Payment_Allocations pa ON pa.expense_id = es.expense_id
            AND pa.payment_id IN (SELECT payment_id FROM Payments WHERE group_id = %s)
        WHERE  e.group_id = %s
        GROUP  BY es.expense_id, es.user_id, es.amount_owed
        """,
        (group_id, group_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount_owed"] = float(r["amount_owed"])
        r["allocated"]   = float(r["allocated"])
        if r["allocated"] >= r["amount_owed"] - 0.005:
            r["status"] = "settled"
        elif r["allocated"] > 0.005:
            r["status"] = "partial"
        else:
            r["status"] = "pending"
    return rows


def insert_expense(
    group_id: int, payer_id: int, category_id: int,
    subcategory_id: int | None, total_amount: float,
    description: str, split_type: str, expense_date: str,
    splits: list[dict],
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Expenses
                (group_id, payer_id, category_id, subcategory_id,
                 total_amount, description, split_type, expense_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (group_id, payer_id, category_id, subcategory_id,
             total_amount, description, split_type, expense_date),
        )
        expense_id = cur.lastrowid
        cur.executemany(
            "INSERT INTO Expense_Splits (expense_id, user_id, amount_owed, share_pct) VALUES (%s, %s, %s, %s)",
            [(expense_id, s["user_id"], round(s["amount_owed"], 2), s.get("share_pct")) for s in splits],
        )
        conn.commit()
        return expense_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_expense(
    expense_id: int, payer_id: int, category_id: int,
    subcategory_id: int | None, total_amount: float,
    description: str, split_type: str, expense_date: str,
    splits: list[dict],
) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            UPDATE Expenses
            SET payer_id=%s, category_id=%s, subcategory_id=%s,
                total_amount=%s, description=%s, split_type=%s, expense_date=%s
            WHERE expense_id=%s
            """,
            (payer_id, category_id, subcategory_id,
             total_amount, description, split_type, expense_date, expense_id),
        )
        cur.execute("DELETE FROM Expense_Splits WHERE expense_id = %s", (expense_id,))
        cur.executemany(
            "INSERT INTO Expense_Splits (expense_id, user_id, amount_owed, share_pct) VALUES (%s, %s, %s, %s)",
            [(expense_id, s["user_id"], round(s["amount_owed"], 2), s.get("share_pct")) for s in splits],
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_expense(expense_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Expenses WHERE expense_id = %s", (expense_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_expenses_bulk(group_ids: list[int]) -> dict[int, list[dict]]:
    if not group_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT e.group_id, e.expense_id, e.description, e.total_amount,
               e.split_type, e.expense_date, u.name AS payer_name,
               c.category_name, sc.subcategory_name
        FROM   Expenses e
        JOIN   Users u             ON u.user_id         = e.payer_id
        JOIN   Categories c        ON c.category_id     = e.category_id
        LEFT JOIN Subcategories sc ON sc.subcategory_id = e.subcategory_id
        WHERE  e.group_id IN ({placeholders})
        ORDER  BY e.group_id, e.expense_date DESC, e.expense_id DESC
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