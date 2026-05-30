# --- backend/routers/expenses.py ---
"""
routers/expenses.py

GET    /expenses/{group_id}                    → list expenses for a group
GET    /expenses/{group_id}/{exp_id}/splits    → splits for one expense
POST   /expenses/{group_id}                    → add expense
DELETE /expenses/{expense_id}                  → delete expense (Batch 1 fix retained)

FIX #10: list_expenses now allows admins to see expenses for ANY group,
          even ones they are not a member of.
          Previously the DB query's sub-SELECT filtered by membership,
          so admins got an empty list for groups they hadn't joined.
          AdminTransactions was silently missing data as a result.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date

import db
from auth import get_current_user

router = APIRouter()


class SplitItem(BaseModel):
    user_id:     int
    amount_owed: float
    share_pct:   float | None = None


class AddExpenseRequest(BaseModel):
    payer_id:       int
    category_id:    int
    subcategory_id: int | None = None
    total_amount:   float
    description:    str
    split_type:     str = "equal"
    expense_date:   date
    splits:         list[SplitItem]


@router.get("/{group_id}")
def list_expenses(group_id: int, current_user: dict = Depends(get_current_user)):
    """
    FIX #10: admins bypass the membership check and can view any group's expenses.
    Regular users still require membership (enforced inside db.fetch_group_expenses
    via the sub-SELECT on Group_Members).
    """
    is_admin = current_user.get("role") == "admin"

    if is_admin:
        # Admin path: fetch without membership gate
        return db.fetch_group_expenses_admin(group_id)
    else:
        # Normal path: membership enforced inside the query
        return db.fetch_group_expenses(group_id, current_user["user_id"])


@router.get("/{group_id}/{expense_id}/splits")
def expense_splits(group_id: int, expense_id: int, current_user: dict = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    if not is_admin and not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return db.fetch_expense_splits(expense_id)


@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def add_expense(group_id: int, body: AddExpenseRequest, current_user: dict = Depends(get_current_user)):
    if not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    if body.split_type not in ("equal", "custom"):
        raise HTTPException(status_code=400, detail="split_type must be 'equal' or 'custom'.")

    expense_id = db.insert_expense(
        group_id       = group_id,
        payer_id       = body.payer_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        total_amount   = body.total_amount,
        description    = body.description,
        split_type     = body.split_type,
        expense_date   = str(body.expense_date),
        splits         = [s.model_dump() for s in body.splits],
    )
    return {"expense_id": expense_id, "message": "Expense added."}


@router.get("/{expense_id}/splits")
def get_expense_splits(expense_id: int, current_user: dict = Depends(get_current_user)):
    splits = db.fetch_expense_splits(expense_id)
    return splits    


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, current_user: dict = Depends(get_current_user)):
    # Batch 1 fix retained
    group_id = db.fetch_expense_group_id(expense_id)
    if group_id is None:
        raise HTTPException(status_code=404, detail="Expense not found.")

    is_member = db.is_group_member(group_id, current_user["user_id"])
    is_admin  = current_user.get("role") == "admin"
    if not is_member and not is_admin:
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    db.delete_expense(expense_id)
    return {"message": "Expense deleted."}


class UpdateExpenseRequest(BaseModel):
    payer_id:       int
    category_id:    int
    subcategory_id: int | None = None
    total_amount:   float
    description:    str
    split_type:     str = "equal"
    expense_date:   date
    splits:         list[SplitItem]


@router.put("/{expense_id}")
def update_expense(expense_id: int, body: UpdateExpenseRequest, current_user: dict = Depends(get_current_user)):
    group_id = db.fetch_expense_group_id(expense_id)
    if group_id is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    is_member = db.is_group_member(group_id, current_user["user_id"])
    is_admin  = current_user.get("role") == "admin"
    if not is_member and not is_admin:
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    if body.split_type not in ("equal", "custom"):
        raise HTTPException(status_code=400, detail="split_type must be 'equal' or 'custom'.")
    db.update_expense(
        expense_id     = expense_id,
        payer_id       = body.payer_id,
        category_id    = body.category_id,
        subcategory_id = body.subcategory_id,
        total_amount   = body.total_amount,
        description    = body.description,
        split_type     = body.split_type,
        expense_date   = str(body.expense_date),
        splits         = [s.model_dump() for s in body.splits],
    )
    return {"message": "Expense updated."}