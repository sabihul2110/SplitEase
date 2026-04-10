# --- backend/db.py ---

"""
db.py — College Expense Splitter
All database operations. Single source of truth for SQL.
Ported from Streamlit version to FastAPI (no logic changes, same queries).
"""

import mysql.connector
from mysql.connector import pooling
from config import DB_CONFIG, VALID_SOURCE_TYPES
 
# ── Connection pool (created once at module import time) ───────────────────
_pool = pooling.MySQLConnectionPool(
    pool_name    = "splitease_pool",
    pool_size    = 10,
    pool_reset_session = True,   # reset session state between borrows
    **DB_CONFIG,
)
 
 
def get_connection():
    """
    Borrow a connection from the pool.
    Callers MUST call conn.close() when done — this returns it to the pool,
    it does NOT close the underlying TCP connection.
    The existing pattern `cur.close(); conn.close()` is correct and unchanged.
    """
    return _pool.get_connection()


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
        "SELECT user_id, name, email, password_hash, role, token_version FROM Users WHERE email = %s",
        (email.strip().lower(),),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def fetch_user_by_id(user_id: int) -> dict | None:
    """
    Return a user row (user_id, name, email, role) by primary key,
    or None if not found.  Used by the admin DELETE endpoint to check
    the target's role before deletion.
    NOTE: does NOT return password_hash — safe to inspect in route logic.
    """
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
    """Total registered users. First user to sign up becomes admin."""
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM Users")
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count

def count_admins() -> int:
    """
    Return the total number of users with role = 'admin'.
    Used to prevent deleting the last admin account.
    """
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


def fetch_group_expenses_admin(group_id: int) -> list[dict]:
    """
    FIX #10: Admin-only variant of fetch_group_expenses.
    No membership check — returns all expenses for a group regardless
    of whether the calling admin is a member.
    Only called from expenses.py when current_user["role"] == "admin".
    """
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


def fetch_expense_group_id(expense_id: int) -> int | None:
    """
    Return the group_id for a given expense, or None if the expense
    doesn't exist.  Used by the DELETE endpoint to authorise the caller
    before touching the record.
    """
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT group_id FROM Expenses WHERE expense_id = %s",
        (expense_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


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


def fetch_payment_group_id(payment_id: int) -> int | None:
    """
    Return the group_id for a given payment, or None if the payment
    doesn't exist.  Used by the DELETE endpoint to authorise the caller
    before touching the record.
    """
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "SELECT group_id FROM Payments WHERE payment_id = %s",
        (payment_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


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
    FIX #9: Converts raw net_balance rows into minimal payment transactions.
    Now carries user_id and upi_id for both parties so the frontend can
    build UPI deep-links without a secondary name-based lookup.
 
    Positive net_balance → creditor (should receive money).
    Negative net_balance → debtor (owes money).
    """
    creditors = []
    debtors   = []
 
    for r in rows:
        balance = float(r.get("net_balance", 0))
        entry = {
            "user_id":  r["user_id"],
            "name":     r["user_name"],
            "upi_id":   r.get("upi_id"),
        }
        if balance > 0:
            creditors.append([entry, balance])
        elif balance < 0:
            debtors.append([entry, -balance])
 
    settlements = []
    i = j = 0
 
    while i < len(debtors) and j < len(creditors):
        debtor,   debt   = debtors[i]
        creditor, credit = creditors[j]
        amount = min(debt, credit)
 
        settlements.append({
            # Debtor info
            "from":         debtor["name"],
            "from_user_id": debtor["user_id"],
            # Creditor info
            "to":           creditor["name"],
            "to_user_id":   creditor["user_id"],
            "to_upi_id":    creditor["upi_id"],   # ready for UPI link
            "amount":       round(amount, 2),
        })
 
        debtors[i][1]   -= amount
        creditors[j][1] -= amount
        if debtors[i][1]   == 0: i += 1
        if creditors[j][1] == 0: j += 1
 
    return settlements





# ─────────────────────────────────────────────────────────────────────────────
#  db_additions.py
#
#  INSTRUCTIONS:
#  Paste everything below this comment block at the END of your existing db.py.
#  These functions follow the exact same pattern as the rest of db.py:
#    - own get_connection() / close per function
#    - dictionary=True cursors for SELECT
#    - explicit transaction blocks for INSERT / UPDATE / DELETE
#    - no ORM — raw SQL only
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────
#  PERSONAL EXPENSES
# ─────────────────────────────────────────────

def fetch_personal_expenses(user_id: int) -> list[dict]:
    """All personal expenses for a user, newest first."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    # cur.execute(
    #     """
    #     SELECT expense_id, amount, category, note, expense_date, created_at
    #     FROM   Personal_Expenses
    #     WHERE  user_id = %s
    #     ORDER  BY expense_date DESC, expense_id DESC
    #     """,
    #     (user_id,),
    # )
    cur.execute(
        """
        SELECT pe.expense_id, pe.amount, pe.category, pe.note,
               pe.expense_date, pe.created_at,
               pe.merchant_name,
               sc.subcategory_name
        FROM   Personal_Expenses pe
        LEFT JOIN Subcategories sc ON sc.subcategory_id = pe.subcategory_id
        WHERE  pe.user_id = %s
        ORDER  BY pe.expense_date DESC, pe.expense_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    # Normalise date objects to strings so JSON serialisation never breaks
    for r in rows:
        if r.get("expense_date"):
            r["expense_date"] = str(r["expense_date"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


# def insert_personal_expense(
#     user_id: int,
#     amount: float,
#     category: str,
#     note: str | None,
#     expense_date: str,
# ) -> int:
#     conn = get_connection()
#     cur  = conn.cursor()
#     try:
#         conn.start_transaction()
#         cur.execute(
#             """
#             INSERT INTO Personal_Expenses (user_id, amount, category, note, expense_date)
#             VALUES (%s, %s, %s, %s, %s)
#             """,
#             (user_id, round(float(amount), 2), category.strip(), note or None, expense_date),
#         )
#         new_id = cur.lastrowid
#         conn.commit()
#         return new_id
#     except Exception:
#         conn.rollback()
#         raise
#     finally:
#         cur.close(); conn.close()


def insert_personal_expense(
    user_id: int,
    amount: float,
    category: str,
    note: str | None,
    expense_date: str,
    subcategory_id: int | None = None,
    merchant_name: str | None = None,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Personal_Expenses
                (user_id, amount, category, note, expense_date, subcategory_id, merchant_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, round(float(amount), 2), category.strip(),
             note or None, expense_date, subcategory_id or None,
             merchant_name.strip() if merchant_name else None),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_personal_expense(expense_id: int, user_id: int) -> None:
    """Delete only if the requesting user owns the expense."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Personal_Expenses WHERE expense_id = %s AND user_id = %s",
            (expense_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


# ─────────────────────────────────────────────
#  INCOME
# ─────────────────────────────────────────────



def fetch_income(user_id: int) -> list[dict]:
    """All income entries for a user, newest first."""
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


# ─────────────────────────────────────────────
#  LOANS
# ─────────────────────────────────────────────

def fetch_loans(user_id: int) -> list[dict]:
    """All loans lent by a user, newest first."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT loan_id, borrower_name, amount, remaining_amount,
               note, loan_date, status, created_at
        FROM   Loans
        WHERE  lender_user_id = %s
        ORDER  BY loan_date DESC, loan_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r.get("loan_date"):
            r["loan_date"] = str(r["loan_date"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        # Ensure Decimal → float for JSON
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def insert_loan(
    lender_user_id: int,
    borrower_name: str,
    amount: float,
    note: str | None,
    loan_date: str,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Loans
                (lender_user_id, borrower_name, amount, remaining_amount, note, loan_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            """,
            (
                lender_user_id,
                borrower_name.strip(),
                round(float(amount), 2),
                round(float(amount), 2),   # remaining starts equal to amount
                note or None,
                loan_date,
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


def record_loan_repayment(loan_id: int, user_id: int, repayment_amount: float) -> dict:
    """
    Reduce remaining_amount by repayment_amount.
    Marks loan as 'repaid' when remaining reaches 0.
    Returns the updated loan row.
    Raises ValueError if repayment > remaining or loan doesn't belong to user.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Lock the row and verify ownership
        cur.execute(
            """
            SELECT loan_id, remaining_amount, status
            FROM   Loans
            WHERE  loan_id = %s AND lender_user_id = %s
            FOR UPDATE
            """,
            (loan_id, user_id),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Loan not found or not owned by user.")
        if row["status"] == "repaid":
            raise ValueError("Loan is already fully repaid.")

        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)

        if repay <= 0:
            raise ValueError("Repayment amount must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")

        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"

        cur.execute(
            """
            UPDATE Loans
            SET    remaining_amount = %s, status = %s
            WHERE  loan_id = %s
            """,
            (new_remaining, new_status, loan_id),
        )
        conn.commit()

        return {
            "loan_id":          loan_id,
            "remaining_amount": new_remaining,
            "status":           new_status,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_loan(loan_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Loans WHERE loan_id = %s AND lender_user_id = %s",
            (loan_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


# ─────────────────────────────────────────────
#  UNIFIED TIMELINE
#  Used by the My Expenses page to build a single
#  chronological feed across all entry types.
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
#  db_timeline_fix.py
#
#  INSTRUCTIONS:
#  1. In your db.py, FIND the function fetch_unified_timeline() and
#     REPLACE IT ENTIRELY with the version below.
#
#  2. Also ADD the two new functions at the bottom:
#     - insert_borrow()
#     - fetch_borrows()
#     - record_borrow_repayment()
#     - delete_borrow()
#
#  These are the ONLY changes needed in db.py.
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────
#  REPLACE fetch_unified_timeline with this
# ─────────────────────────────────────────────

def fetch_unified_timeline(user_id: int, limit: int = 100, offset: int = 0) -> list[dict]:
    """
    Returns a unified list of financial events for a user.

    KEY FIX: Group expenses now return BOTH the total paid AND the user's
    own share (from Expense_Splits). The frontend shows only my_share as
    the actual expense cost.

    Shape of each row:
    {
        "type":        str,
        "date":        str,   # YYYY-MM-DD
        "amount":      float, # what was PAID (total) for group, actual for others
        "my_share":    float | None,   # only for group_expense
        "receivable":  float | None,   # amount - my_share, only for group_expense
        "label":       str,
        "sub":         str,
        "ref_id":      int,
        "group_id":    int | None,
        "group_name":  str | None,
    }
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)

    # ── 1. Personal expenses ──────────────────────────────────────────────────
    cur.execute(
        """
        SELECT
            'personal_expense'              AS type,
            expense_date                    AS date,
            amount,
            NULL                            AS my_share,
            NULL                            AS receivable,
            CONCAT('Spent on ', category)   AS label,
            IFNULL(note, category)          AS sub,
            expense_id                      AS ref_id,
            NULL                            AS group_id,
            NULL                            AS group_name,
            created_at
        FROM Personal_Expenses
        WHERE user_id = %s
        """,
        (user_id,),
    )
    rows = cur.fetchall()

    # ── 2. Group expenses where this user is the PAYER ────────────────────────
    # Also fetch user's own split amount so frontend can show correct share.
    # If user is payer but NOT in splits (they fronted for others only),
    # my_share = 0 and receivable = total_amount.
    cur.execute(
        """
        SELECT
            'group_expense'                          AS type,
            e.expense_date                           AS date,
            e.total_amount                           AS amount,
            IFNULL(es.amount_owed, 0)                AS my_share,
            (e.total_amount - IFNULL(es.amount_owed, 0))  AS receivable,
            CONCAT('Paid in ', g.group_name)         AS label,
            e.description                            AS sub,
            e.expense_id                             AS ref_id,
            e.group_id                               AS group_id,
            g.group_name                             AS group_name,
            e.created_at
        FROM   Expenses e
        JOIN   `Groups` g ON g.group_id = e.group_id
        LEFT JOIN Expense_Splits es
               ON es.expense_id = e.expense_id AND es.user_id = %s
        WHERE  e.payer_id = %s
          AND  e.group_id IN (
                   SELECT group_id FROM Group_Members WHERE user_id = %s
               )
        """,
        (user_id, user_id, user_id),
    )
    rows += cur.fetchall()

    # ── 3. Group expenses where user is a PARTICIPANT but NOT the payer ───────
    # These show as "You owe" entries — negative for user.
    cur.execute(
        """
        SELECT
            'group_expense_owed'                     AS type,
            e.expense_date                           AS date,
            es.amount_owed                           AS amount,
            es.amount_owed                           AS my_share,
            0                                        AS receivable,
            CONCAT('Share in ', g.group_name)        AS label,
            e.description                            AS sub,
            e.expense_id                             AS ref_id,
            e.group_id                               AS group_id,
            g.group_name                             AS group_name,
            e.created_at
        FROM   Expense_Splits es
        JOIN   Expenses e ON e.expense_id = es.expense_id
        JOIN   `Groups` g ON g.group_id  = e.group_id
        WHERE  es.user_id = %s
          AND  e.payer_id <> %s
        """,
        (user_id, user_id),
    )
    rows += cur.fetchall()

    # ── 4. Income ─────────────────────────────────────────────────────────────
    cur.execute(
        """
        SELECT
            'income'                                           AS type,
            income_date                                        AS date,
            amount,
            NULL                                               AS my_share,
            NULL                                               AS receivable,
            CONCAT('Received — ',
                   REPLACE(source_type, '_', ' '))             AS label,
            IFNULL(note, source_type)                         AS sub,
            income_id                                          AS ref_id,
            NULL                                               AS group_id,
            NULL                                               AS group_name,
            created_at
        FROM Income
        WHERE user_id = %s
        """,
        (user_id,),
    )
    rows += cur.fetchall()

    # ── 5. Loans GIVEN ────────────────────────────────────────────────────────
    cur.execute(
        """
        SELECT
            'loan_given'                                AS type,
            loan_date                                   AS date,
            amount,
            NULL                                        AS my_share,
            remaining_amount                            AS receivable,
            CONCAT('Lent to ', borrower_name)           AS label,
            IFNULL(note,
                   CONCAT('₹', CAST(amount AS CHAR), ' lent')) AS sub,
            loan_id                                     AS ref_id,
            NULL                                        AS group_id,
            NULL                                        AS group_name,
            created_at
        FROM Loans
        WHERE lender_user_id = %s
        """,
        (user_id,),
    )
    rows += cur.fetchall()

    # ── 6. Money BORROWED ─────────────────────────────────────────────────────
    cur.execute(
        """
        SELECT
            'loan_taken'                                AS type,
            borrow_date                                 AS date,
            amount,
            NULL                                        AS my_share,
            remaining_amount                            AS receivable,
            CONCAT('Borrowed from ', lender_name)       AS label,
            IFNULL(note,
                   CONCAT('₹', CAST(amount AS CHAR), ' borrowed')) AS sub,
            borrow_id                                   AS ref_id,
            NULL                                        AS group_id,
            NULL                                        AS group_name,
            created_at
        FROM Borrows
        WHERE borrower_user_id = %s
        """,
        (user_id,),
    )
    rows += cur.fetchall()

    # ── 7. Settlement payments RECEIVED ───────────────────────────────────────
    cur.execute(
        """
        SELECT
            'settlement_received'                       AS type,
            p.payment_date                              AS date,
            p.amount,
            NULL                                        AS my_share,
            NULL                                        AS receivable,
            CONCAT('Received from ', u.name)            AS label,
            CONCAT('Settlement — ', g.group_name)       AS sub,
            p.payment_id                                AS ref_id,
            p.group_id                                  AS group_id,
            g.group_name                                AS group_name,
            p.created_at
        FROM   Payments p
        JOIN   Users u    ON u.user_id   = p.payer_id
        JOIN   `Groups` g ON g.group_id  = p.group_id
        WHERE  p.payee_id = %s
        """,
        (user_id,),
    )
    rows += cur.fetchall()

    # ── 8. Settlement payments SENT ───────────────────────────────────────────
    cur.execute(
        """
        SELECT
            'settlement_sent'                           AS type,
            p.payment_date                              AS date,
            p.amount,
            NULL                                        AS my_share,
            NULL                                        AS receivable,
            CONCAT('Paid to ', u.name)                  AS label,
            CONCAT('Settlement — ', g.group_name)       AS sub,
            p.payment_id                                AS ref_id,
            p.group_id                                  AS group_id,
            g.group_name                                AS group_name,
            p.created_at
        FROM   Payments p
        JOIN   Users u    ON u.user_id   = p.payee_id
        JOIN   `Groups` g ON g.group_id  = p.group_id
        WHERE  p.payer_id = %s
        """,
        (user_id,),
    )
    rows += cur.fetchall()

    cur.close(); conn.close()

    # Normalise types
    for r in rows:
        r["date"]       = str(r["date"])       if r.get("date")       else ""
        r["created_at"] = str(r["created_at"]) if r.get("created_at") else ""
        r["amount"]     = float(r.get("amount") or 0)
        if r.get("my_share")   is not None: r["my_share"]   = float(r["my_share"])
        if r.get("receivable") is not None: r["receivable"] = float(r["receivable"])

    # Sort newest first
    rows.sort(key=lambda r: (r["date"], r.get("created_at", "")), reverse=True)
    return rows[offset : offset + limit]


# ─────────────────────────────────────────────
#  NEW: Borrows — money the user BORROWED
#  ADD these functions at the end of db.py
# ─────────────────────────────────────────────

def fetch_borrows(user_id: int) -> list[dict]:
    """All borrows taken by a user, newest first."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT borrow_id, lender_name, amount, remaining_amount,
               note, borrow_date, status, created_at
        FROM   Borrows
        WHERE  borrower_user_id = %s
        ORDER  BY borrow_date DESC, borrow_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["borrow_date"] = str(r["borrow_date"]) if r.get("borrow_date") else ""
        r["created_at"]  = str(r["created_at"])  if r.get("created_at")  else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def insert_borrow(
    borrower_user_id: int,
    lender_name: str,
    amount: float,
    note: str | None,
    borrow_date: str,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Borrows
                (borrower_user_id, lender_name, amount, remaining_amount, note, borrow_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            """,
            (
                borrower_user_id,
                lender_name.strip(),
                round(float(amount), 2),
                round(float(amount), 2),
                note or None,
                borrow_date,
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


def record_borrow_repayment(borrow_id: int, user_id: int, repayment_amount: float) -> dict:
    """Record a repayment on money the user borrowed."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT borrow_id, remaining_amount, status
            FROM   Borrows
            WHERE  borrow_id = %s AND borrower_user_id = %s
            FOR UPDATE
            """,
            (borrow_id, user_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Borrow not found or not owned by user.")
        if row["status"] == "repaid":
            raise ValueError("Borrow is already fully repaid.")

        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)
        if repay <= 0:
            raise ValueError("Repayment must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")

        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"

        cur.execute(
            "UPDATE Borrows SET remaining_amount = %s, status = %s WHERE borrow_id = %s",
            (new_remaining, new_status, borrow_id),
        )
        conn.commit()
        return {"borrow_id": borrow_id, "remaining_amount": new_remaining, "status": new_status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_borrow(borrow_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Borrows WHERE borrow_id = %s AND borrower_user_id = %s",
            (borrow_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_settlements_for_groups(group_ids: list[int]) -> dict[int, list[dict]]:
    """
    FIX #15: Compute net balances for ALL supplied groups in a single query.
    Returns {group_id: [settlement_rows]}.
    Replaces N individual CALL Calculate_Settlements round-trips.
    """
    if not group_ids:
        return {}
 
    placeholders = ", ".join(["%s"] * len(group_ids))
 
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT
            gm.group_id,
            u.user_id,
            u.name                                          AS user_name,
            u.upi_id,
            IFNULL(paid.total_paid,        0.00)            AS total_paid,
            IFNULL(owed.total_owed,        0.00)            AS total_owed,
            IFNULL(psent.payments_sent,    0.00)            AS payments_sent,
            IFNULL(prec.payments_received, 0.00)            AS payments_received,
            (
                  IFNULL(paid.total_paid,        0.00)
                - IFNULL(owed.total_owed,        0.00)
                + IFNULL(psent.payments_sent,    0.00)
                - IFNULL(prec.payments_received, 0.00)
            )                                               AS net_balance
        FROM Group_Members gm
        JOIN Users u ON u.user_id = gm.user_id
 
        LEFT JOIN (
            SELECT group_id, payer_id, SUM(total_amount) AS total_paid
            FROM   Expenses
            WHERE  group_id IN ({placeholders})
            GROUP  BY group_id, payer_id
        ) paid ON paid.group_id = gm.group_id AND paid.payer_id = u.user_id
 
        LEFT JOIN (
            SELECT e.group_id, es.user_id, SUM(es.amount_owed) AS total_owed
            FROM   Expense_Splits es
            JOIN   Expenses e ON e.expense_id = es.expense_id
            WHERE  e.group_id IN ({placeholders})
            GROUP  BY e.group_id, es.user_id
        ) owed ON owed.group_id = gm.group_id AND owed.user_id = u.user_id
 
        LEFT JOIN (
            SELECT group_id, payer_id, SUM(amount) AS payments_sent
            FROM   Payments
            WHERE  group_id IN ({placeholders})
            GROUP  BY group_id, payer_id
        ) psent ON psent.group_id = gm.group_id AND psent.payer_id = u.user_id
 
        LEFT JOIN (
            SELECT group_id, payee_id, SUM(amount) AS payments_received
            FROM   Payments
            WHERE  group_id IN ({placeholders})
            GROUP  BY group_id, payee_id
        ) prec ON prec.group_id = gm.group_id AND prec.payee_id = u.user_id
 
        WHERE gm.group_id IN ({placeholders})
        ORDER BY gm.group_id, net_balance DESC
        """,
        group_ids * 5,   # 5 IN clauses
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
 
    result: dict[int, list[dict]] = {gid: [] for gid in group_ids}
    for r in rows:
        gid = r.pop("group_id")
        r["net_balance"]       = float(r["net_balance"])
        r["total_paid"]        = float(r["total_paid"])
        r["total_owed"]        = float(r["total_owed"])
        r["payments_sent"]     = float(r["payments_sent"])
        r["payments_received"] = float(r["payments_received"])
        result[gid].append(r)
    return result
 
 
def fetch_group_members_bulk(group_ids: list[int]) -> dict[int, list[dict]]:
    """
    FIX #15: Fetch members for ALL supplied groups in one query.
    Returns {group_id: [member_rows]}.
    """
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
 
 
def fetch_expenses_bulk(group_ids: list[int]) -> dict[int, list[dict]]:
    """
    FIX #15: Fetch expenses for ALL supplied groups in one query.
    Returns {group_id: [expense_rows]}.
    Used by AdminTransactions to avoid N individual /expenses/{id} calls.
    """
    if not group_ids:
        return {}
 
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT
            e.group_id,
            e.expense_id,
            e.description,
            e.total_amount,
            e.split_type,
            e.expense_date,
            u.name              AS payer_name,
            c.category_name,
            sc.subcategory_name
        FROM   Expenses e
        JOIN   Users u             ON u.user_id         = e.payer_id
        JOIN   Categories c        ON c.category_id     = e.category_id
        LEFT JOIN Subcategories sc ON sc.subcategory_id = e.subcategory_id
        WHERE  e.group_id IN ({placeholders})
        ORDER  BY e.expense_date DESC, e.expense_id DESC
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


# --- backend/db.py  (ADD this function at the end) ---
#
# Paste this at the bottom of db.py.
# This is the only new DB function needed.

def fetch_groups_has_expenses(group_ids: list[int]) -> dict[int, bool]:
    """
    For each group_id, returns True if the group has at least one expense,
    False otherwise.

    This is the correct way to detect 'empty' groups — checking
    fetch_settlements_for_groups rows is WRONG because that query always
    returns rows (one per member from Group_Members JOIN), even when
    there are zero expenses. All balances are 0 in that case, but the
    row count is non-zero, so sRows.length === 0 is never true.

    Returns: { group_id: bool }
    """
    if not group_ids:
        return {}

    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT group_id, COUNT(*) AS expense_count
        FROM   Expenses
        WHERE  group_id IN ({placeholders})
        GROUP  BY group_id
        """,
        group_ids,
    )
    rows = cur.fetchall()
    cur.close(); conn.close()

    # Build result — default False for groups with no expenses at all
    # (those won't appear in the query result since COUNT filters them out)
    result = {gid: False for gid in group_ids}
    for r in rows:
        if r["expense_count"] > 0:
            result[r["group_id"]] = True

    return result