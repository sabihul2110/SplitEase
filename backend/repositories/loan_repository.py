# backend/repositories/loan_repository.py
from core.database import get_connection


def fetch_loans(user_id: int) -> list[dict]:
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
        r["loan_date"]        = str(r["loan_date"]) if r.get("loan_date") else ""
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
) -> None:
    """
    Ensure a People record exists for owner_user_id + display_name,
    then insert a Ledger_Entry for it.
    If linked_user_id is set, the entry starts as 'pending' so the other
    user must acknowledge it — otherwise it goes straight to 'active'.
    """
    # Upsert person
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


def insert_loan(
    lender_user_id: int, borrower_name: str,
    amount: float, note: str | None, loan_date: str,
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
            (lender_user_id, borrower_name.strip(),
             round(float(amount), 2), round(float(amount), 2),
             note or None, loan_date),
        )
        new_id = cur.lastrowid

        # Auto-sync to People / Ledger_Entries
        linked_uid = _find_registered_user_by_name(cur, borrower_name)
        _upsert_person_and_entry(
            cur,
            owner_user_id=lender_user_id,
            display_name=borrower_name.strip(),
            linked_user_id=linked_uid,
            direction='lent',
            amount=round(float(amount), 2),
            note=note,
            entry_date=loan_date,
        )

        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def record_loan_repayment(loan_id: int, user_id: int, repayment_amount: float) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            "SELECT loan_id, remaining_amount, status FROM Loans WHERE loan_id = %s AND lender_user_id = %s FOR UPDATE",
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
            "UPDATE Loans SET remaining_amount = %s, status = %s WHERE loan_id = %s",
            (new_remaining, new_status, loan_id),
        )
        conn.commit()
        return {"loan_id": loan_id, "remaining_amount": new_remaining, "status": new_status}
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