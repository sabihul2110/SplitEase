# SplitEase/backend/routers/recurring_bills.py


from fastapi import APIRouter, Depends, HTTPException, status
from schemas.recurring_bills import RecurringBillCreate, RecurringBillUpdate
from repositories import recurring_bill_repository, group_repository
from core.dependencies import get_current_user

router = APIRouter()


@router.get("/")
def list_bills(current_user: dict = Depends(get_current_user)):
    return recurring_bill_repository.fetch_bills(current_user["user_id"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_bill(body: RecurringBillCreate, current_user: dict = Depends(get_current_user)):
    if body.group_id and not group_repository.is_group_member(body.group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    bill_id = recurring_bill_repository.insert_bill(
        user_id        = current_user["user_id"],
        name           = body.name,
        icon_name      = body.icon_name,
        group_id       = body.group_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        cron_day       = body.cron_day,
        split_type     = body.split_type,
        split_config   = [i.model_dump() for i in body.split_config] if body.split_config else None,
    )
    return {"bill_id": bill_id, "message": "Recurring bill created."}


@router.put("/{bill_id}")
def update_bill(bill_id: int, body: RecurringBillUpdate, current_user: dict = Depends(get_current_user)):
    existing = recurring_bill_repository.fetch_bill(bill_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Recurring bill not found.")
    if body.group_id and not group_repository.is_group_member(body.group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    recurring_bill_repository.update_bill(
        bill_id        = bill_id,
        user_id        = current_user["user_id"],
        name           = body.name,
        icon_name      = body.icon_name,
        group_id       = body.group_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        cron_day       = body.cron_day,
        split_type     = body.split_type,
        split_config   = [i.model_dump() for i in body.split_config] if body.split_config else None,
    )
    return {"message": "Recurring bill updated."}


@router.delete("/{bill_id}")
def delete_bill(bill_id: int, current_user: dict = Depends(get_current_user)):
    existing = recurring_bill_repository.fetch_bill(bill_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Recurring bill not found.")
    recurring_bill_repository.delete_bill(bill_id, current_user["user_id"])
    return {"message": "Recurring bill deleted."}