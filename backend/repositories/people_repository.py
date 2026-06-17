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
               le.entry_date, le.status, le.created_at,
               le.created_by,
               (le.direction = 'lent') AS can_delete
        FROM   Ledger_Entries le
        JOIN   People p ON p.person_id = le.person_id
        WHERE  le.person_id = %s AND p.owner_user_id = %s
        ORDER  BY le.entry_date DESC, le.entry_id DESC
        """,
        (owner_user_id, person_id, owner_user_id),
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
        cur.execute(
            """
            SELECT person_id FROM People
            WHERE owner_user_id = %s AND linked_user_id = %s
            """,
            (recipient_user_id, row["created_by"]),
        )
        recip_person = cur.fetchone()
        if not recip_person:
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
                    row["created_by"],
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
    Only the original creator (created_by) may delete an entry.
    Removes mirror entry + synced Loans/Borrows rows atomically.
    Returns dict with deletion info for notification routing.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Verify caller is the creator and fetch details for notification
        cur.execute(
            """
            SELECT le.entry_id, le.created_by, le.amount, le.entry_date,
                   le.direction, le.note, le.status,
                   p.owner_user_id, p.linked_user_id, p.display_name
            FROM   Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.entry_id = %s
            """,
            (entry_id,),
        )
        row = cur.fetchone()
        if not row:
            return {"deleted": False, "linked_user_id": None}
        cur.execute(
            """
            SELECT le.direction FROM Ledger_Entries le
            JOIN People p ON p.person_id = le.person_id
            WHERE le.entry_id = %s AND p.owner_user_id = %s
            """,
            (entry_id, owner_user_id),
        )
        perm_row = cur.fetchone()
        if not perm_row or perm_row["direction"] != "lent":
            raise ValueError("Only the lender can delete this entry.")

        linked_user_id = row["linked_user_id"]
        amt            = float(row["amount"])
        entry_date     = str(row["entry_date"])
        direction      = row["direction"]

        # Delete the primary entry
        cur.execute("DELETE FROM Ledger_Entries WHERE entry_id = %s", (entry_id,))

        # Delete mirror entry on the other user's People screen
        cur.execute(
            """
            DELETE le FROM Ledger_Entries le
            JOIN   People p ON p.person_id = le.person_id
            WHERE  le.created_by = %s
              AND  le.amount     = %s
              AND  le.entry_date = %s
              AND  le.entry_id  != %s
              AND  p.owner_user_id != %s
            """,
            (row["created_by"], amt, entry_date, entry_id, owner_user_id),
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