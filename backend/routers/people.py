# SplitEase/backend/routers/people.py


"""
People / Ledger routes.

People (person contact book):
  GET    /people/                        → list all people with net balances
  POST   /people/                        → create a person
  GET    /people/{person_id}             → get single person
  DELETE /people/{person_id}             → delete person + all their entries

Ledger entries (per person):
  GET    /people/{person_id}/entries          → list all entries for a person
  POST   /people/{person_id}/entries          → add a new lent/borrowed entry
  POST   /people/entries/{entry_id}/repay     → record repayment on an entry
  DELETE /people/entries/{entry_id}           → delete an entry
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from schemas.people import PersonCreate, EntryCreate, EntryRepay
from repositories import people_repository, push_repository, ledger_notification_repository
from services.push_service import send_push
from core.dependencies import get_current_user

router = APIRouter()


# ── People ────────────────────────────────────────────────────────────────────

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
        # MySQL duplicate key error code 1062
        if "1062" in str(exc):
            raise HTTPException(
                status_code=409,
                detail=f"A person named '{body.display_name.strip()}' already exists.",
            )
        raise
    return {"person_id": new_id, "message": "Person created."}


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


# ── Ledger entries ────────────────────────────────────────────────────────────

@router.get("/people/{person_id}/entries")
def list_entries(
    person_id: int,
    current_user: dict = Depends(get_current_user),
):
    # Verify ownership
    person = people_repository.fetch_person(person_id, current_user["user_id"])
    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")
    return people_repository.fetch_entries(person_id, current_user["user_id"])


@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    if len(q.strip()) < 1:
        return []
    return push_repository.search_users(q, current_user["user_id"])


@router.post("/users/push-token")
def save_push_token(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    token = body.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=422, detail="Token is required.")
    push_repository.save_push_token(current_user["user_id"], token)
    return {"message": "Push token saved."}


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
        dir_label    = "lent you" if body.direction == "lent" else "borrowed from you"
        sender_name  = body.sender_name or "Someone"
        msg          = f"{sender_name} recorded ₹{body.amount:,.0f} — {dir_label}. Please accept or reject."
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

    msg = f"{row['display_name']} accepted your ledger entry of ₹{float(row['amount']):,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "entry_accepted",
        message      = msg,
        entry_id     = entry_id,
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

    msg = f"{row['display_name']} rejected your ledger entry of ₹{float(row['amount']):,.0f}."
    ledger_notification_repository.create_ledger_notif(
        recipient_id = row["created_by"],
        sender_id    = current_user["user_id"],
        notif_type   = "entry_rejected",
        message      = msg,
        entry_id     = entry_id,
    )
    creator_token = push_repository.get_push_token(row["created_by"])
    background_tasks.add_task(
        send_push, creator_token, "Entry Rejected", msg, {"entry_id": entry_id}
    )
    return {"message": "Entry rejected."}


@router.get("/people/pending-requests")
def get_pending_requests(current_user: dict = Depends(get_current_user)):
    return people_repository.fetch_pending_entries_for_user(current_user["user_id"])


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
        result = people_repository.record_entry_repayment(
            entry_id         = entry_id,
            owner_user_id    = current_user["user_id"],
            repayment_amount = body.repayment_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Notify the other party if this is a linked entry
    entry_details = people_repository.fetch_entry_with_person(entry_id, current_user["user_id"])
    if entry_details and entry_details.get("linked_user_id"):
        other_user_id = entry_details["linked_user_id"]
        msg = f"₹{body.repayment_amount:,.0f} repayment recorded on your shared ledger entry."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = other_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "repayment_recorded",
            message      = msg,
            entry_id     = entry_id,
        )
        other_token = push_repository.get_push_token(other_user_id)
        background_tasks.add_task(
            send_push, other_token, "Repayment Recorded", msg, {"entry_id": entry_id}
        )
    return result


@router.delete("/people/entries/{entry_id}")
def delete_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_user),
):
    deleted = people_repository.delete_entry(entry_id, current_user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return {"message": "Entry deleted."}