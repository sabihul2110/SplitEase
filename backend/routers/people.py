"""
People / Ledger routes.
Route order matters — static paths before dynamic {person_id} paths.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from schemas.people import PersonCreate, EntryCreate, EntryRepay
from repositories import people_repository, push_repository, ledger_notification_repository, notification_repository
from services.push_service import send_push
from core.dependencies import get_current_user

router = APIRouter()


# ── Static routes first (must be before any {person_id} dynamic routes) ──────

@router.get("/people/pending-requests")
def get_pending_requests(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_pending_entries_for_user(current_user["user_id"])

@router.post("/people/{person_id}/settle")
def settle_up(
    person_id:        int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        result = people_repository.propose_or_apply_settlement(person_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    linked_user_id = result.get("linked_user_id")
    if not linked_user_id:
        return {"message": "Settled up.", "settled_amount": result.get("settled_amount")}

    sender_name = notification_repository.get_user_name(current_user["user_id"])

    if result.get("pending_settlement"):
        msg = f"{sender_name} wants to settle up — net ₹{result['net_amount']:,.0f}. Please confirm."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "settlement_request",
            message      = msg,
            entry_id     = None,
        )
        token = push_repository.get_push_token(linked_user_id)
        background_tasks.add_task(
            send_push, token, "Settle Up — Confirmation Needed", msg,
            {"request_id": result.get("request_id"), "screen": "PendingRequests"},
        )
        return {
            "message": "Settlement request sent — awaiting their confirmation.",
            "pending_settlement": True,
            "request_id": result.get("request_id"),
        }

    amt     = result["settled_amount"]
    net_was = result["net_was"]
    msg = (
        f"{sender_name} marked your ledger as settled. "
        f"Net ₹{amt:,.0f} {'paid to them' if net_was > 0 else 'received from them'}."
    )
    ledger_notification_repository.create_ledger_notif(
        recipient_id = linked_user_id,
        sender_id    = current_user["user_id"],
        notif_type   = "settlement_confirmed",
        message      = msg,
        entry_id     = None,
    )
    token = push_repository.get_push_token(linked_user_id)
    background_tasks.add_task(send_push, token, "Ledger Settled", msg, {})
    return {"message": "Settled up.", "settled_amount": amt}


@router.get("/people/pending-settlements")
def get_pending_settlements(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_pending_settlements_for_user(current_user["user_id"])


@router.get("/people/sent-settlements")
def get_sent_settlements(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_sent_settlements(current_user["user_id"])


@router.post("/people/settlements/{request_id}/accept")
def accept_settlement_route(
    request_id:        int,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    try:
        result = people_repository.accept_settlement(request_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    acceptor_name = notification_repository.get_user_name(current_user["user_id"])
    msg = f"{acceptor_name} confirmed your settle-up — net ₹{result['settled_amount']:,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = result["debtor_id"],
        sender_id    = current_user["user_id"],
        notif_type   = "settlement_confirmed",
        message      = msg,
        entry_id     = None,
    )
    token = push_repository.get_push_token(result["debtor_id"])
    background_tasks.add_task(send_push, token, "Settlement Confirmed", msg, {})
    return {"message": "Settlement confirmed.", "settled_amount": result["settled_amount"]}


@router.post("/people/settlements/{request_id}/reject")
def reject_settlement_route(
    request_id:        int,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    try:
        row = people_repository.reject_settlement(request_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    decliner_name = notification_repository.get_user_name(current_user["user_id"])
    msg = f"{decliner_name} declined your settle-up request of ₹{float(row['net_amount']):,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["proposed_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "settlement_declined",
        message      = msg,
        entry_id     = None,
    )
    token = push_repository.get_push_token(row["proposed_by"])
    background_tasks.add_task(send_push, token, "Settlement Declined", msg, {})
    return {"message": "Settlement declined."}


@router.delete("/people/settlements/{request_id}")
def cancel_settlement_route(
    request_id:   int,
    current_user: dict = Depends(get_current_user),
):
    try:
        people_repository.cancel_settlement(request_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"message": "Settlement request cancelled."}


@router.get("/people/sent-requests")
def get_sent_requests(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_sent_pending_entries(current_user["user_id"])

@router.get("/people/pending-repayments")
def get_pending_repayments(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_pending_repayments_for_user(current_user["user_id"])


@router.get("/people/sent-repayments")
def get_sent_repayments(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_sent_pending_repayments(current_user["user_id"])


@router.post("/people/repayments/{repayment_id}/accept")
def accept_repayment_route(
    repayment_id:     int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        result = people_repository.accept_repayment(repayment_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    acceptor_name = notification_repository.get_user_name(current_user["user_id"])
    msg = f"{acceptor_name} confirmed your repayment of ₹{result['amount']:,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = result["debtor_id"],
        sender_id    = current_user["user_id"],
        notif_type   = "repayment_confirmed",
        message      = msg,
        entry_id     = result["entry_id"],
    )
    token = push_repository.get_push_token(result["debtor_id"])
    background_tasks.add_task(send_push, token, "Repayment Confirmed", msg, {"entry_id": result["entry_id"]})
    return {"message": "Repayment confirmed.", "remaining_amount": result["remaining_amount"], "status": result["status"]}


@router.post("/people/repayments/{repayment_id}/reject")
def reject_repayment_route(
    repayment_id:     int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        row = people_repository.reject_repayment(repayment_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    decliner_name = notification_repository.get_user_name(current_user["user_id"])
    msg = f"{decliner_name} declined your repayment of ₹{float(row['repay_amount']):,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["proposed_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "repayment_declined",
        message      = msg,
        entry_id     = row["entry_id"],
    )
    token = push_repository.get_push_token(row["proposed_by"])
    background_tasks.add_task(send_push, token, "Repayment Declined", msg, {"entry_id": row["entry_id"]})
    return {"message": "Repayment declined."}


@router.delete("/people/repayments/{repayment_id}")
def cancel_repayment_route(
    repayment_id: int,
    current_user: dict = Depends(get_current_user),
):
    try:
        people_repository.cancel_repayment(repayment_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"message": "Repayment request cancelled."}


# ── People CRUD ───────────────────────────────────────────────────────────────

@router.get("/people/")
def list_people(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_people(current_user["user_id"])


@router.post("/people/", status_code=status.HTTP_201_CREATED)
def create_person(
    body: PersonCreate,
    current_user: dict = Depends(get_current_user),
):
    if not body.display_name.strip():
        raise HTTPException(status_code=422, detail="Person name is required.")
    try:
        new_id = people_repository.insert_person(
            owner_user_id  = current_user["user_id"],
            display_name   = body.display_name,
            linked_user_id = body.linked_user_id,
        )
    except Exception as exc:
        if "1062" in str(exc):
            raise HTTPException(
                status_code=409,
                detail=f"A person named '{body.display_name.strip()}' already exists.",
            )
        raise
    return {"person_id": new_id, "message": "Person created."}


# ── Entry static routes (before {person_id} dynamic routes) ──────────────────

@router.post("/people/entries/{entry_id}/accept")
def accept_entry(
    entry_id:         int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        row = people_repository.accept_entry(entry_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    acceptor_name = row.get("acceptor_name") or row["display_name"]
    msg = f"{acceptor_name} accepted your ledger entry of ₹{float(row['amount']):,.0f}."

    # Ledger notification → drives the red dot on User 1's Loans tab
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "entry_accepted",
        message      = msg,
        entry_id     = entry_id,
    )
    # Main notification → User 1 sees it in their bell with full message
    notification_repository.create_ledger_outcome_notification(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        message      = msg,
    )
    creator_token = push_repository.get_push_token(row["created_by"])
    background_tasks.add_task(
        send_push, creator_token, "Entry Accepted", msg, {"entry_id": entry_id}
    )
    return {"message": "Entry accepted."}


@router.post("/people/entries/{entry_id}/reject")
def reject_entry(
    entry_id:         int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        row = people_repository.reject_entry(entry_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    msg = f"{row['display_name']} declined your ledger entry of ₹{float(row['amount']):,.0f}."

    
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "entry_rejected",
        message      = msg,
        entry_id     = entry_id,
    )
    
    notification_repository.create_ledger_outcome_notification(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        message      = msg,
    )
    creator_token = push_repository.get_push_token(row["created_by"])
    background_tasks.add_task(
        send_push, creator_token, "Entry Rejected", msg, {"entry_id": entry_id}
    )
    return {"message": "Entry rejected."}


@router.post("/people/entries/{entry_id}/repay")
def repay_entry(
    entry_id:         int,
    body:             EntryRepay,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = people_repository.propose_or_apply_repayment(
            entry_id          = entry_id,
            requester_user_id = current_user["user_id"],
            repayment_amount  = body.repayment_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    linked_user_id = result.get("linked_user_id")
    if linked_user_id:
        sender_name = notification_repository.get_user_name(current_user["user_id"])
        if result.get("pending_repayment"):
            msg = f"{sender_name} recorded a repayment of ₹{body.repayment_amount:,.0f} — please confirm."
            ledger_notification_repository.create_ledger_notif(
                recipient_id = linked_user_id,
                sender_id    = current_user["user_id"],
                notif_type   = "repayment_request",
                message      = msg,
                entry_id     = entry_id,
            )
            token = push_repository.get_push_token(linked_user_id)
            background_tasks.add_task(
                send_push, token, "Repayment Awaiting Confirmation", msg,
                {"repayment_id": result.get("repayment_id"), "screen": "PendingRequests"},
            )
        else:
            msg = f"₹{body.repayment_amount:,.0f} repayment recorded on your shared ledger entry."
            ledger_notification_repository.create_ledger_notif(
                recipient_id = linked_user_id,
                sender_id    = current_user["user_id"],
                notif_type   = "repayment_recorded",
                message      = msg,
                entry_id     = entry_id,
            )
            token = push_repository.get_push_token(linked_user_id)
            background_tasks.add_task(send_push, token, "Repayment Recorded", msg, {"entry_id": entry_id})
    return result


@router.delete("/people/entries/{entry_id}")
def delete_entry(
    entry_id:         int,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    try:
        result = people_repository.delete_entry(entry_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    if not result.get("deleted"):
        raise HTTPException(status_code=404, detail="Entry not found.")

    # Notify the other party if this was an accepted shared entry
    linked_user_id = result.get("linked_user_id")
    if linked_user_id and result.get("was_active"):
        amt       = result["amount"]
        direction = result["direction"]
        name      = result["display_name"]
        dir_label    = "lent you" if direction == "lent" else "you lent them"
        sender_name  = notification_repository.get_user_name(current_user["user_id"])
        msg          = f"{sender_name} removed the shared ledger entry of ₹{amt:,.0f} ({dir_label})."

        ledger_notification_repository.create_ledger_notif(
            recipient_id = linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "entry_deleted",
            message      = msg,
            entry_id     = None,
        )
        notification_repository.create_ledger_outcome_notification(
            recipient_id = linked_user_id,
            sender_id    = current_user["user_id"],
            message      = msg,
        )
        other_token = push_repository.get_push_token(linked_user_id)
        background_tasks.add_task(
            send_push, other_token, "Entry Removed", msg, {}
        )

    return {"message": "Entry deleted."}


# ── Dynamic {person_id} routes (must be last) ─────────────────────────────────

@router.get("/people/{person_id}")
def get_person(
    person_id: int,
    current_user: dict = Depends(get_current_user),
):
    person = people_repository.fetch_person(person_id, current_user["user_id"])
    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")
    return person


@router.delete("/people/{person_id}")
def delete_person(
    person_id: int,
    current_user: dict = Depends(get_current_user),
):
    deleted = people_repository.delete_person(person_id, current_user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Person not found.")
    return {"message": "Person and all their entries deleted."}


@router.get("/people/{person_id}/entries")
def list_entries(
    person_id: int,
    current_user: dict = Depends(get_current_user),
):
    person = people_repository.fetch_person(person_id, current_user["user_id"])
    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")
    return people_repository.fetch_entries(person_id, current_user["user_id"])


@router.post("/people/{person_id}/entries", status_code=status.HTTP_201_CREATED)
def add_entry(
    person_id:        int,
    body:             EntryCreate,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    if body.direction not in ("lent", "borrowed"):
        raise HTTPException(status_code=422, detail="direction must be 'lent' or 'borrowed'.")
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    person = people_repository.fetch_person(person_id, current_user["user_id"])
    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")

    is_pending     = person["linked_user_id"] is not None
    linked_user_id = person["linked_user_id"]

    new_id = people_repository.insert_entry(
        person_id  = person_id,
        created_by = current_user["user_id"],
        direction  = body.direction,
        amount     = body.amount,
        note       = body.note,
        entry_date = body.entry_date,
        is_pending = is_pending,
    )

    if is_pending and linked_user_id:
        dir_label   = "lent you" if body.direction == "lent" else "borrowed from you"
        sender_name = body.sender_name or "Someone"
        msg         = f"{sender_name} recorded ₹{body.amount:,.0f} — {dir_label}. Please accept or reject."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "entry_request",
            message      = msg,
            entry_id     = new_id,
        )
        recipient_token = push_repository.get_push_token(linked_user_id)
        background_tasks.add_task(
            send_push,
            recipient_token,
            "New Ledger Request",
            msg,
            {"entry_id": new_id, "screen": "PendingRequests"},
        )

    return {"entry_id": new_id, "message": "Entry recorded.", "is_pending": is_pending}