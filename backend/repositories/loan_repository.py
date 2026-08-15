# backend/repositories/loan_repository.py


from core.database import get_connection

def fetch_loans_with_pending(user_id: int) -> list[dict]:
    """
    Fetches Ledger_Entries for this user where direction='lent',
    including pending ones. This is the unified source of truth view
    for the Normal Loans tab.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            le.entry_id   AS loan_id,
            p.display_name AS borrower_name,
            le.amount,
            le.remaining_amount,
            le.note,
            le.entry_date AS loan_date,
            le.status,
            le.created_at,
            p.linked_user_id,
            u.name        AS linked_user_name
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        LEFT JOIN Users u ON u.user_id = p.linked_user_id
        WHERE  p.owner_user_id = %s
          AND  le.direction    = 'lent'
        ORDER  BY le.entry_date DESC, le.entry_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["loan_date"]        = str(r["loan_date"]) if r.get("loan_date") else ""
        r["created_at"]       = str(r["created_at"]) if r.get("created_at") else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def fetch_borrows_with_pending(user_id: int) -> list[dict]:
    """
    Fetches Ledger_Entries for this user where direction='borrowed',
    including pending ones. Unified source of truth for Normal Borrows tab.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            le.entry_id    AS borrow_id,
            p.display_name AS lender_name,
            le.amount,
            le.remaining_amount,
            le.note,
            le.entry_date  AS borrow_date,
            le.status,
            le.created_at,
            p.linked_user_id,
            u.name         AS linked_user_name
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        LEFT JOIN Users u ON u.user_id = p.linked_user_id
        WHERE  p.owner_user_id = %s
          AND  le.direction    = 'borrowed'
        ORDER  BY le.entry_date DESC, le.entry_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["borrow_date"]      = str(r["borrow_date"]) if r.get("borrow_date") else ""
        r["created_at"]       = str(r["created_at"]) if r.get("created_at") else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def _find_registered_user_by_name(cur, name: str) -> int | None:
    """Return user_id if exactly one registered user matches the name (case-insensitive)."""
    cur.execute(
        "SELECT user_id FROM Users WHERE LOWER(name) = LOWER(%s) LIMIT 1",
        (name.strip(),),
    )
    row = cur.fetchone()
    return row[0] if row else None


def _upsert_person_and_entry(
    cur,
    owner_user_id: int,
    display_name: str,
    linked_user_id: int | None,
    direction: str,       # 'lent' or 'borrowed'
    amount: float,
    note: str | None,
    entry_date: str,
    status: str = 'active',
) -> int:
    """
    Ensure a People record exists for owner_user_id + display_name,
    then insert a Ledger_Entry for it. Returns the new entry_id.
    If linked_user_id is set, the entry starts as 'pending' so the other
    user must acknowledge it — otherwise it goes straight to 'active'.
    """
    cur.execute(
        """
        INSERT INTO People (owner_user_id, display_name, linked_user_id)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            linked_user_id = IF(linked_user_id IS NULL AND VALUES(linked_user_id) IS NOT NULL,
                                VALUES(linked_user_id), linked_user_id)
        """,
        (owner_user_id, display_name.strip(), linked_user_id),
    )
    cur.execute(
        "SELECT person_id FROM People WHERE owner_user_id = %s AND display_name = %s",
        (owner_user_id, display_name.strip()),
    )
    person_id = cur.fetchone()[0]

    entry_status = 'pending' if linked_user_id else status
    cur.execute(
        """
        INSERT INTO Ledger_Entries
            (person_id, created_by, direction, amount, remaining_amount, note, entry_date, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (person_id, owner_user_id, direction,
         round(amount, 2), round(amount, 2),
         note or None, entry_date, entry_status),
    )
    return cur.lastrowid


def insert_loan(
    lender_user_id:  int,
    borrower_name:   str,
    amount:          float,
    note:            str | None,
    loan_date:       str,
    linked_user_id:  int | None = None,
) -> dict:
    """
    Creates the Ledger_Entry — the single source of truth for this loan.
    If linked_user_id is set, the entry starts 'pending' until the other
    user accepts it via people_repository.accept_entry.

    NOTE: Loans/Borrows are no longer written here. Ledger_Entries +
    People is the only storage; "loan_id" in the response is the
    Ledger_Entries.entry_id, kept under this key name for API
    compatibility with existing frontend callers.
    """
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        amt    = round(float(amount), 2)
        status = 'pending' if linked_user_id else 'active'

        entry_id = _upsert_person_and_entry(
            cur,
            owner_user_id  = lender_user_id,
            display_name   = borrower_name.strip(),
            linked_user_id = linked_user_id,
            direction      = 'lent',
            amount         = amt,
            note           = note,
            entry_date     = loan_date,
            status         = status,
        )

        conn.commit()
        return {"loan_id": entry_id, "entry_id": entry_id, "status": status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def record_loan_repayment(loan_id: int, user_id: int, repayment_amount: float, repayment_date: str | None = None) -> dict:
    """
    `loan_id` here is actually Ledger_Entries.entry_id (fetch_loans_with_pending
    aliases entry_id AS loan_id). Delegates to the canonical repayment flow in
    people_repository — a lender (creditor) recording a repayment always applies
    instantly, whether the person is linked or unlinked.
    """
    from repositories.people_repository import propose_or_apply_repayment
    result = propose_or_apply_repayment(
        entry_id           = loan_id,
        requester_user_id  = user_id,
        repayment_amount   = repayment_amount,
        expected_direction = "lent",
        not_found_message  = "Loan not found or not owned by user.",
        repayment_date      = repayment_date,
    )
    result["loan_id"] = result.pop("entry_id")
    return result


def delete_loan(loan_id: int, user_id: int) -> dict:
    """
    Deletes the Ledger_Entry backing this loan. `loan_id` is actually
    Ledger_Entries.entry_id (see fetch_loans_with_pending, which aliases
    entry_id AS loan_id) — this delegates to the canonical entry-deletion
    path in people_repository, so there is exactly one deletion rule and
    one authorisation check shared by the Normal and People tabs, instead
    of a second table kept in sync by name/amount/date matching.

    The old implementation queried `Loans WHERE loan_id = %s`, but the
    caller only ever has Ledger_Entries.entry_id (a different, shared
    AUTO_INCREMENT sequence) — that mismatch meant this endpoint could
    silently fail or hit the wrong row once the two ID sequences diverged.
    """
    from repositories.people_repository import delete_entry
    return delete_entry(loan_id, user_id)