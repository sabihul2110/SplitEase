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

from fastapi import APIRouter, Depends, HTTPException, status
from schemas.people import PersonCreate, EntryCreate, EntryRepay
from repositories import people_repository
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
            owner_user_id=current_user["user_id"],
            display_name=body.display_name,
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


@router.post("/people/{person_id}/entries", status_code=status.HTTP_201_CREATED)
def add_entry(
    person_id: int,
    body: EntryCreate,
    current_user: dict = Depends(get_current_user),
):
    if body.direction not in ("lent", "borrowed"):
        raise HTTPException(status_code=422, detail="direction must be 'lent' or 'borrowed'.")
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    person = people_repository.fetch_person(person_id, current_user["user_id"])
    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")
    new_id = people_repository.insert_entry(
        person_id  = person_id,
        created_by = current_user["user_id"],
        direction  = body.direction,
        amount     = body.amount,
        note       = body.note,
        entry_date = body.entry_date,
    )
    return {"entry_id": new_id, "message": "Entry recorded."}


@router.post("/people/entries/{entry_id}/repay")
def repay_entry(
    entry_id: int,
    body: EntryRepay,
    current_user: dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = people_repository.record_entry_repayment(
            entry_id          = entry_id,
            owner_user_id     = current_user["user_id"],
            repayment_amount  = body.repayment_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
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