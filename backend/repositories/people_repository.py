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
                    WHEN le.direction = 'lent'     AND le.status IN ('active','repaid') THEN  le.remaining_amount
                    WHEN le.direction = 'borrowed' AND le.status IN ('active','repaid') THEN -le.remaining_amount
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
               le.entry_date, le.status, le.created_at,
               le.created_by,
               (le.direction = 'lent') AS can_delete
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
        r["can_delete"]       = bool(r["can_delete"])
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
    cur  = conn.cursor(dictionary=True)
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

        # Fetch person to get display_name for the Loans/Borrows row
        cur.execute(
            "SELECT display_name, linked_user_id FROM People WHERE person_id = %s",
            (person_id,),
        )
        person = cur.fetchone()
        person_name = person["display_name"] if person else "Unknown"
        is_linked   = person["linked_user_id"] is not None if person else False

        # Only sync to Loans/Borrows immediately if NOT pending (custom person or no link)
        # If pending, the sync happens in accept_entry when the other user accepts
        if not is_pending:
            if direction == "lent":
                # Creator lent money → create a Loans row
                cur.execute(
                    """
                    INSERT INTO Loans
                        (lender_user_id, borrower_name, amount, remaining_amount, note, loan_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (created_by, person_name, amt, amt, note or None, entry_date),
                )
            else:
                # Creator borrowed money → create a Borrows row
                cur.execute(
                    """
                    INSERT INTO Borrows
                        (borrower_user_id, lender_name, amount, remaining_amount, note, borrow_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (created_by, person_name, amt, amt, note or None, entry_date),
                )

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
        cur.execute(
            "SELECT person_id FROM People WHERE owner_user_id = %s AND linked_user_id = %s",
            (owner_user_id, linked_user_id),
        )
        row = cur.fetchone()
        if row:
            return row["person_id"]
        cur.execute(
            "SELECT person_id FROM People WHERE owner_user_id = %s AND display_name = %s",
            (owner_user_id, display_name.strip()),
        )
        row = cur.fetchone()
        if row:
            # Link them now
            cur.execute(
                "UPDATE People SET linked_user_id = %s WHERE person_id = %s",
                (linked_user_id, row["person_id"]),
            )
            conn.commit()
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
    Also creates/finds the reciprocal People record and inserts a mirror Ledger_Entry
    for the accepting user so they can see it in their own People screen.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT le.entry_id, le.status, le.person_id,
                   le.created_by, le.direction, le.amount,
                   le.remaining_amount, le.note, le.entry_date,
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

        # 1. Mark the original entry active
        cur.execute(
            "UPDATE Ledger_Entries SET status = 'active' WHERE entry_id = %s",
            (entry_id,),
        )

        # 2. Fetch creator's name (needed below for reciprocal People record display_name)
        cur.execute("SELECT name FROM Users WHERE user_id = %s", (row["created_by"],))
        creator_row  = cur.fetchone()
        creator_name = creator_row["name"] if creator_row else "Unknown"

        # Fetch acceptor's name for notification message
        cur.execute("SELECT name FROM Users WHERE user_id = %s", (recipient_user_id,))
        acceptor = cur.fetchone()
        row["acceptor_name"] = acceptor["name"] if acceptor else "Unknown"

        # 3. Find or create reciprocal People record for the accepting user (user 2).
        #    CANONICAL lookup is by linked_user_id only — never fall back to a
        #    display_name match, since that creates duplicate People rows when
        #    names don't match exactly (whitespace, case, edited names, etc).
        #    A duplicate row is the root cause of "balance shows but ledger is empty"
        #    bugs: the mirror entry attaches to one row, the user views another.
        # Look up by linked_user_id first (canonical, avoids duplicate rows)
        cur.execute(
            """
            SELECT person_id FROM People
            WHERE owner_user_id = %s AND linked_user_id = %s
            """,
            (recipient_user_id, row["created_by"]),
        )
        recip_person = cur.fetchone()
        if not recip_person:
            # No linked record — check if an UNLINKED record with matching name exists
            # and upgrade it rather than creating a duplicate row
            cur.execute(
                """
                SELECT person_id FROM People
                WHERE owner_user_id = %s AND display_name = %s AND linked_user_id IS NULL
                """,
                (recipient_user_id, creator_name),
            )
            unlinked = cur.fetchone()
            if unlinked:
                # Upgrade: attach the linked_user_id to the existing row
                cur.execute(
                    "UPDATE People SET linked_user_id = %s WHERE person_id = %s",
                    (row["created_by"], unlinked["person_id"]),
                )
                recip_person_id = unlinked["person_id"]
            else:
                cur.execute(
                    "INSERT INTO People (owner_user_id, display_name, linked_user_id) VALUES (%s, %s, %s)",
                    (recipient_user_id, creator_name, row["created_by"]),
                )
                recip_person_id = cur.lastrowid
        else:
            recip_person_id = recip_person["person_id"]

        # 4. Check if a mirror Ledger_Entry already exists for user 2 (idempotent)
        cur.execute(
            """
            SELECT entry_id FROM Ledger_Entries
            WHERE person_id = %s AND created_by = %s
              AND amount = %s AND entry_date = %s
            LIMIT 1
            """,
            (recip_person_id, row["created_by"],
             float(row["amount"]), str(row["entry_date"])),
        )
        if not cur.fetchone():
            mirror_direction = "borrowed" if row["direction"] == "lent" else "lent"
            cur.execute(
                """
                INSERT INTO Ledger_Entries
                    (person_id, created_by, direction, amount, remaining_amount,
                     note, entry_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
                """,
                (
                    recip_person_id,
                    recipient_user_id,   # recipient owns this mirror entry
                    mirror_direction,
                    float(row["amount"]),
                    float(row["remaining_amount"]),
                    row["note"],
                    str(row["entry_date"]),
                ),
            )

        # 5. Sync to Loans / Borrows tables for the accepting user (user 2)
        #    direction='lent' by user 1 means user 2 borrowed
        #    direction='borrowed' by user 1 means user 2 lent
        amt = float(row["amount"])
        note = row["note"]
        entry_date = str(row["entry_date"])
        creator_id = row["created_by"]

        # creator_name was already fetched above — reuse it
        creator_display = creator_name

        # --- Sync Loans/Borrows for the ACCEPTOR (User 2) ---
        if row["direction"] == "lent":
            # User 1 lent → User 2 borrowed → User 2 needs a Borrows row
            cur.execute(
                """
                SELECT borrow_id FROM Borrows
                WHERE borrower_user_id = %s AND lender_name = %s
                  AND amount = %s AND borrow_date = %s
                LIMIT 1
                """,
                (recipient_user_id, creator_display, amt, entry_date),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO Borrows
                        (borrower_user_id, lender_name, amount, remaining_amount,
                         note, borrow_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (recipient_user_id, creator_display, amt, amt, note, entry_date),
                )
        else:
            # User 1 borrowed → User 2 lent → User 2 needs a Loans row
            cur.execute(
                """
                SELECT loan_id FROM Loans
                WHERE lender_user_id = %s AND borrower_name = %s
                  AND amount = %s AND loan_date = %s
                LIMIT 1
                """,
                (recipient_user_id, creator_display, amt, entry_date),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO Loans
                        (lender_user_id, borrower_name, amount, remaining_amount,
                         note, loan_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (recipient_user_id, creator_display, amt, amt, note, entry_date),
                )

        # --- Sync Loans/Borrows for the CREATOR ---
        cur.execute("SELECT name FROM Users WHERE user_id = %s", (recipient_user_id,))
        acceptor_user = cur.fetchone()
        acceptor_display = acceptor_user["name"] if acceptor_user else row["display_name"]

        if row["direction"] == "lent":
            # User 1 lent → User 1 needs a Loans row
            cur.execute(
                """
                SELECT loan_id FROM Loans
                WHERE lender_user_id = %s AND borrower_name = %s
                  AND amount = %s AND loan_date = %s
                LIMIT 1
                """,
                (creator_id, acceptor_display, amt, entry_date),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO Loans
                        (lender_user_id, borrower_name, amount, remaining_amount,
                         note, loan_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (creator_id, acceptor_display, amt, amt, note, entry_date),
                )
        else:
            # User 1 borrowed → User 1 needs a Borrows row
            cur.execute(
                """
                SELECT borrow_id FROM Borrows
                WHERE borrower_user_id = %s AND lender_name = %s
                  AND amount = %s AND borrow_date = %s
                LIMIT 1
                """,
                (creator_id, acceptor_display, amt, entry_date),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO Borrows
                        (borrower_user_id, lender_name, amount, remaining_amount,
                         note, borrow_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    """,
                    (creator_id, acceptor_display, amt, amt, note, entry_date),
                )

        conn.commit()
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


def fetch_sent_pending_entries(creator_user_id: int) -> list[dict]:
    """Entries created by this user that are still pending acceptance."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT le.entry_id, le.direction, le.amount, le.note,
               le.entry_date, le.created_at,
               p.display_name AS person_name, p.person_id,
               p.linked_user_id,
               u.name AS sent_to
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        LEFT JOIN Users u ON u.user_id = p.linked_user_id
        WHERE  le.created_by = %s
          AND  le.status = 'pending'
          AND  p.linked_user_id IS NOT NULL
        ORDER  BY le.created_at DESC
        """,
        (creator_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount"]     = float(r["amount"])
        r["entry_date"] = str(r["entry_date"])
        r["created_at"] = str(r["created_at"])
    return rows


def _find_mirror_entry_id(cur, owner_user_id, linked_user_id, direction, amount, entry_date):
    """
    Finds the reciprocal Ledger_Entries row on the linked user's side — same
    matching convention used elsewhere (accept_entry / delete_entry): scoped to
    the People pair, opposite direction, same amount + date.
    """
    if not linked_user_id:
        return None
    mirror_direction = "borrowed" if direction == "lent" else "lent"
    cur.execute(
        """
        SELECT le.entry_id
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        WHERE  p.owner_user_id = %s AND p.linked_user_id = %s
          AND  le.direction = %s AND le.amount = %s AND le.entry_date = %s
        LIMIT 1
        """,
        (linked_user_id, owner_user_id, mirror_direction, amount, entry_date),
    )
    row = cur.fetchone()
    return row["entry_id"] if row else None


def _sync_legacy_repayment(cur, owner_user_id, display_name, direction, amount, entry_date, new_remaining, new_status):
    """Best-effort sync of the legacy Loans/Borrows mirror row, matched the same
    way delete_loan/delete_borrow do (by name + amount + date)."""
    if direction == "lent":
        cur.execute(
            "UPDATE Loans SET remaining_amount = %s, status = %s "
            "WHERE lender_user_id = %s AND borrower_name = %s AND amount = %s AND loan_date = %s",
            (new_remaining, new_status, owner_user_id, display_name, amount, entry_date),
        )
    elif direction == "borrowed":
        cur.execute(
            "UPDATE Borrows SET remaining_amount = %s, status = %s "
            "WHERE borrower_user_id = %s AND lender_name = %s AND amount = %s AND borrow_date = %s",
            (new_remaining, new_status, owner_user_id, display_name, amount, entry_date),
        )


def propose_or_apply_repayment(
    entry_id: int,
    requester_user_id: int,
    repayment_amount: float,
    expected_direction: str | None = None,
    not_found_message: str = "Entry not found or access denied.",
) -> dict:
    """
    Canonical repayment entry point — used by the Loans/Borrows screens AND the
    People ledger screen, since entry_id is the same Ledger_Entries row either way.

    - Unlinked person: applies instantly (no counterparty to fake toward).
    - Linked person, requester is the CREDITOR on this row (direction='lent'):
      applies instantly — a creditor gains nothing by falsely reducing what's
      owed to them.
    - Linked person, requester is the DEBTOR on this row (direction='borrowed'):
      creates a pending Ledger_Repayments row instead of touching
      remaining_amount, awaiting the creditor's confirmation.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT le.entry_id, le.remaining_amount, le.status, le.direction,
                   le.amount, le.entry_date,
                   p.owner_user_id, p.linked_user_id, p.display_name
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s AND p.owner_user_id = %s
            FOR UPDATE
            """,
            (entry_id, requester_user_id),
        )
        row = cur.fetchone()
        if not row or (expected_direction and row["direction"] != expected_direction):
            raise ValueError(not_found_message)
        if row["status"] != "active":
            raise ValueError("Entry is not active.")

        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)
        if repay <= 0:
            raise ValueError("Repayment must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")

        is_linked   = row["linked_user_id"] is not None
        is_creditor = row["direction"] == "lent"

        if not is_linked or is_creditor:
            new_remaining = round(remaining - repay, 2)
            new_status    = "repaid" if new_remaining == 0 else "active"
            cur.execute(
                "UPDATE Ledger_Entries SET remaining_amount = %s, status = %s WHERE entry_id = %s",
                (new_remaining, new_status, entry_id),
            )
            _sync_legacy_repayment(
                cur, row["owner_user_id"], row["display_name"], row["direction"],
                float(row["amount"]), str(row["entry_date"]), new_remaining, new_status,
            )

            mirror_id = None
            if is_linked:
                mirror_id = _find_mirror_entry_id(
                    cur, row["owner_user_id"], row["linked_user_id"],
                    row["direction"], float(row["amount"]), str(row["entry_date"]),
                )
                if mirror_id:
                    cur.execute(
                        "UPDATE Ledger_Entries SET remaining_amount = %s, status = %s WHERE entry_id = %s",
                        (new_remaining, new_status, mirror_id),
                    )
                    cur.execute("SELECT name FROM Users WHERE user_id = %s", (row["owner_user_id"],))
                    owner_name_row = cur.fetchone()
                    owner_name = owner_name_row["name"] if owner_name_row else row["display_name"]
                    mirror_direction = "borrowed" if row["direction"] == "lent" else "lent"
                    _sync_legacy_repayment(
                        cur, row["linked_user_id"], owner_name, mirror_direction,
                        float(row["amount"]), str(row["entry_date"]), new_remaining, new_status,
                    )

            conn.commit()
            return {
                "entry_id": entry_id,
                "remaining_amount": new_remaining,
                "status": new_status,
                "pending_repayment": False,
                "linked_user_id": row["linked_user_id"],
                "mirror_entry_id": mirror_id,
            }

        # Linked + requester is the debtor → propose, don't apply yet.
        cur.execute(
            "INSERT INTO Ledger_Repayments (entry_id, proposed_by, amount, status) VALUES (%s, %s, %s, 'pending')",
            (entry_id, requester_user_id, repay),
        )
        repayment_id = cur.lastrowid
        conn.commit()
        return {
            "entry_id": entry_id,
            "repayment_id": repayment_id,
            "remaining_amount": remaining,
            "status": row["status"],
            "pending_repayment": True,
            "linked_user_id": row["linked_user_id"],
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def fetch_pending_repayments_for_user(recipient_user_id: int) -> list[dict]:
    """Repayments proposed by a debtor, awaiting this user's (the creditor's) confirmation."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT lr.repayment_id, lr.amount, lr.note, lr.created_at,
               le.entry_id, le.direction, le.entry_date,
               p.display_name AS person_name, p.person_id,
               u.name AS requested_by
        FROM   Ledger_Repayments lr
        JOIN   Ledger_Entries le ON le.entry_id = lr.entry_id
        JOIN   People p ON p.person_id = le.person_id
        JOIN   Users  u ON u.user_id   = lr.proposed_by
        WHERE  p.linked_user_id = %s AND lr.status = 'pending'
        ORDER  BY lr.created_at DESC
        """,
        (recipient_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount"]     = float(r["amount"])
        r["entry_date"] = str(r["entry_date"])
        r["created_at"] = str(r["created_at"])
    return rows


def fetch_sent_pending_repayments(proposer_user_id: int) -> list[dict]:
    """Repayments this user proposed, still awaiting the creditor's confirmation."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT lr.repayment_id, lr.amount, lr.note, lr.created_at,
               le.entry_id, le.direction, le.entry_date,
               p.display_name AS person_name, p.person_id, p.linked_user_id,
               u.name AS sent_to
        FROM   Ledger_Repayments lr
        JOIN   Ledger_Entries le ON le.entry_id = lr.entry_id
        JOIN   People p ON p.person_id = le.person_id
        LEFT JOIN Users u ON u.user_id = p.linked_user_id
        WHERE  lr.proposed_by = %s AND lr.status = 'pending'
        ORDER  BY lr.created_at DESC
        """,
        (proposer_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["amount"]     = float(r["amount"])
        r["entry_date"] = str(r["entry_date"])
        r["created_at"] = str(r["created_at"])
    return rows


def accept_repayment(repayment_id: int, recipient_user_id: int) -> dict:
    """Creditor confirms a debtor-proposed repayment — applies it to both mirrored rows."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT lr.repayment_id, lr.entry_id, lr.amount AS repay_amount, lr.status AS repay_status,
                   lr.proposed_by, le.remaining_amount, le.direction, le.entry_date,
                   le.amount AS entry_amount, p.owner_user_id, p.linked_user_id
            FROM   Ledger_Repayments lr
            JOIN   Ledger_Entries le ON le.entry_id = lr.entry_id
            JOIN   People p ON p.person_id = le.person_id
            WHERE  lr.repayment_id = %s
            FOR UPDATE
            """,
            (repayment_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Repayment request not found.")
        if row["repay_status"] != "pending":
            raise ValueError("This repayment has already been resolved.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to confirm this repayment.")

        remaining = float(row["remaining_amount"])
        repay     = float(row["repay_amount"])
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds current remaining ₹{remaining} — entry may have changed.")
        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"

        debtor_id   = row["owner_user_id"]
        creditor_id = row["linked_user_id"]

        cur.execute(
            "UPDATE Ledger_Entries SET remaining_amount = %s, status = %s WHERE entry_id = %s",
            (new_remaining, new_status, row["entry_id"]),
        )
        mirror_id = _find_mirror_entry_id(
            cur, debtor_id, creditor_id, row["direction"],
            float(row["entry_amount"]), str(row["entry_date"]),
        )
        if mirror_id:
            cur.execute(
                "UPDATE Ledger_Entries SET remaining_amount = %s, status = %s WHERE entry_id = %s",
                (new_remaining, new_status, mirror_id),
            )

        cur.execute(
            "UPDATE Ledger_Repayments SET status = 'accepted', resolved_at = NOW() WHERE repayment_id = %s",
            (repayment_id,),
        )

        cur.execute("SELECT name FROM Users WHERE user_id = %s", (debtor_id,))
        debtor_name_row = cur.fetchone()
        debtor_name = debtor_name_row["name"] if debtor_name_row else "Unknown"
        cur.execute("SELECT name FROM Users WHERE user_id = %s", (creditor_id,))
        creditor_name_row = cur.fetchone()
        creditor_name = creditor_name_row["name"] if creditor_name_row else "Unknown"

        amt        = float(row["entry_amount"])
        entry_date = str(row["entry_date"])
        cur.execute(
            "UPDATE Borrows SET remaining_amount = %s, status = %s "
            "WHERE borrower_user_id = %s AND lender_name = %s AND amount = %s AND borrow_date = %s",
            (new_remaining, new_status, debtor_id, creditor_name, amt, entry_date),
        )
        cur.execute(
            "UPDATE Loans SET remaining_amount = %s, status = %s "
            "WHERE lender_user_id = %s AND borrower_name = %s AND amount = %s AND loan_date = %s",
            (new_remaining, new_status, creditor_id, debtor_name, amt, entry_date),
        )

        conn.commit()
        return {
            "repayment_id": repayment_id,
            "entry_id": row["entry_id"],
            "remaining_amount": new_remaining,
            "status": new_status,
            "debtor_id": debtor_id,
            "creditor_id": creditor_id,
            "amount": repay,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def reject_repayment(repayment_id: int, recipient_user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT lr.repayment_id, lr.entry_id, lr.amount AS repay_amount, lr.status AS repay_status,
                   lr.proposed_by, p.owner_user_id, p.linked_user_id, p.display_name
            FROM   Ledger_Repayments lr
            JOIN   Ledger_Entries le ON le.entry_id = lr.entry_id
            JOIN   People p ON p.person_id = le.person_id
            WHERE  lr.repayment_id = %s
            FOR UPDATE
            """,
            (repayment_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Repayment request not found.")
        if row["repay_status"] != "pending":
            raise ValueError("This repayment has already been resolved.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to decline this repayment.")
        cur.execute(
            "UPDATE Ledger_Repayments SET status = 'rejected', resolved_at = NOW() WHERE repayment_id = %s",
            (repayment_id,),
        )
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def cancel_repayment(repayment_id: int, proposer_user_id: int) -> dict:
    """Debtor cancels their own still-pending repayment proposal."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            "SELECT repayment_id, status, proposed_by FROM Ledger_Repayments WHERE repayment_id = %s FOR UPDATE",
            (repayment_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Repayment request not found.")
        if row["proposed_by"] != proposer_user_id:
            raise ValueError("Not authorised to cancel this repayment.")
        if row["status"] != "pending":
            raise ValueError("This repayment has already been resolved.")
        cur.execute("DELETE FROM Ledger_Repayments WHERE repayment_id = %s", (repayment_id,))
        conn.commit()
        return {"cancelled": True}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def _apply_settlement(person_id: int, owner_user_id: int) -> dict:
    """
    Actually performs the settlement — marks all active entries as repaid and
    inserts a 'settlement' audit entry, mirrored to the linked user's side.
    Called either directly (creditor settling) or from accept_settlement
    (creditor confirming a debtor's settle-up proposal).
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        cur.execute(
            "SELECT person_id, display_name, linked_user_id FROM People WHERE person_id = %s AND owner_user_id = %s",
            (person_id, owner_user_id),
        )
        person = cur.fetchone()
        if not person:
            raise ValueError("Person not found.")

        cur.execute(
            """
            SELECT COALESCE(SUM(
                CASE
                    WHEN le.direction = 'lent'     THEN  le.remaining_amount
                    WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                    ELSE 0
                END
            ), 0) AS net_balance
            FROM Ledger_Entries le
            WHERE le.person_id = %s
              AND le.status = 'active'
              AND le.direction IN ('lent', 'borrowed')
            """,
            (person_id,),
        )
        net_row = cur.fetchone()
        net = float(net_row["net_balance"]) if net_row else 0.0

        if abs(net) < 0.005:
            raise ValueError("Already settled — net balance is zero.")

        settlement_amount = round(abs(net), 2)
        today = __import__('datetime').date.today().isoformat()

        cur.execute(
            """
            UPDATE Ledger_Entries
            SET status = 'repaid', remaining_amount = 0
            WHERE person_id = %s AND status = 'active'
            """,
            (person_id,),
        )

        cur.execute(
            """
            INSERT INTO Ledger_Entries
                (person_id, created_by, direction, amount, remaining_amount,
                 note, entry_date, status)
            VALUES (%s, %s, 'settlement', %s, 0, %s, %s, 'repaid')
            """,
            (
                person_id, owner_user_id,
                settlement_amount,
                f"Net settlement — {'paid' if net < 0 else 'received'} ₹{settlement_amount:,.0f}",
                today,
            ),
        )
        entry_id = cur.lastrowid

        linked_user_id = person["linked_user_id"]
        if linked_user_id:
            cur.execute(
                """
                SELECT p.person_id FROM People p
                WHERE p.owner_user_id = %s AND p.linked_user_id = %s
                """,
                (linked_user_id, owner_user_id),
            )
            mirror_person = cur.fetchone()
            if mirror_person:
                mirror_person_id = mirror_person["person_id"]
                cur.execute(
                    """
                    UPDATE Ledger_Entries
                    SET status = 'repaid', remaining_amount = 0
                    WHERE person_id = %s AND status = 'active'
                    """,
                    (mirror_person_id,),
                )
                cur.execute(
                    """
                    INSERT INTO Ledger_Entries
                        (person_id, created_by, direction, amount, remaining_amount,
                         note, entry_date, status)
                    VALUES (%s, %s, 'settlement', %s, 0, %s, %s, 'repaid')
                    """,
                    (
                        mirror_person_id, owner_user_id,
                        settlement_amount,
                        f"Net settlement — {'received' if net < 0 else 'paid'} ₹{settlement_amount:,.0f}",
                        today,
                    ),
                )

        conn.commit()
        return {
            "settled_amount": settlement_amount,
            "net_was": net,
            "entry_id": entry_id,
            "linked_user_id": linked_user_id,
        }
    except ValueError:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def propose_or_apply_settlement(person_id: int, requester_user_id: int) -> dict:
    """
    Canonical Settle Up entry point.
    - Unlinked person, or requester is the net CREDITOR (owed money): applies
      instantly — safe, since the requester isn't the one erasing their own debt.
    - Linked person, requester is the net DEBTOR (owes money): creates a pending
      Ledger_Settlement_Requests row instead, awaiting the creditor's confirmation.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT person_id, linked_user_id FROM People WHERE person_id = %s AND owner_user_id = %s",
            (person_id, requester_user_id),
        )
        person = cur.fetchone()
        if not person:
            raise ValueError("Person not found.")

        cur.execute(
            """
            SELECT COALESCE(SUM(
                CASE
                    WHEN le.direction = 'lent'     THEN  le.remaining_amount
                    WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                    ELSE 0
                END
            ), 0) AS net_balance
            FROM Ledger_Entries le
            WHERE le.person_id = %s AND le.status = 'active' AND le.direction IN ('lent', 'borrowed')
            """,
            (person_id,),
        )
        net_row = cur.fetchone()
        net = float(net_row["net_balance"]) if net_row else 0.0
        if abs(net) < 0.005:
            raise ValueError("Already settled — net balance is zero.")

        is_linked = person["linked_user_id"] is not None

        if not is_linked or net > 0:
            cur.close(); conn.close()
            result = _apply_settlement(person_id, requester_user_id)
            result["pending_settlement"] = False
            return result

        # Requester is the net debtor on a linked person → propose, don't apply.
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Ledger_Settlement_Requests (person_id, proposed_by, net_amount, status) VALUES (%s, %s, %s, 'pending')",
            (person_id, requester_user_id, round(abs(net), 2)),
        )
        request_id = cur.lastrowid
        conn.commit()
        return {
            "pending_settlement": True,
            "request_id": request_id,
            "net_amount": round(abs(net), 2),
            "linked_user_id": person["linked_user_id"],
        }
    except Exception:
        try: conn.rollback()
        except: pass
        raise
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass


def fetch_pending_settlements_for_user(recipient_user_id: int) -> list[dict]:
    """Settle-up proposals from a debtor, awaiting this user's (the creditor's) confirmation."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT lsr.request_id, lsr.net_amount, lsr.created_at,
               p.display_name AS person_name, p.person_id,
               u.name AS requested_by
        FROM   Ledger_Settlement_Requests lsr
        JOIN   People p ON p.person_id = lsr.person_id
        JOIN   Users  u ON u.user_id   = lsr.proposed_by
        WHERE  p.linked_user_id = %s AND lsr.status = 'pending'
        ORDER  BY lsr.created_at DESC
        """,
        (recipient_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["net_amount"] = float(r["net_amount"])
        r["created_at"] = str(r["created_at"])
    return rows


def fetch_sent_settlements(proposer_user_id: int) -> list[dict]:
    """Settle-up proposals this user made, still awaiting the creditor's confirmation."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT lsr.request_id, lsr.net_amount, lsr.created_at,
               p.display_name AS person_name, p.person_id, p.linked_user_id,
               u.name AS sent_to
        FROM   Ledger_Settlement_Requests lsr
        JOIN   People p ON p.person_id = lsr.person_id
        LEFT JOIN Users u ON u.user_id = p.linked_user_id
        WHERE  lsr.proposed_by = %s AND lsr.status = 'pending'
        ORDER  BY lsr.created_at DESC
        """,
        (proposer_user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["net_amount"] = float(r["net_amount"])
        r["created_at"] = str(r["created_at"])
    return rows


def accept_settlement(request_id: int, recipient_user_id: int) -> dict:
    """
    Creditor confirms a debtor-proposed settle-up. Applies via the creditor's own
    People row (so both mirrored sides settle correctly) — net is recomputed fresh
    at accept time rather than trusting the proposal-time snapshot.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT lsr.request_id, lsr.status, lsr.proposed_by, p.linked_user_id
            FROM   Ledger_Settlement_Requests lsr
            JOIN   People p ON p.person_id = lsr.person_id
            WHERE  lsr.request_id = %s
            FOR UPDATE
            """,
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Settlement request not found.")
        if row["status"] != "pending":
            raise ValueError("This settlement request has already been resolved.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to confirm this settlement.")

        proposer_id = row["proposed_by"]
        cur.execute(
            "SELECT person_id FROM People WHERE owner_user_id = %s AND linked_user_id = %s",
            (recipient_user_id, proposer_id),
        )
        recip_person = cur.fetchone()
        if not recip_person:
            raise ValueError("Could not locate your ledger record for this person.")

        cur.execute(
            "UPDATE Ledger_Settlement_Requests SET status = 'accepted', resolved_at = NOW() WHERE request_id = %s",
            (request_id,),
        )
        conn.commit()
        cur.close(); conn.close()

        settle_result = _apply_settlement(recip_person["person_id"], recipient_user_id)
        settle_result["debtor_id"] = proposer_id
        settle_result["creditor_id"] = recipient_user_id
        return settle_result
    except Exception:
        try: conn.rollback()
        except: pass
        raise
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass


def reject_settlement(request_id: int, recipient_user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT lsr.request_id, lsr.status, lsr.proposed_by, lsr.net_amount, p.linked_user_id
            FROM   Ledger_Settlement_Requests lsr
            JOIN   People p ON p.person_id = lsr.person_id
            WHERE  lsr.request_id = %s
            FOR UPDATE
            """,
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Settlement request not found.")
        if row["status"] != "pending":
            raise ValueError("This settlement request has already been resolved.")
        if row["linked_user_id"] != recipient_user_id:
            raise ValueError("Not authorised to decline this settlement.")
        cur.execute(
            "UPDATE Ledger_Settlement_Requests SET status = 'rejected', resolved_at = NOW() WHERE request_id = %s",
            (request_id,),
        )
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def cancel_settlement(request_id: int, proposer_user_id: int) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            "SELECT request_id, status, proposed_by FROM Ledger_Settlement_Requests WHERE request_id = %s FOR UPDATE",
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Settlement request not found.")
        if row["proposed_by"] != proposer_user_id:
            raise ValueError("Not authorised to cancel this settlement.")
        if row["status"] != "pending":
            raise ValueError("This settlement request has already been resolved.")
        cur.execute("DELETE FROM Ledger_Settlement_Requests WHERE request_id = %s", (request_id,))
        conn.commit()
        return {"cancelled": True}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def repair_duplicate_people_for_user(owner_user_id: int) -> dict:
    """
    One-time repair: finds People rows for owner_user_id that share the same
    linked_user_id (duplicates), merges all Ledger_Entries onto the oldest
    row, and deletes the newer duplicate rows.
    Call this once via a maintenance endpoint or script, not on every request.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT linked_user_id, GROUP_CONCAT(person_id ORDER BY person_id) AS ids
            FROM People
            WHERE owner_user_id = %s AND linked_user_id IS NOT NULL
            GROUP BY linked_user_id
            HAVING COUNT(*) > 1
            """,
            (owner_user_id,),
        )
        dupes = cur.fetchall()
        merged = 0
        for d in dupes:
            ids = [int(x) for x in d["ids"].split(",")]
            keep_id, *drop_ids = ids
            for drop_id in drop_ids:
                cur.execute(
                    "UPDATE Ledger_Entries SET person_id = %s WHERE person_id = %s",
                    (keep_id, drop_id),
                )
                cur.execute("DELETE FROM People WHERE person_id = %s", (drop_id,))
                merged += 1
        conn.commit()
        return {"duplicates_merged": merged}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def get_user_net_balance(user_id: int) -> float:
    """
    Returns the true net balance for a user across all their Ledger_Entries.
    Positive = they are owed money. Negative = they owe money.
    Based on direction (lent/borrowed), NOT created_by.
    """
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        SELECT COALESCE(SUM(
            CASE
                WHEN le.direction = 'lent'     THEN  le.remaining_amount
                WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                ELSE 0
            END
        ), 0) AS net_balance
        FROM Ledger_Entries le
        JOIN People p ON p.person_id = le.person_id
        WHERE p.owner_user_id = %s
          AND le.status = 'active'
        """,
        (user_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return float(row[0] if row else 0)


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


def delete_entry(entry_id: int, owner_user_id: int) -> dict:
    """
    The party with a positive net balance against this person may delete an entry.
    Net balance is computed across ALL active entries between these two users.
    If net > 0 (owner is owed more than they owe), they may delete.
    Removes mirror entry + synced Loans/Borrows rows atomically.
    Returns dict with deletion info for notification routing.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Fetch full entry details
        cur.execute(
            """
            SELECT le.entry_id, le.created_by, le.amount, le.entry_date,
                   le.direction, le.note, le.status,
                   p.owner_user_id, p.linked_user_id, p.display_name,
                   p.person_id
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s AND p.owner_user_id = %s
            """,
            (entry_id, owner_user_id),
        )
        row = cur.fetchone()
        if not row:
            return {"deleted": False, "linked_user_id": None}

        linked_user_id = row["linked_user_id"]

        # Compute net balance for this owner against this person
        # net > 0 means owner is owed money (has positive balance) → may delete
        # For unlinked persons (no registered counterpart), fall back to per-entry lender rule
        if linked_user_id:
            cur.execute(
                """
                SELECT COALESCE(SUM(
                    CASE
                        WHEN le.direction = 'lent'     THEN  le.remaining_amount
                        WHEN le.direction = 'borrowed' THEN -le.remaining_amount
                        ELSE 0
                    END
                ), 0) AS net_balance
                FROM Ledger_Entries le
                JOIN People p ON p.person_id = le.person_id
                WHERE p.owner_user_id = %s
                  AND p.linked_user_id = %s
                  AND le.status IN ('active', 'repaid')
                """,
                (owner_user_id, linked_user_id),
            )
            net_row = cur.fetchone()
            net_balance = float(net_row["net_balance"]) if net_row else 0.0
            if net_balance <= 0:
                raise ValueError(
                    "Only the party who is owed money can delete this entry. "
                    "Your net balance with this person is not positive."
                )
        else:
            # Unlinked person — use per-entry lender rule (no counterpart to protect)
            if row["direction"] != "lent":
                raise ValueError("Only the lender can delete this entry.")

        linked_user_id = row["linked_user_id"]
        amt            = float(row["amount"])
        entry_date     = str(row["entry_date"])
        direction      = row["direction"]

        # Delete the primary entry
        cur.execute("DELETE FROM Ledger_Entries WHERE entry_id = %s", (entry_id,))

        # Delete mirror entry on the linked user's People screen.
        # Match by: linked user owns it, same amount, same date, opposite direction.
        if linked_user_id:
            mirror_direction = "borrowed" if direction == "lent" else "lent"
            cur.execute(
                """
                DELETE le FROM Ledger_Entries le
                JOIN   People p ON p.person_id = le.person_id
                WHERE  p.owner_user_id  = %s
                  AND  p.linked_user_id = %s
                  AND  le.direction     = %s
                  AND  le.amount        = %s
                  AND  le.entry_date    = %s
                """,
                (linked_user_id, owner_user_id, mirror_direction, amt, entry_date),
            )

        # If this was an accepted (active) linked entry, also clean up
        # the synced Loans/Borrows rows for both users
        if linked_user_id and row["status"] == "active":
            # Fetch creator's display name for matching Borrows row on linked user's side
            cur.execute("SELECT name FROM Users WHERE user_id = %s", (owner_user_id,))
            creator_user = cur.fetchone()
            creator_name = creator_user["name"] if creator_user else row["display_name"]

            # Fetch linked user's display name for matching creator's Loans/Borrows row
            cur.execute("SELECT name FROM Users WHERE user_id = %s", (linked_user_id,))
            linked_user = cur.fetchone()
            linked_name = linked_user["name"] if linked_user else "Unknown"

            if direction == "lent":
                # Creator had a Loans row (they lent), linked user had a Borrows row
                cur.execute(
                    "DELETE FROM Loans WHERE lender_user_id = %s AND borrower_name = %s AND amount = %s AND loan_date = %s",
                    (owner_user_id, linked_name, amt, entry_date),
                )
                cur.execute(
                    "DELETE FROM Borrows WHERE borrower_user_id = %s AND lender_name = %s AND amount = %s AND borrow_date = %s",
                    (linked_user_id, creator_name, amt, entry_date),
                )
            else:
                # Creator had a Borrows row, linked user had a Loans row
                cur.execute(
                    "DELETE FROM Borrows WHERE borrower_user_id = %s AND lender_name = %s AND amount = %s AND borrow_date = %s",
                    (owner_user_id, linked_name, amt, entry_date),
                )
                cur.execute(
                    "DELETE FROM Loans WHERE lender_user_id = %s AND borrower_name = %s AND amount = %s AND loan_date = %s",
                    (linked_user_id, creator_name, amt, entry_date),
                )

        conn.commit()
        return {
            "deleted": True,
            "linked_user_id": linked_user_id,
            "amount": amt,
            "direction": direction,
            "display_name": row["display_name"],
            "was_active": row["status"] == "active",
        }
    except ValueError:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()