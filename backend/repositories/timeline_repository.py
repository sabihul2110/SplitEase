# backend/repositories/timeline_repository.py
from database import get_connection


def fetch_unified_timeline(user_id: int, limit: int = 100, offset: int = 0) -> list[dict]:
    """
    Returns a unified list of financial events for a user, newest first.

    Shape of each row:
    {
        "type":       str,
        "date":       str,          # YYYY-MM-DD
        "amount":     float,
        "my_share":   float | None, # only for group_expense / group_expense_owed
        "receivable": float | None, # only for group_expense
        "label":      str,
        "sub":        str,
        "ref_id":     int,
        "group_id":   int | None,
        "group_name": str | None,
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
            IFNULL(note, source_type)                          AS sub,
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

    rows.sort(key=lambda r: (r["date"], r.get("created_at", "")), reverse=True)
    return rows[offset: offset + limit]