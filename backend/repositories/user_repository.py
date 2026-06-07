# backend/repositories/user_repository.py
from database import get_connection


def fetch_users() -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id, name, upi_id FROM Users ORDER BY user_id ASC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_all_users() -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, upi_id, role, created_at FROM Users ORDER BY user_id ASC"
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, password_hash, role, token_version FROM Users WHERE email = %s",
        (email.strip().lower(),),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def fetch_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, role FROM Users WHERE user_id = %s",
        (user_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def count_users() -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM Users")
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count


def count_admins() -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM Users WHERE role = 'admin'")
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count


def insert_user_with_auth(
    name: str,
    email: str,
    password_hash: str,
    upi_id: str | None = None,
    role: str = "user",
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Users (name, email, upi_id, password_hash, role) VALUES (%s, %s, %s, %s, %s)",
            (name.strip(), email.strip().lower(), upi_id or None, password_hash, role),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def update_user(user_id: int, name: str, email: str, upi_id: str | None = None) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "UPDATE Users SET name = %s, email = %s, upi_id = %s WHERE user_id = %s",
            (name.strip(), email.strip().lower(), upi_id or None, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_user(user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Users WHERE user_id = %s", (user_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def get_user_pending_settlements(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT g.group_id, g.group_name,
            (
                IFNULL((SELECT SUM(total_amount) FROM Expenses WHERE group_id = g.group_id AND payer_id = %s), 0)
                - IFNULL((SELECT SUM(es.amount_owed) FROM Expense_Splits es JOIN Expenses e ON e.expense_id = es.expense_id WHERE e.group_id = g.group_id AND es.user_id = %s), 0)
                + IFNULL((SELECT SUM(amount) FROM Payments WHERE group_id = g.group_id AND payer_id = %s), 0)
                - IFNULL((SELECT SUM(amount) FROM Payments WHERE group_id = g.group_id AND payee_id = %s), 0)
            ) AS net_balance
        FROM `Groups` g
        JOIN Group_Members gm ON gm.group_id = g.group_id AND gm.user_id = %s
        HAVING ABS(net_balance) > 0.01
    """, (user_id, user_id, user_id, user_id, user_id))
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["net_balance"] = float(r["net_balance"])
    return rows


def reset_user_data(user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Personal_Expenses WHERE user_id = %s", (user_id,))
        pe = cur.rowcount
        cur.execute("DELETE FROM Income WHERE user_id = %s", (user_id,))
        inc = cur.rowcount
        cur.execute("DELETE FROM Loans WHERE lender_user_id = %s", (user_id,))
        lo = cur.rowcount
        cur.execute("DELETE FROM Borrows WHERE borrower_user_id = %s", (user_id,))
        bo = cur.rowcount
        conn.commit()
        return {"personal_expenses": pe, "income": inc, "loans": lo, "borrows": bo}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def admin_wipe_app(admin_user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Notifications")
        cur.execute("DELETE FROM Invites")
        cur.execute("DELETE FROM Payments")
        cur.execute("DELETE FROM Expense_Splits")
        cur.execute("DELETE FROM Expenses")
        cur.execute("DELETE FROM Group_Members")
        cur.execute("DELETE FROM `Groups`")
        cur.execute("DELETE FROM Personal_Expenses")
        cur.execute("DELETE FROM Income")
        cur.execute("DELETE FROM Loans")
        cur.execute("DELETE FROM Borrows")
        cur.execute("DELETE FROM Users WHERE user_id != %s", (admin_user_id,))
        conn.commit()
        return {"wiped": True}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()