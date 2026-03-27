# --- backend/db.py ---

"""
db.py — College Expense Splitter
All database operations. Single source of truth for SQL.
Ported from Streamlit version to FastAPI (no logic changes, same queries).
"""

import mysql.connector
from config import DB_CONFIG


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ─────────────────────────────────────────────
#  USERS
# ─────────────────────────────────────────────

def fetch_users() -> list[dict]:
    """All users — user_id, name, upi_id (used by group pages)."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id, name, upi_id FROM Users ORDER BY user_id ASC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_all_users() -> list[dict]:
    """All users with full details — admin only."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, upi_id, role, created_at FROM Users ORDER BY user_id ASC"
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_user_by_email(email: str) -> dict | None:
    """
    Returns full user row for the given email, or None.
    Used by auth login. Includes password_hash — never send to frontend.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT user_id, name, email, password_hash, role FROM Users WHERE email = %s",
        (email.strip().lower(),),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def count_users() -> int:
    """Total registered users. First user to sign up becomes admin."""
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM Users")
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
    """
    Insert a new user with hashed password and role.
    Returns the new user_id.
    Raises mysql.connector.IntegrityError if email already exists.
    """
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Users (name, email, upi_id, password_hash, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
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
    """Cascade removes memberships, splits, payments."""
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


# ─────────────────────────────────────────────
#  GROUPS
# ─────────────────────────────────────────────

def fetch_groups(user_id: int) -> list[dict]:
    """Groups the logged-in user belongs to."""
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
    """All groups with member count — admin only."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            g.group_id,
            g.group_name,
            g.created_at,
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


def insert_group(group_name: str, user_ids: list[int]) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO `Groups` (group_name) VALUES (%s)",
            (group_name.strip(),),
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
    """Atomically replace the member list of a group."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Group_Members WHERE group_id = %s", (group_id,))
        for uid in user_ids:
            cur.execute(
                "INSERT INTO Group_Members (group_id, user_id) VALUES (%s, %s)",
                (group_id, uid),
            )
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
    """Quick membership check used by all group-level routes."""
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT 1 FROM Group_Members WHERE group_id = %s AND user_id = %s",
        (group_id, user_id),
    )
    found = cur.fetchone() is not None
    cur.close(); conn.close()
    return found


# ─────────────────────────────────────────────
#  CATEGORIES
# ─────────────────────────────────────────────

def fetch_categories() -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT category_id, category_name FROM Categories ORDER BY category_id ASC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_subcategories(category_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT subcategory_id, subcategory_name
        FROM   Subcategories
        WHERE  category_id = %s
        ORDER  BY subcategory_id ASC
        """,
        (category_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


# ─────────────────────────────────────────────
#  EXPENSES
# ─────────────────────────────────────────────

def fetch_group_expenses(group_id: int, user_id: int) -> list[dict]:
    """All expenses for a group — only if user is a member."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            e.expense_id,
            e.description,
            e.total_amount,
            e.split_type,
            e.expense_date,
            u.name             AS payer_name,
            c.category_name,
            sc.subcategory_name
        FROM   Expenses e
        JOIN   Users u              ON u.user_id         = e.payer_id
        JOIN   Categories c         ON c.category_id     = e.category_id
        LEFT JOIN Subcategories sc  ON sc.subcategory_id = e.subcategory_id
        WHERE  e.group_id = %s
          AND  e.group_id IN (
                   SELECT group_id FROM Group_Members WHERE user_id = %s
               )
        ORDER  BY e.expense_date DESC, e.expense_id DESC
        """,
        (group_id, user_id),
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


def insert_expense(
    group_id: int,
    payer_id: int,
    category_id: int,
    subcategory_id: int | None,
    total_amount: float,
    description: str,
    split_type: str,
    expense_date: str,
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
            """
            INSERT INTO Expense_Splits (expense_id, user_id, amount_owed, share_pct)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (expense_id, s["user_id"], round(s["amount_owed"], 2), s.get("share_pct"))
                for s in splits
            ],
        )
        conn.commit()
        return expense_id
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


# ─────────────────────────────────────────────
#  PAYMENTS
# ─────────────────────────────────────────────

def fetch_group_payments(group_id: int, user_id: int) -> list[dict]:
    """All payments for a group — only if user is a member."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            p.payment_id,
            p.amount,
            p.note,
            p.payment_date,
            payer.name  AS payer_name,
            payee.name  AS payee_name
        FROM   Payments p
        JOIN   Users payer ON payer.user_id = p.payer_id
        JOIN   Users payee ON payee.user_id = p.payee_id
        WHERE  p.group_id = %s
          AND  p.group_id IN (
                   SELECT group_id FROM Group_Members WHERE user_id = %s
               )
        ORDER  BY p.payment_date DESC, p.payment_id DESC
        """,
        (group_id, user_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def insert_payment(
    group_id: int,
    payer_id: int,
    payee_id: int,
    amount: float,
    note: str | None,
    payment_date: str,
) -> int:
    if payer_id == payee_id:
        raise ValueError("Payer and payee must be different members.")
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Payments
                (group_id, payer_id, payee_id, amount, note, payment_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (group_id, payer_id, payee_id, round(amount, 2), note or None, payment_date),
        )
        payment_id = cur.lastrowid
        conn.commit()
        return payment_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_payment(payment_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute("DELETE FROM Payments WHERE payment_id = %s", (payment_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


# ─────────────────────────────────────────────
#  SETTLEMENTS
# ─────────────────────────────────────────────

def calculate_settlements(group_id: int, user_id: int) -> list[dict]:
    """
    Calls Calculate_Settlements stored procedure.
    Returns [] if the requesting user is not a group member.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute(
        "SELECT 1 FROM Group_Members WHERE group_id = %s AND user_id = %s",
        (group_id, user_id),
    )
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return []

    cur.callproc("Calculate_Settlements", [group_id])
    results = []
    for result in cur.stored_results():
        results = result.fetchall()
    cur.close(); conn.close()
    return results


def simplify_debts(rows: list[dict]) -> list[dict]:
    """
    Converts raw net_balance rows into minimal payment transactions.
    Positive net_balance → should receive money (creditor).
    Negative net_balance → owes money (debtor).
    """
    creditors = []
    debtors   = []

    for r in rows:
        name    = r["user_name"]
        balance = float(r.get("net_balance", 0))
        if balance > 0:
            creditors.append([name, balance])
        elif balance < 0:
            debtors.append([name, -balance])

    settlements = []
    i = j = 0

    while i < len(debtors) and j < len(creditors):
        debtor,   debt   = debtors[i]
        creditor, credit = creditors[j]
        amount = min(debt, credit)
        settlements.append({"from": debtor, "to": creditor, "amount": round(amount, 2)})
        debtors[i][1]   -= amount
        creditors[j][1] -= amount
        if debtors[i][1] == 0: i += 1
        if creditors[j][1] == 0: j += 1

    return settlements