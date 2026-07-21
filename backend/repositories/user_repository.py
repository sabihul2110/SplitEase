# backend/repositories/user_repository.py
from core.database import get_connection, get_db


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
        "SELECT user_id, name, email, password_hash, role, token_version, email_verified FROM Users WHERE email = %s",
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

def fetch_user_auth_state(user_id: int) -> dict | None:
    """Lightweight lookup used by get_current_user to validate sessions."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT token_version FROM Users WHERE user_id = %s",
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
    """
    Admin-initiated full removal of a user: reuses reset_user_data's
    cleanup (personal data, group membership, ledger, routines, bills,
    templates) so admin-delete and self-service reset-my-data can never
    drift out of sync — one cleanup routine, two entry points — then
    removes the account row itself.
    """
    reset_user_data(user_id)
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
    """
    Returns all outstanding debts before allowing data reset.
    Checks: group balances, active loans (money owed TO user), active borrows (user owes money).
    """
    with get_db() as (conn, cur):
        # Group balances
        cur.execute("""
            SELECT g.group_id, g.group_name, 'group' AS debt_type,
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
        group_rows = cur.fetchall()

        # Loans and Borrows tables are legacy — Ledger_Entries is the source of truth.
        # Do not double-count by querying both tables.

        # Net ledger balance per person — positive = they owe user, negative = user owes them
        cur.execute("""
            SELECT
                p.person_id AS id,
                p.display_name AS counterparty,
                'ledger' AS debt_type,
                SUM(
                    CASE
                        WHEN le.direction = 'lent'     THEN  le.remaining_amount
                        WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                        ELSE 0
                    END
                ) AS net_balance
            FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s AND le.status = 'active'
            GROUP BY p.person_id, p.display_name
            HAVING ABS(net_balance) > 0.005
        """, (user_id,))
        ledger_rows = cur.fetchall()

        all_rows = group_rows + ledger_rows
        for r in all_rows:
            r["net_balance"] = float(r["net_balance"])
        return all_rows


def reset_user_data(user_id: int) -> dict:
    """
    Deletes all personal data for a user:
    - Personal expenses, income, loans, borrows, notifications
    - Removes from all groups (deletes groups where they're sole member)
    - Deletes their group expenses/splits
    Returns summary of what was deleted.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()

            # Personal data
            cur.execute("DELETE FROM Personal_Expenses WHERE user_id = %s", (user_id,))
            pe = cur.rowcount
            cur.execute("DELETE FROM Income WHERE user_id = %s", (user_id,))
            inc = cur.rowcount
            cur.execute("DELETE FROM Loans WHERE lender_user_id = %s", (user_id,))
            loans = cur.rowcount
            cur.execute("DELETE FROM Borrows WHERE borrower_user_id = %s", (user_id,))
            borrows = cur.rowcount
            cur.execute("DELETE FROM Notifications WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM Ledger_Notifications WHERE recipient_id = %s OR sender_id = %s", (user_id, user_id))

            # Delete ledger entries this user created (cascades from their People records on other users too)
            # First: remove mirror entries on OTHER users' People screens that point back at this user
            # These are entries created_by this user sitting under another user's person card
            cur.execute(
                """
                DELETE le FROM Ledger_Entries le
                JOIN People p ON p.person_id = le.person_id
                WHERE le.created_by = %s AND p.owner_user_id != %s
                """,
                (user_id, user_id),
            )
            # Unlink People records on other users that were linked to this user
            # (don't delete — just sever the link so the person card remains as custom)
            cur.execute(
                "UPDATE People SET linked_user_id = NULL WHERE linked_user_id = %s",
                (user_id,),
            )
            # Now delete this user's own People + Ledger_Entries (cascade handles entries)
            cur.execute("DELETE FROM People WHERE owner_user_id = %s", (user_id,))
            # Bump token_version so any active sessions get 401'd on next request
            cur.execute(
                "UPDATE Users SET token_version = token_version + 1 WHERE user_id = %s",
                (user_id,),
            )

            # Group expenses they paid
            cur.execute("DELETE FROM Expenses WHERE payer_id = %s", (user_id,))
            exp = cur.rowcount

            # Their splits in other expenses
            cur.execute("DELETE FROM Expense_Splits WHERE user_id = %s", (user_id,))

            # Payments they sent or received
            cur.execute("DELETE FROM Payments WHERE payer_id = %s OR payee_id = %s", (user_id, user_id))

            # Routines — Routine_Runs/Routine_Items (children) before Routines
            # (parent). Routine_Items also FKs to Quick_Templates, so it must
            # go before that delete too, below.
            cur.execute("DELETE FROM Routine_Runs WHERE user_id = %s", (user_id,))
            cur.execute(
                "DELETE FROM Routine_Items WHERE routine_id IN (SELECT routine_id FROM Routines WHERE user_id = %s)",
                (user_id,),
            )
            cur.execute("DELETE FROM Routines WHERE user_id = %s", (user_id,))

            # Pending_Bills (child of Recurring_Bills) before Recurring_Bills
            cur.execute("DELETE FROM Pending_Bills WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM Recurring_Bills WHERE user_id = %s", (user_id,))

            # Quick_Templates last — Routine_Items (deleted above) was the
            # only thing referencing it
            cur.execute("DELETE FROM Quick_Templates WHERE user_id = %s", (user_id,))

            # Groups where they are the sole member — delete the group
            cur.execute("""
                DELETE FROM `Groups` WHERE group_id IN (
                    SELECT group_id FROM Group_Members
                    GROUP BY group_id
                    HAVING COUNT(user_id) = 1
                    AND MAX(user_id) = %s
                )
            """, (user_id,))

            # Remove from all remaining groups
            cur.execute("DELETE FROM Group_Members WHERE user_id = %s", (user_id,))

            conn.commit()
            return {"personal_expenses": pe, "income": inc, "loans": loans, "borrows": borrows, "group_expenses": exp}
        except Exception:
            conn.rollback()
            raise


def admin_wipe_app(admin_user_id: int) -> dict:
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute("DELETE FROM Notifications")
            cur.execute("DELETE FROM Ledger_Notifications")
            cur.execute("DELETE FROM Ledger_Repayments")
            cur.execute("DELETE FROM Ledger_Settlement_Requests")
            cur.execute("DELETE FROM Invites")
            cur.execute("DELETE FROM PasswordResetTokens")
            cur.execute("DELETE FROM EmailVerificationTokens")
            cur.execute("DELETE FROM Payment_Allocations")
            cur.execute("DELETE FROM Payments")
            cur.execute("DELETE FROM Expense_Splits")
            cur.execute("DELETE FROM Expenses")
            cur.execute("DELETE FROM Routine_Runs")
            cur.execute("DELETE FROM Routine_Items")
            cur.execute("DELETE FROM Routines")
            cur.execute("DELETE FROM Pending_Bills")
            cur.execute("DELETE FROM Recurring_Bills")
            cur.execute("DELETE FROM Quick_Templates")
            cur.execute("DELETE FROM Group_Members")
            cur.execute("DELETE FROM `Groups`")
            cur.execute("DELETE FROM Personal_Expenses")
            cur.execute("DELETE FROM Income")
            cur.execute("DELETE FROM Loans")
            cur.execute("DELETE FROM Borrows")
            cur.execute("DELETE FROM Ledger_Entries")
            cur.execute("DELETE FROM People")
            cur.execute(
                "UPDATE Users SET token_version = token_version + 1 WHERE user_id != %s",
                (admin_user_id,),
            )
            cur.execute("DELETE FROM Users WHERE user_id != %s", (admin_user_id,))
            conn.commit()

            # DDL auto-commits, so do this after the DML transaction, not inside it.
            # Since the admin row keeps id=1, MySQL will refuse to set the counter
            # below that anyway — next new user/group correctly becomes 2 / 1.
            reset_tables = [
                "Users", "`Groups`", "Group_Members", "Expenses", "Expense_Splits",
                "Payments", "Payment_Allocations", "Invites", "Notifications", "Ledger_Notifications",
                "Personal_Expenses", "Income", "Loans", "Borrows",
                "Ledger_Entries", "People", "Ledger_Repayments", "Ledger_Settlement_Requests",
                "Quick_Templates", "Recurring_Bills", "Pending_Bills",
                "Routines", "Routine_Items", "Routine_Runs",
                "PasswordResetTokens", "EmailVerificationTokens",
            ]
            for table in reset_tables:
                try:
                    cur.execute(f"ALTER TABLE {table} AUTO_INCREMENT = 1")
                except Exception:
                    pass  # composite-PK / no-auto_increment tables (e.g. Group_Members) — safe to skip

            return {"wiped": True}
        except Exception:
            conn.rollback()
            raise