# backend/repositories/borrow_repository.py
from core.database import get_connection


def insert_borrow(
    borrower_user_id: int,
    lender_name:      str,
    amount:           float,
    note:             str | None,
    borrow_date:      str,
    linked_user_id:   int | None = None,
) -> dict:
    """
    Creates the Ledger_Entry — the single source of truth for this borrow.
    If linked_user_id is set, the entry starts 'pending' until the lender
    accepts it via people_repository.accept_entry.

    NOTE: Loans/Borrows are no longer written here. Ledger_Entries +
    People is the only storage; "borrow_id" in the response is the
    Ledger_Entries.entry_id, kept under this key name for API
    compatibility with existing frontend callers.
    """
    from repositories.loan_repository import _upsert_person_and_entry
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        amt    = round(float(amount), 2)
        status = 'pending' if linked_user_id else 'active'

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
        return {"borrow_id": entry_id, "entry_id": entry_id, "status": status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def record_borrow_repayment(borrow_id: int, user_id: int, repayment_amount: float, repayment_date: str | None = None) -> dict:
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
        repayment_date      = repayment_date,
    )
    result["borrow_id"] = result.pop("entry_id")
    return result


def delete_borrow(borrow_id: int, user_id: int) -> dict:
    """
    Deletes the Ledger_Entry backing this borrow. `borrow_id` is actually
    Ledger_Entries.entry_id (see fetch_borrows_with_pending, which aliases
    entry_id AS borrow_id) — delegates to the canonical entry-deletion path
    in people_repository, the same one the People tab already uses.

    Behavior note: people_repository.delete_entry's unlinked-person rule
    only allows deleting direction='lent' entries (no counterparty to
    protect otherwise a borrower could unilaterally erase their own debt).
    A Borrows-sourced entry is always direction='borrowed', so an unlinked
    borrow is no longer deletable through this endpoint at all. This is
    not a behavior change for any user: neither LoansScreen.jsx (mobile)
    nor Loans.jsx (web) ever rendered a delete button for a borrow item
    (both gate the button on `isLent`), and the People tab's own
    `can_delete` column has always been `direction = 'lent'` regardless
    of link status. The old permissive path here was unreachable dead code.
    """
    from repositories.people_repository import delete_entry
    return delete_entry(borrow_id, user_id)