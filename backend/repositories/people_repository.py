# SplitEase/backend/repositories/people_repository.py


from core.database import get_connection


# ── People ────────────────────────────────────────────────────────────────────

def fetch_people(owner_user_id: int) -> list[dict]:
    """
    Returns all people for this user with aggregated net balance.
    net_balance > 0  → they owe the user
    net_balance < 0  → the user owes them
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT
            p.person_id,
            p.display_name,
            p.linked_user_id,
            p.created_at,
            COALESCE(SUM(
                CASE
                    WHEN le.direction = 'lent'     THEN  le.remaining_amount
                    WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                    ELSE 0
                END
            ), 0) AS net_balance,
            COUNT(le.entry_id)                                   AS total_entries,
            SUM(CASE WHEN le.status = 'active' THEN 1 ELSE 0 END) AS active_entries,
            MAX(le.entry_date)                                   AS last_activity
        FROM People p
        LEFT JOIN Ledger_Entries le ON le.person_id = p.person_id
        WHERE p.owner_user_id = %s
        GROUP BY p.person_id
        ORDER BY last_activity DESC, p.created_at DESC
        """,
        (owner_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["net_balance"]    = float(r["net_balance"] or 0)
        r["total_entries"]  = int(r["total_entries"] or 0)
        r["active_entries"] = int(r["active_entries"] or 0)
        r["last_activity"]  = str(r["last_activity"]) if r.get("last_activity") else None
        r["created_at"]     = str(r["created_at"])
    return rows


def insert_person(
    owner_user_id:  int,
    display_name:   str,
    linked_user_id: int | None = None,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO People (owner_user_id, display_name, linked_user_id) VALUES (%s, %s, %s)",
            (owner_user_id, display_name.strip(), linked_user_id),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_person(person_id: int, owner_user_id: int) -> bool:
    """Deletes person and cascades to Ledger_Entries. Returns True if row existed."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM People WHERE person_id = %s AND owner_user_id = %s",
            (person_id, owner_user_id),
        )
        deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_person(person_id: int, owner_user_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT person_id, display_name, linked_user_id, created_at FROM People WHERE person_id = %s AND owner_user_id = %s",
        (person_id, owner_user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    if row:
        row["created_at"] = str(row["created_at"])
    return row


# ── Ledger entries ────────────────────────────────────────────────────────────

def fetch_entries(person_id: int, owner_user_id: int) -> list[dict]:
    """Returns all ledger entries for a person, verifying ownership via JOIN."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT le.entry_id, le.person_id, le.direction,
               le.amount, le.remaining_amount, le.note,
               le.entry_date, le.status, le.created_at
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        WHERE  le.person_id = %s AND p.owner_user_id = %s
        ORDER  BY le.entry_date DESC, le.entry_id DESC
        """,
        (person_id, owner_user_id),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
        r["entry_date"]       = str(r["entry_date"])
        r["created_at"]       = str(r["created_at"])
    return rows


def insert_entry(
    person_id:   int,
    created_by:  int,
    direction:   str,
    amount:      float,
    note:        str | None,
    entry_date:  str,
    is_pending:  bool = False,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        amt    = round(float(amount), 2)
        status = "pending" if is_pending else "active"
        cur.execute(
            """
            INSERT INTO Ledger_Entries
                (person_id, created_by, direction, amount, remaining_amount, note, entry_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (person_id, created_by, direction, amt, amt, note or None, entry_date, status),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def get_or_create_reciprocal_person(
    owner_user_id:  int,
    display_name:   str,
    linked_user_id: int,
) -> int:
    """Get existing person or create a reciprocal People record."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        # Check if reciprocal already exists
        cur.execute(
            "SELECT person_id FROM People WHERE owner_user_id = %s AND linked_user_id = %s",
            (owner_user_id, linked_user_id),
        )
        row = cur.fetchone()
        if row:
            return row["person_id"]
        cur.close(); conn.close()
        return insert_person(owner_user_id, display_name, linked_user_id)
    except Exception:
        raise
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass


def accept_entry(entry_id: int, recipient_user_id: int) -> dict:
    """
    Accept a pending entry. Only callable by the linked user who received the request.
    Verifies via People.linked_user_id that the caller is the intended recipient.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT le.entry_id, le.status, le.person_id,
                   le.created_by, le.direction, le.amount,
                   p.linked_user_id, p.owner_user_id, p.display_name
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s
            FOR UPDATE
            """,
            (entry_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Entry not found.")
        if row["status"] != "pending":
            raise ValueError("Entry is not pending.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to accept this entry.")
        cur.execute(
            "UPDATE Ledger_Entries SET status = 'active' WHERE entry_id = %s",
            (entry_id,),
        )
        conn.commit()
        # Fetch creator's name for the reciprocal People record
        cur.execute("SELECT name FROM Users WHERE user_id = %s", (row["created_by"],))
        creator = cur.fetchone()
        row["creator_name"] = creator["name"] if creator else "Unknown"
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def reject_entry(entry_id: int, recipient_user_id: int) -> dict:
    """
    Reject a pending entry. Sets status to 'rejected'.
    Creator can see it and delete/re-request.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT le.entry_id, le.status, le.person_id,
                   le.created_by, le.direction, le.amount,
                   p.linked_user_id, p.owner_user_id, p.display_name
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s
            FOR UPDATE
            """,
            (entry_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Entry not found.")
        if row["status"] != "pending":
            raise ValueError("Entry is not pending.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to reject this entry.")
        cur.execute(
            "UPDATE Ledger_Entries SET status = 'rejected' WHERE entry_id = %s",
            (entry_id,),
        )
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_pending_entries_for_user(linked_user_id: int) -> list[dict]:
    """Entries where this user is the linked recipient and status is pending."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT le.entry_id, le.direction, le.amount, le.note,
               le.entry_date, le.created_at,
               p.display_name AS person_name, p.person_id,
               u.name AS requested_by
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        JOIN   Users  u ON u.user_id   = le.created_by
        WHERE  p.linked_user_id = %s AND le.status = 'pending'
        ORDER  BY le.created_at DESC
        """,
        (linked_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount"]     = float(r["amount"])
        r["entry_date"] = str(r["entry_date"])
        r["created_at"] = str(r["created_at"])
    return rows


def record_entry_repayment(entry_id: int, owner_user_id: int, repayment_amount: float) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT le.entry_id, le.remaining_amount, le.status
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s AND p.owner_user_id = %s
            FOR UPDATE
            """,
            (entry_id, owner_user_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Entry not found or access denied.")
        if row["status"] == "repaid":
            raise ValueError("Entry is already fully settled.")
        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)
        if repay <= 0:
            raise ValueError("Repayment must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")
        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"
        cur.execute(
            "UPDATE Ledger_Entries SET remaining_amount = %s, status = %s WHERE entry_id = %s",
            (new_remaining, new_status, entry_id),
        )
        conn.commit()
        return {"entry_id": entry_id, "remaining_amount": new_remaining, "status": new_status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_entry_with_person(entry_id: int, user_id: int) -> dict | None:
    """Fetch entry details including person's linked_user_id for notification routing."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT le.entry_id, le.direction, le.amount, le.remaining_amount,
               le.status, p.linked_user_id, p.owner_user_id, p.display_name
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        WHERE  le.entry_id = %s
          AND  (p.owner_user_id = %s OR p.linked_user_id = %s)
        """,
        (entry_id, user_id, user_id),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    if row:
        row["amount"]           = float(row["amount"])
        row["remaining_amount"] = float(row["remaining_amount"])
    return row


def delete_entry(entry_id: int, owner_user_id: int) -> bool:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            DELETE le FROM Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s AND p.owner_user_id = %s
            """,
            (entry_id, owner_user_id),
        )
        deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()