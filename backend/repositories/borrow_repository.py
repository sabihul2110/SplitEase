# backend/repositories/borrow_repository.py
from core.database import get_connection


def fetch_borrows(user_id: int) -> list[dict]:
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
        r["borrow_date"]      = str(r["borrow_date"]) if r.get("borrow_date") else ""
        r["created_at"]       = str(r["created_at"])  if r.get("created_at")  else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def insert_borrow(
    borrower_user_id: int,
    lender_name:      str,
    amount:           float,
    note:             str | None,
    borrow_date:      str,
    linked_user_id:   int | None = None,
) -> dict:
    """
    Creates Ledger_Entry (source of truth) and Borrows row (only if active).
    If linked_user_id is set, entry is pending — the lender must accept,
    and the Borrows row is created by accept_entry on acceptance.
    """
    from repositories.loan_repository import _upsert_person_and_entry
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        amt    = round(float(amount), 2)
        status = 'pending' if linked_user_id else 'active'
        new_id = 0

        if status == 'active':
            cur.execute(
                """
                INSERT INTO Borrows
                    (borrower_user_id, lender_name, amount, remaining_amount, note, borrow_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'active')
                """,
                (borrower_user_id, lender_name.strip(), amt, amt, note or None, borrow_date),
            )
            new_id = cur.lastrowid

        entry_id = _upsert_person_and_entry(
            cur,
            owner_user_id  = borrower_user_id,
            display_name   = lender_name.strip(),
            linked_user_id = linked_user_id,
            direction      = 'borrowed',
            amount         = amt,
            note           = note,
            entry_date     = borrow_date,
            status         = status,
        )

        conn.commit()
        return {"borrow_id": new_id, "entry_id": entry_id, "status": status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def record_borrow_repayment(borrow_id: int, user_id: int, repayment_amount: float) -> dict:
    """
    `borrow_id` here is actually Ledger_Entries.entry_id. Delegates to the
    canonical repayment flow in people_repository — a borrower (debtor)
    recording a repayment must wait for the lender's confirmation when the
    person is linked/registered; unlinked persons apply instantly.
    """
    from repositories.people_repository import propose_or_apply_repayment
    result = propose_or_apply_repayment(
        entry_id           = borrow_id,
        requester_user_id  = user_id,
        repayment_amount   = repayment_amount,
        expected_direction = "borrowed",
        not_found_message  = "Borrow not found or not owned by user.",
    )
    result["borrow_id"] = result.pop("entry_id")
    return result


def delete_borrow(borrow_id: int, user_id: int) -> dict:
    """
    Blocks deletion if this borrow is linked to a registered lender —
    a borrower can NEVER delete/forgive their own debt. Only unlinked
    (custom lender) borrows can be deleted by the borrower, since there's
    no other party being protected.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            "SELECT borrow_id, lender_name, amount, borrow_date FROM Borrows WHERE borrow_id = %s AND borrower_user_id = %s",
            (borrow_id, user_id),
        )
        borrow = cur.fetchone()
        if not borrow:
            return {"deleted": False}

        cur.execute(
            """
            SELECT p.linked_user_id FROM People p
            WHERE p.owner_user_id = %s AND p.display_name = %s
            """,
            (user_id, borrow["lender_name"]),
        )
        person = cur.fetchone()
        if person and person["linked_user_id"]:
            raise ValueError("Only the lender can delete this entry. You cannot forgive your own debt.")

        cur.execute("DELETE FROM Borrows WHERE borrow_id = %s", (borrow_id,))

        cur.execute(
            """
            DELETE le FROM Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  p.owner_user_id = %s AND p.display_name = %s
              AND  le.direction = 'borrowed' AND le.amount = %s AND le.entry_date = %s
            """,
            (user_id, borrow["lender_name"], float(borrow["amount"]), str(borrow["borrow_date"])),
        )

        conn.commit()
        return {"deleted": True}
    except ValueError:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()