# backend/repositories/timeline_repository.py
# from core.database import get_connection

from core.database import get_db


def fetch_timeline_for_period(user_id: int, start_date: str, end_date: str) -> list[dict]:
    """
    Same unified feed as fetch_unified_timeline, but filtered to a date range
    (inclusive) instead of paginated. Used for statement PDF generation.
    start_date / end_date are 'YYYY-MM-DD' strings.
    """
    with get_db() as (conn, cur):
        cur.execute(
        """
        SELECT type, date, amount, my_share, receivable,
               label, sub, ref_id, group_id, group_name
        FROM (

            SELECT
                'personal_expense'            AS type,
                expense_date                  AS date,
                amount,
                NULL                          AS my_share,
                NULL                          AS receivable,
                CONCAT('Spent on ', category) AS label,
                IFNULL(note, category)        AS sub,
                expense_id                    AS ref_id,
                NULL                          AS group_id,
                NULL                          AS group_name,
                created_at
            FROM Personal_Expenses
            WHERE user_id = %s AND expense_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                'group_expense'                                AS type,
                e.expense_date                                 AS date,
                e.total_amount                                 AS amount,
                IFNULL(es.amount_owed, 0)                      AS my_share,
                (e.total_amount - IFNULL(es.amount_owed, 0))   AS receivable,
                CONCAT('Paid in ', g.group_name)               AS label,
                e.description                                  AS sub,
                e.expense_id                                   AS ref_id,
                e.group_id                                     AS group_id,
                g.group_name                                   AS group_name,
                e.created_at
            FROM Expenses e
            JOIN `Groups` g ON g.group_id = e.group_id
            LEFT JOIN Expense_Splits es
                ON es.expense_id = e.expense_id AND es.user_id = %s
            WHERE e.payer_id = %s
              AND e.expense_date BETWEEN %s AND %s
              AND e.group_id IN (
                  SELECT group_id FROM Group_Members WHERE user_id = %s
              )

            UNION ALL

            SELECT
                'group_expense_owed'              AS type,
                e.expense_date                    AS date,
                es.amount_owed                    AS amount,
                es.amount_owed                    AS my_share,
                0                                 AS receivable,
                CONCAT('Share in ', g.group_name) AS label,
                e.description                     AS sub,
                e.expense_id                      AS ref_id,
                e.group_id                        AS group_id,
                g.group_name                      AS group_name,
                e.created_at
            FROM Expense_Splits es
            JOIN Expenses e ON e.expense_id = es.expense_id
            JOIN `Groups` g ON g.group_id   = e.group_id
            WHERE es.user_id = %s
              AND e.payer_id <> %s
              AND e.expense_date BETWEEN %s AND %s

            UNION ALL

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
            WHERE user_id = %s AND income_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                'loan_given'                                        AS type,
                loan_date                                           AS date,
                amount,
                NULL                                                AS my_share,
                remaining_amount                                    AS receivable,
                CONCAT('Lent to ', borrower_name)                   AS label,
                note AS sub,
                loan_id                                             AS ref_id,
                NULL                                                AS group_id,
                NULL                                                AS group_name,
                created_at
            FROM Loans
            WHERE lender_user_id = %s AND loan_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                'loan_taken'                                            AS type,
                borrow_date                                             AS date,
                amount,
                NULL                                                    AS my_share,
                remaining_amount                                        AS receivable,
                CONCAT('Borrowed from ', lender_name)                   AS label,
                note AS sub,
                borrow_id                                               AS ref_id,
                NULL                                                    AS group_id,
                NULL                                                    AS group_name,
                created_at
            FROM Borrows
            WHERE borrower_user_id = %s AND borrow_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                'settlement_received'                  AS type,
                p.payment_date                         AS date,
                p.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT('Received from ', u.name)       AS label,
                CONCAT('Settlement — ', g.group_name)  AS sub,
                p.payment_id                           AS ref_id,
                p.group_id                             AS group_id,
                g.group_name                           AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payer_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payee_id = %s AND p.payment_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                'settlement_sent'                      AS type,
                p.payment_date                         AS date,
                p.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT('Paid to ', u.name)             AS label,
                CONCAT('Settlement — ', g.group_name)  AS sub,
                p.payment_id                           AS ref_id,
                p.group_id                             AS group_id,
                g.group_name                           AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payee_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payer_id = %s AND p.payment_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CASE WHEN le.direction = 'lent' THEN 'loan_repayment_received' ELSE 'loan_repayment_paid' END AS type,
                lr.repayment_date                      AS date,
                lr.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT(
                    CASE WHEN le.direction = 'lent' THEN 'Repayment from ' ELSE 'Repayment to ' END,
                    p.display_name
                )                                       AS label,
                le.note                                AS sub,
                lr.repayment_id                         AS ref_id,
                NULL                                    AS group_id,
                NULL                                    AS group_name,
                lr.resolved_at                          AS created_at
            FROM Ledger_Repayments lr
            JOIN Ledger_Entries le ON le.entry_id = lr.entry_id
            JOIN People p          ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND lr.status = 'accepted'
              AND lr.repayment_date BETWEEN %s AND %s

        ) AS feed
        ORDER BY date DESC, created_at DESC
        """,
        (
            user_id, start_date, end_date,                    # personal expenses
            user_id, user_id, start_date, end_date, user_id,  # group expense (payer)
            user_id, user_id, start_date, end_date,            # group_expense_owed
            user_id, start_date, end_date,                    # income
            user_id, start_date, end_date,                    # loans given
            user_id, start_date, end_date,                    # borrows
            user_id, start_date, end_date,                    # settlement received
            user_id, start_date, end_date,                    # settlement sent
            user_id, start_date, end_date,                    # loan repayments
        ),
    )

    rows = cur.fetchall()

    for r in rows:
        r["date"]     = str(r["date"])   if r.get("date")   else ""
        r["amount"]   = float(r.get("amount") or 0)
        r.pop("created_at", None)
        if r.get("my_share")   is not None: r["my_share"]   = float(r["my_share"])
        if r.get("receivable") is not None: r["receivable"] = float(r["receivable"])
        if r["type"] == "loan_given" and not r.get("sub"):
            r["sub"] = f"₹{r['amount']} lent"
        elif r["type"] == "loan_taken" and not r.get("sub"):
            r["sub"] = f"₹{r['amount']} borrowed"

    return rows


def fetch_unified_timeline(user_id: int, limit: int = 100, offset: int = 0) -> list[dict]:
    """
    Returns a unified, date-sorted feed of all financial events for a user.
    Single UNION ALL query — replaces 8 sequential round-trips.
    """
    with get_db() as (conn, cur):
        cur.execute(
        """
        SELECT type, date, amount, my_share, receivable,
               label, sub, ref_id, group_id, group_name
        FROM (

            -- 1. Personal expenses
            SELECT
                'personal_expense'            AS type,
                expense_date                  AS date,
                amount,
                NULL                          AS my_share,
                NULL                          AS receivable,
                CONCAT('Spent on ', category) AS label,
                IFNULL(note, category)        AS sub,
                expense_id                    AS ref_id,
                NULL                          AS group_id,
                NULL                          AS group_name,
                created_at
            FROM Personal_Expenses
            WHERE user_id = %s

            UNION ALL

            -- 2. Group expenses where this user is the PAYER
            SELECT
                'group_expense'                                AS type,
                e.expense_date                                 AS date,
                e.total_amount                                 AS amount,
                IFNULL(es.amount_owed, 0)                      AS my_share,
                (e.total_amount - IFNULL(es.amount_owed, 0))   AS receivable,
                CONCAT('Paid in ', g.group_name)               AS label,
                e.description                                  AS sub,
                e.expense_id                                   AS ref_id,
                e.group_id                                     AS group_id,
                g.group_name                                   AS group_name,
                e.created_at
            FROM Expenses e
            JOIN `Groups` g ON g.group_id = e.group_id
            LEFT JOIN Expense_Splits es
                ON es.expense_id = e.expense_id AND es.user_id = %s
            WHERE e.payer_id = %s
              AND e.group_id IN (
                  SELECT group_id FROM Group_Members WHERE user_id = %s
              )

            UNION ALL

            -- 3. Group expenses where user is a PARTICIPANT but NOT the payer
            SELECT
                'group_expense_owed'              AS type,
                e.expense_date                    AS date,
                es.amount_owed                    AS amount,
                es.amount_owed                    AS my_share,
                0                                 AS receivable,
                CONCAT('Share in ', g.group_name) AS label,
                e.description                     AS sub,
                e.expense_id                      AS ref_id,
                e.group_id                        AS group_id,
                g.group_name                      AS group_name,
                e.created_at
            FROM Expense_Splits es
            JOIN Expenses e ON e.expense_id = es.expense_id
            JOIN `Groups` g ON g.group_id   = e.group_id
            WHERE es.user_id = %s
              AND e.payer_id <> %s

            UNION ALL

            -- 4. Income
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

            UNION ALL

            -- 5. Loans given
            SELECT
                'loan_given'                                        AS type,
                loan_date                                           AS date,
                amount,
                NULL                                                AS my_share,
                remaining_amount                                    AS receivable,
                CONCAT('Lent to ', borrower_name)                   AS label,
                note AS sub,
                loan_id                                             AS ref_id,
                NULL                                                AS group_id,
                NULL                                                AS group_name,
                created_at
            FROM Loans
            WHERE lender_user_id = %s

            UNION ALL

            -- 6. Money borrowed
            SELECT
                'loan_taken'                                            AS type,
                borrow_date                                             AS date,
                amount,
                NULL                                                    AS my_share,
                remaining_amount                                        AS receivable,
                CONCAT('Borrowed from ', lender_name)                   AS label,
                note AS sub,
                borrow_id                                               AS ref_id,
                NULL                                                    AS group_id,
                NULL                                                    AS group_name,
                created_at
            FROM Borrows
            WHERE borrower_user_id = %s

            UNION ALL

            -- 7. Settlement payments received
            SELECT
                'settlement_received'                  AS type,
                p.payment_date                         AS date,
                p.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT('Received from ', u.name)       AS label,
                CONCAT('Settlement — ', g.group_name)  AS sub,
                p.payment_id                           AS ref_id,
                p.group_id                             AS group_id,
                g.group_name                           AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payer_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payee_id = %s

            UNION ALL

            -- 8. Settlement payments sent
            SELECT
                'settlement_sent'                      AS type,
                p.payment_date                         AS date,
                p.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT('Paid to ', u.name)             AS label,
                CONCAT('Settlement — ', g.group_name)  AS sub,
                p.payment_id                           AS ref_id,
                p.group_id                             AS group_id,
                g.group_name                           AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payee_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payer_id = %s

            UNION ALL

            SELECT
                CASE WHEN le.direction = 'lent' THEN 'loan_repayment_received' ELSE 'loan_repayment_paid' END AS type,
                lr.repayment_date                      AS date,
                lr.amount,
                NULL                                   AS my_share,
                NULL                                   AS receivable,
                CONCAT(
                    CASE WHEN le.direction = 'lent' THEN 'Repayment from ' ELSE 'Repayment to ' END,
                    p.display_name
                )                                       AS label,
                le.note                                AS sub,
                lr.repayment_id                         AS ref_id,
                NULL                                    AS group_id,
                NULL                                    AS group_name,
                lr.resolved_at                          AS created_at
            FROM Ledger_Repayments lr
            JOIN Ledger_Entries le ON le.entry_id = lr.entry_id
            JOIN People p          ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND lr.status = 'accepted'

        ) AS feed
        ORDER BY date DESC, created_at DESC
        LIMIT %s OFFSET %s
        """,
        (
            user_id,           # personal expenses
            user_id,           # group expense: my split lookup
            user_id,           # group expense: payer_id
            user_id,           # group expense: member check
            user_id,           # group_expense_owed: participant
            user_id,           # group_expense_owed: not payer
            user_id,           # income
            user_id,           # loans given
            user_id,           # borrows
            user_id,           # settlement received
            user_id,           # settlement sent
            user_id,           # loan repayments
            limit,
            offset,
        ),
    )

    rows = cur.fetchall()

    for r in rows:
        r["date"]     = str(r["date"])   if r.get("date")   else ""
        r["amount"]   = float(r.get("amount") or 0)
        r.pop("created_at", None)
        if r.get("my_share")   is not None: r["my_share"]   = float(r["my_share"])
        if r.get("receivable") is not None: r["receivable"] = float(r["receivable"])
        
        # Safely format the loan/borrow subtitles in Python to avoid SQL collation crashes
        if r["type"] == "loan_given" and not r.get("sub"):
            r["sub"] = f"₹{r['amount']} lent"
        elif r["type"] == "loan_taken" and not r.get("sub"):
            r["sub"] = f"₹{r['amount']} borrowed"

    return rows