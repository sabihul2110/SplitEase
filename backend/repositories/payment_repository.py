# backend/repositories/payment_repository.py
from core.database import get_connection


def fetch_group_payments(group_id: int, user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT p.payment_id, p.amount, p.note, p.payment_date,
               payer.name AS payer_name, payee.name AS payee_name
        FROM   Payments p
        JOIN   Users payer ON payer.user_id = p.payer_id
        JOIN   Users payee ON payee.user_id = p.payee_id
        JOIN   Group_Members gm ON gm.group_id = p.group_id AND gm.user_id = %s
        WHERE  p.group_id = %s
        ORDER  BY p.payment_date DESC, p.payment_id DESC
        """,
        (user_id, group_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_payment_group_id(payment_id: int) -> int | None:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT group_id FROM Payments WHERE payment_id = %s", (payment_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row else None


def fetch_pending_splits_between(group_id: int, debtor_id: int, creditor_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT e.expense_id, e.description, e.expense_date, es.amount_owed,
               IFNULL(SUM(pa.allocated_amt), 0) AS already_paid,
               (es.amount_owed - IFNULL(SUM(pa.allocated_amt), 0)) AS remaining
        FROM   Expense_Splits es
        JOIN   Expenses e ON e.expense_id = es.expense_id
        LEFT JOIN Payment_Allocations pa ON pa.expense_id = es.expense_id
            AND pa.payment_id IN (
                SELECT payment_id FROM Payments
                WHERE group_id = %s AND payer_id = %s AND payee_id = %s
            )
        WHERE  es.user_id = %s AND e.payer_id = %s AND e.group_id = %s
        GROUP  BY e.expense_id, e.description, e.expense_date, es.amount_owed
        HAVING remaining > 0.005
        ORDER  BY e.expense_date ASC, e.expense_id ASC
        """,
        (group_id, debtor_id, creditor_id, debtor_id, creditor_id, group_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["expense_date"]  = str(r["expense_date"])
        r["amount_owed"]   = float(r["amount_owed"])
        r["already_paid"]  = float(r["already_paid"])
        r["remaining"]     = float(r["remaining"])
    return rows


def fetch_payment_allocations(payment_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT pa.expense_id, pa.allocated_amt, e.description, e.expense_date
        FROM   Payment_Allocations pa
        JOIN   Expenses e ON e.expense_id = pa.expense_id
        WHERE  pa.payment_id = %s
        ORDER  BY e.expense_date ASC
        """,
        (payment_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["expense_date"]  = str(r["expense_date"])
        r["allocated_amt"] = float(r["allocated_amt"])
    return rows


def insert_payment_with_allocations(
    group_id: int, payer_id: int, payee_id: int,
    amount: float, note: str | None, payment_date: str,
    allocations: list[dict],
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Payments (group_id, payer_id, payee_id, amount, note, payment_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (group_id, payer_id, payee_id, round(amount, 2), note or None, payment_date),
        )
        payment_id = cur.lastrowid
        if allocations:
            cur.executemany(
                "INSERT INTO Payment_Allocations (payment_id, expense_id, allocated_amt) VALUES (%s, %s, %s)",
                [(payment_id, a["expense_id"], round(float(a["allocated_amt"]), 2)) for a in allocations],
            )
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


def insert_payment(
    group_id: int, payer_id: int, payee_id: int, amount: float,
    note: str | None, payment_date: str,
) -> int:
    if payer_id == payee_id:
        raise ValueError("Payer and payee must be different members.")
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Payments (group_id, payer_id, payee_id, amount, note, payment_date)
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