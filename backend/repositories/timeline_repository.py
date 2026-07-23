# backend/repositories/timeline_repository.py

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
                CONVERT('personal_expense' USING utf8mb4)            AS type,
                expense_date                                         AS date,
                amount,
                NULL                                                 AS my_share,
                NULL                                                 AS receivable,
                CONVERT(CONCAT('Spent on ', category) USING utf8mb4) AS label,
                CONVERT(IFNULL(note, category) USING utf8mb4)        AS sub,
                expense_id                                           AS ref_id,
                NULL                                                 AS group_id,
                CONVERT(NULL USING utf8mb4)                          AS group_name,
                created_at
            FROM Personal_Expenses
            WHERE user_id = %s AND expense_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('group_expense' USING utf8mb4)                         AS type,
                e.expense_date                                                 AS date,
                e.total_amount                                                 AS amount,
                IFNULL(es.amount_owed, 0)                                      AS my_share,
                (e.total_amount - IFNULL(es.amount_owed, 0))                   AS receivable,
                CONVERT(CONCAT('Paid in ', g.group_name) USING utf8mb4)        AS label,
                CONVERT(e.description USING utf8mb4)                           AS sub,
                e.expense_id                                                   AS ref_id,
                e.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
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
                CONVERT('group_expense_owed' USING utf8mb4)               AS type,
                e.expense_date                                            AS date,
                es.amount_owed                                            AS amount,
                es.amount_owed                                            AS my_share,
                0                                                         AS receivable,
                CONVERT(CONCAT('Share in ', g.group_name) USING utf8mb4)  AS label,
                CONVERT(e.description USING utf8mb4)                      AS sub,
                e.expense_id                                              AS ref_id,
                e.group_id                                                AS group_id,
                CONVERT(g.group_name USING utf8mb4)                       AS group_name,
                e.created_at
            FROM Expense_Splits es
            JOIN Expenses e ON e.expense_id = es.expense_id
            JOIN `Groups` g ON g.group_id   = e.group_id
            WHERE es.user_id = %s
              AND e.payer_id <> %s
              AND e.expense_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('income' USING utf8mb4)                                    AS type,
                income_date                                                        AS date,
                amount,
                NULL                                                               AS my_share,
                NULL                                                               AS receivable,
                CONVERT(CONCAT('Received — ', REPLACE(source_type, '_', ' ')) USING utf8mb4) AS label,
                CONVERT(IFNULL(note, source_type) USING utf8mb4)                   AS sub,
                income_id                                                          AS ref_id,
                NULL                                                               AS group_id,
                CONVERT(NULL USING utf8mb4)                                        AS group_name,
                created_at
            FROM Income
            WHERE user_id = %s AND income_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('loan_given' USING utf8mb4)                          AS type,
                le.entry_date                                                AS date,
                le.amount,
                NULL                                                         AS my_share,
                le.remaining_amount                                          AS receivable,
                CONVERT(CONCAT('Lent to ', p.display_name) USING utf8mb4)    AS label,
                CONVERT(le.note USING utf8mb4)                               AS sub,
                le.entry_id                                                  AS ref_id,
                NULL                                                         AS group_id,
                CONVERT(NULL USING utf8mb4)                                  AS group_name,
                le.created_at
            FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND le.direction = 'lent'
              AND le.status IN ('active','repaid')
              AND le.entry_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('loan_taken' USING utf8mb4)                             AS type,
                le.entry_date                                                   AS date,
                le.amount,
                NULL                                                            AS my_share,
                le.remaining_amount                                             AS receivable,
                CONVERT(CONCAT('Borrowed from ', p.display_name) USING utf8mb4) AS label,
                CONVERT(le.note USING utf8mb4)                                  AS sub,
                le.entry_id                                                     AS ref_id,
                NULL                                                            AS group_id,
                CONVERT(NULL USING utf8mb4)                                     AS group_name,
                le.created_at
            FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND le.direction = 'borrowed'
              AND le.status IN ('active','repaid')
              AND le.entry_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('settlement_received' USING utf8mb4)                   AS type,
                p.payment_date                                                 AS date,
                p.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT('Received from ', u.name) USING utf8mb4)        AS label,
                CONVERT(CONCAT('Settlement — ', g.group_name) USING utf8mb4)   AS sub,
                p.payment_id                                                   AS ref_id,
                p.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payer_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payee_id = %s AND p.payment_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT('settlement_sent' USING utf8mb4)                       AS type,
                p.payment_date                                                 AS date,
                p.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT('Paid to ', u.name) USING utf8mb4)              AS label,
                CONVERT(CONCAT('Settlement — ', g.group_name) USING utf8mb4)   AS sub,
                p.payment_id                                                   AS ref_id,
                p.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payee_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payer_id = %s AND p.payment_date BETWEEN %s AND %s

            UNION ALL

            SELECT
                CONVERT(CASE WHEN le.direction = 'lent' THEN 'loan_repayment_received' ELSE 'loan_repayment_paid' END USING utf8mb4) AS type,
                lr.repayment_date                                              AS date,
                lr.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT(CASE WHEN le.direction = 'lent' THEN 'Repayment from ' ELSE 'Repayment to ' END, p.display_name) USING utf8mb4) AS label,
                CONVERT(CONCAT('Against ₹', FORMAT(le.amount, 0), ' ', CASE WHEN le.direction = 'lent' THEN 'lent' ELSE 'borrowed' END, ' on ', DATE_FORMAT(le.entry_date, '%d %b %Y'), IF(le.note IS NOT NULL AND le.note <> '', CONCAT(' — ', le.note), '')) USING utf8mb4) AS sub,
                lr.repayment_id                                                AS ref_id,
                NULL                                                           AS group_id,
                CONVERT(NULL USING utf8mb4)                                    AS group_name,
                lr.resolved_at                                                 AS created_at
            FROM Ledger_Repayments lr
            JOIN Ledger_Entries le ON le.entry_id = lr.entry_id
            JOIN People p          ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND lr.status = 'accepted'
              AND lr.repayment_date BETWEEN %s AND %s

        ) AS feed
        ORDER BY date ASC, created_at ASC
        """,
        (
            user_id, start_date, end_date,                    # personal expenses
            user_id, user_id, start_date, end_date, user_id,  # group expense (payer)
            user_id, user_id, start_date, end_date,           # group_expense_owed
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

    SYNC-FIX: category_name/subcategory_name are now real columns on every
    row (NULL where not applicable) instead of being parsed out of the
    display label. Icon resolution on the frontend previously regex-matched
    labels like "Spent on X" — which never matched group-expense rows
    labeled "Paid in <group>" — so category was silently empty for every
    group expense. This closes that gap at the source.
    """
    with get_db() as (conn, cur):
        cur.execute(
        """
        SELECT type, date, amount, my_share, receivable,
               label, sub, ref_id, group_id, group_name,
               category_name, subcategory_name
        FROM (

            -- 1. Personal expenses
            SELECT
                CONVERT('personal_expense' USING utf8mb4)            AS type,
                pe.expense_date                                      AS date,
                pe.amount,
                NULL                                                 AS my_share,
                NULL                                                 AS receivable,
                CONVERT(CONCAT('Spent on ', pe.category) USING utf8mb4) AS label,
                CONVERT(IFNULL(pe.note, pe.category) USING utf8mb4)  AS sub,
                pe.expense_id                                        AS ref_id,
                NULL                                                 AS group_id,
                CONVERT(NULL USING utf8mb4)                          AS group_name,
                CONVERT(pe.category USING utf8mb4)                   AS category_name,
                CONVERT(sc1.subcategory_name USING utf8mb4)          AS subcategory_name,
                pe.created_at
            FROM Personal_Expenses pe
            LEFT JOIN Subcategories sc1 ON sc1.subcategory_id = pe.subcategory_id
            WHERE pe.user_id = %s

            UNION ALL

            -- 2. Group expenses where this user is the PAYER
            SELECT
                CONVERT('group_expense' USING utf8mb4)                         AS type,
                e.expense_date                                                 AS date,
                e.total_amount                                                 AS amount,
                IFNULL(es.amount_owed, 0)                                      AS my_share,
                (e.total_amount - IFNULL(es.amount_owed, 0))                   AS receivable,
                CONVERT(CONCAT('Paid in ', g.group_name) USING utf8mb4)        AS label,
                CONVERT(e.description USING utf8mb4)                           AS sub,
                e.expense_id                                                   AS ref_id,
                e.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
                CONVERT(c2.category_name USING utf8mb4)                        AS category_name,
                CONVERT(sc2.subcategory_name USING utf8mb4)                    AS subcategory_name,
                e.created_at
            FROM Expenses e
            JOIN `Groups` g ON g.group_id = e.group_id
            JOIN Categories c2 ON c2.category_id = e.category_id
            LEFT JOIN Subcategories sc2 ON sc2.subcategory_id = e.subcategory_id
            LEFT JOIN Expense_Splits es
                ON es.expense_id = e.expense_id AND es.user_id = %s
            WHERE e.payer_id = %s
              AND e.group_id IN (
                  SELECT group_id FROM Group_Members WHERE user_id = %s
              )

            UNION ALL

            -- 3. Group expenses where user is a PARTICIPANT but NOT the payer
            SELECT
                CONVERT('group_expense_owed' USING utf8mb4)               AS type,
                e.expense_date                                            AS date,
                es.amount_owed                                            AS amount,
                es.amount_owed                                            AS my_share,
                0                                                         AS receivable,
                CONVERT(CONCAT('Share in ', g.group_name) USING utf8mb4)  AS label,
                CONVERT(e.description USING utf8mb4)                      AS sub,
                e.expense_id                                              AS ref_id,
                e.group_id                                                AS group_id,
                CONVERT(g.group_name USING utf8mb4)                       AS group_name,
                CONVERT(c3.category_name USING utf8mb4)                   AS category_name,
                CONVERT(sc3.subcategory_name USING utf8mb4)               AS subcategory_name,
                e.created_at
            FROM Expense_Splits es
            JOIN Expenses e ON e.expense_id = es.expense_id
            JOIN `Groups` g ON g.group_id   = e.group_id
            JOIN Categories c3 ON c3.category_id = e.category_id
            LEFT JOIN Subcategories sc3 ON sc3.subcategory_id = e.subcategory_id
            WHERE es.user_id = %s
              AND e.payer_id <> %s

            UNION ALL

            -- 4. Income
            SELECT
                CONVERT('income' USING utf8mb4)                                    AS type,
                income_date                                                        AS date,
                amount,
                NULL                                                               AS my_share,
                NULL                                                               AS receivable,
                CONVERT(CONCAT('Received — ', REPLACE(source_type, '_', ' ')) USING utf8mb4) AS label,
                CONVERT(IFNULL(note, source_type) USING utf8mb4)                   AS sub,
                income_id                                                          AS ref_id,
                NULL                                                               AS group_id,
                CONVERT(NULL USING utf8mb4)                                        AS group_name,
                CONVERT(NULL USING utf8mb4)                                        AS category_name,
                CONVERT(NULL USING utf8mb4)                                        AS subcategory_name,
                created_at
            FROM Income
            WHERE user_id = %s

            UNION ALL

            -- 5. Loans given
            SELECT
                CONVERT('loan_given' USING utf8mb4)                          AS type,
                le.entry_date                                                AS date,
                le.amount,
                NULL                                                         AS my_share,
                le.remaining_amount                                          AS receivable,
                CONVERT(CONCAT('Lent to ', p.display_name) USING utf8mb4)    AS label,
                CONVERT(le.note USING utf8mb4)                               AS sub,
                le.entry_id                                                  AS ref_id,
                NULL                                                         AS group_id,
                CONVERT(NULL USING utf8mb4)                                  AS group_name,
                CONVERT(NULL USING utf8mb4)                                  AS category_name,
                CONVERT(NULL USING utf8mb4)                                  AS subcategory_name,
                le.created_at
            FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND le.direction = 'lent'
              AND le.status IN ('active','repaid')

            UNION ALL

            -- 6. Money borrowed
            SELECT
                CONVERT('loan_taken' USING utf8mb4)                             AS type,
                le.entry_date                                                   AS date,
                le.amount,
                NULL                                                            AS my_share,
                le.remaining_amount                                             AS receivable,
                CONVERT(CONCAT('Borrowed from ', p.display_name) USING utf8mb4) AS label,
                CONVERT(le.note USING utf8mb4)                                  AS sub,
                le.entry_id                                                     AS ref_id,
                NULL                                                            AS group_id,
                CONVERT(NULL USING utf8mb4)                                     AS group_name,
                CONVERT(NULL USING utf8mb4)                                     AS category_name,
                CONVERT(NULL USING utf8mb4)                                     AS subcategory_name,
                le.created_at
            FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE p.owner_user_id = %s
              AND le.direction = 'borrowed'
              AND le.status IN ('active','repaid')

            UNION ALL

            -- 7. Settlement payments received
            SELECT
                CONVERT('settlement_received' USING utf8mb4)                   AS type,
                p.payment_date                                                 AS date,
                p.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT('Received from ', u.name) USING utf8mb4)        AS label,
                CONVERT(CONCAT('Settlement — ', g.group_name) USING utf8mb4)   AS sub,
                p.payment_id                                                   AS ref_id,
                p.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
                CONVERT(NULL USING utf8mb4)                                    AS category_name,
                CONVERT(NULL USING utf8mb4)                                    AS subcategory_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payer_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payee_id = %s

            UNION ALL

            -- 8. Settlement payments sent
            SELECT
                CONVERT('settlement_sent' USING utf8mb4)                       AS type,
                p.payment_date                                                 AS date,
                p.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT('Paid to ', u.name) USING utf8mb4)              AS label,
                CONVERT(CONCAT('Settlement — ', g.group_name) USING utf8mb4)   AS sub,
                p.payment_id                                                   AS ref_id,
                p.group_id                                                     AS group_id,
                CONVERT(g.group_name USING utf8mb4)                            AS group_name,
                CONVERT(NULL USING utf8mb4)                                    AS category_name,
                CONVERT(NULL USING utf8mb4)                                    AS subcategory_name,
                p.created_at
            FROM Payments p
            JOIN Users u    ON u.user_id  = p.payee_id
            JOIN `Groups` g ON g.group_id = p.group_id
            WHERE p.payer_id = %s

            UNION ALL

            -- 9. Loan Repayments
            SELECT
                CONVERT(CASE WHEN le.direction = 'lent' THEN 'loan_repayment_received' ELSE 'loan_repayment_paid' END USING utf8mb4) AS type,
                lr.repayment_date                                              AS date,
                lr.amount,
                NULL                                                           AS my_share,
                NULL                                                           AS receivable,
                CONVERT(CONCAT(CASE WHEN le.direction = 'lent' THEN 'Repayment from ' ELSE 'Repayment to ' END, p.display_name) USING utf8mb4) AS label,
                CONVERT(CONCAT('Against ₹', FORMAT(le.amount, 0), ' ', CASE WHEN le.direction = 'lent' THEN 'lent' ELSE 'borrowed' END, ' on ', DATE_FORMAT(le.entry_date, '%d %b %Y'), IF(le.note IS NOT NULL AND le.note <> '', CONCAT(' — ', le.note), '')) USING utf8mb4) AS sub,
                lr.repayment_id                                                AS ref_id,
                NULL                                                           AS group_id,
                CONVERT(NULL USING utf8mb4)                                    AS group_name,
                CONVERT(NULL USING utf8mb4)                                    AS category_name,
                CONVERT(NULL USING utf8mb4)                                    AS subcategory_name,
                lr.resolved_at                                                 AS created_at
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


def fetch_financial_summary(user_id: int) -> dict:
    """
    All-time financial position for a user — the "Account Balance" system.
    Unlike fetch_unified_timeline (paginated, capped at 200 on mobile),
    every figure here is a server-side SUM over full history, so it's
    correct regardless of how many events the user has ever logged.

    account_balance: running cash position across every transaction type
      that actually moves money (income, personal expenses, group expenses
      you paid in full, settlements sent/received, loans given/taken, and
      their repayments). group_expense_owed never moves your cash (you
      haven't paid yet), so it's excluded — matches the mobile TYPE_CFG
      convention that settlements/repayments affect cash only, never P&L,
      to avoid double-counting.

    total_income / total_expense: pure P&L, matching the "spent"/"received"
      buckets already used by ExpensesScreen's computeSummary — expense
      includes your share of group bills whether you paid or owed it.

    loans_receivable / borrows_payable: outstanding principal on the
      standalone Loans/Borrows tables (status='active'). Combine these
      with the existing group-settlement net balances on the client to
      get the full "You Are Owed" / "You Owe" totals across both systems.
    """
    with get_db() as (conn, cur):
        cur.execute(
            """
            SELECT
                IFNULL((SELECT SUM(amount) FROM Income WHERE user_id = %s), 0)
                    AS total_income,

                IFNULL((SELECT SUM(amount) FROM Personal_Expenses WHERE user_id = %s), 0)
              + IFNULL((
                    SELECT SUM(es.amount_owed)
                    FROM Expense_Splits es JOIN Expenses e ON e.expense_id = es.expense_id
                    WHERE e.payer_id = %s
                ), 0)
              + IFNULL((
                    SELECT SUM(es.amount_owed)
                    FROM Expense_Splits es JOIN Expenses e ON e.expense_id = es.expense_id
                    WHERE es.user_id = %s AND e.payer_id <> %s
                ), 0)
                    AS total_expense,

                (
                    IFNULL((SELECT SUM(amount) FROM Income WHERE user_id = %s), 0)
                  - IFNULL((SELECT SUM(amount) FROM Personal_Expenses WHERE user_id = %s), 0)
                  - IFNULL((SELECT SUM(total_amount) FROM Expenses WHERE payer_id = %s), 0)
                  + IFNULL((SELECT SUM(amount) FROM Payments WHERE payee_id = %s), 0)
                  - IFNULL((SELECT SUM(amount) FROM Payments WHERE payer_id = %s), 0)
                  - IFNULL((
                        SELECT SUM(le.amount)
                        FROM Ledger_Entries le JOIN People p ON p.person_id = le.person_id
                        WHERE p.owner_user_id = %s AND le.direction = 'lent'
                          AND le.status IN ('active','repaid')
                    ), 0)
                  + IFNULL((
                        SELECT SUM(le.amount)
                        FROM Ledger_Entries le JOIN People p ON p.person_id = le.person_id
                        WHERE p.owner_user_id = %s AND le.direction = 'borrowed'
                          AND le.status IN ('active','repaid')
                    ), 0)
                  + IFNULL((
                        SELECT SUM(lr.amount)
                        FROM Ledger_Repayments lr
                        JOIN Ledger_Entries le ON le.entry_id = lr.entry_id
                        JOIN People p ON p.person_id = le.person_id
                        WHERE p.owner_user_id = %s AND le.direction = 'lent' AND lr.status = 'accepted'
                    ), 0)
                  - IFNULL((
                        SELECT SUM(lr.amount)
                        FROM Ledger_Repayments lr
                        JOIN Ledger_Entries le ON le.entry_id = lr.entry_id
                        JOIN People p ON p.person_id = le.person_id
                        WHERE p.owner_user_id = %s AND le.direction = 'borrowed' AND lr.status = 'accepted'
                    ), 0)
                )
                    AS account_balance,

                IFNULL((SELECT SUM(remaining_amount) FROM Loans   WHERE lender_user_id   = %s AND status = 'active'), 0)
                    AS loans_receivable,
                IFNULL((SELECT SUM(remaining_amount) FROM Borrows WHERE borrower_user_id = %s AND status = 'active'), 0)
                    AS borrows_payable
            """,
            (user_id,) * 16,
        )
        row = cur.fetchone()

    return {
        "account_balance":  float(row["account_balance"]  or 0),
        "total_income":     float(row["total_income"]     or 0),
        "total_expense":    float(row["total_expense"]     or 0),
        "loans_receivable": float(row["loans_receivable"]  or 0),
        "borrows_payable":  float(row["borrows_payable"]   or 0),
    }