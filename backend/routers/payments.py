# --- backend/routers/payments.py ---

"""
routers/payments.py

GET    /payments/{group_id}    → list payments for a group
POST   /payments/{group_id}    → record a payment
DELETE /payments/{payment_id}  → delete a payment

FIX S2: DELETE now verifies the requesting user is a member of the group
        the payment belongs to (or is an admin) before allowing deletion.
        Previously any authenticated user could delete any payment.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date

import db
from auth import get_current_user

router = APIRouter()


class AllocationItem(BaseModel):
    expense_id:    int
    allocated_amt: float


class AddPaymentRequest(BaseModel):
    payer_id:     int
    payee_id:     int
    amount:       float
    note:         str | None = None
    payment_date: date
    allocations:  list[AllocationItem] = []


@router.get("/{group_id}")
def list_payments(group_id: int, current_user: dict = Depends(get_current_user)):
    return db.fetch_group_payments(group_id, current_user["user_id"])


@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def add_payment(group_id: int, body: AddPaymentRequest, current_user: dict = Depends(get_current_user)):
    if not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    if body.payer_id == body.payee_id:
        raise HTTPException(status_code=400, detail="Payer and payee must be different.")

    # Validate allocations don't exceed payment amount
    if body.allocations:
        alloc_total = sum(a.allocated_amt for a in body.allocations)
        if round(alloc_total, 2) > round(body.amount, 2) + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Allocations total ₹{alloc_total:.2f} exceeds payment ₹{body.amount:.2f}."
            )

    payment_id = db.insert_payment_with_allocations(
        group_id     = group_id,
        payer_id     = body.payer_id,
        payee_id     = body.payee_id,
        amount       = body.amount,
        note         = body.note,
        payment_date = str(body.payment_date),
        allocations  = [a.model_dump() for a in body.allocations],
    )
    return {"payment_id": payment_id, "message": "Payment recorded."}


@router.get("/pending-splits/{group_id}")
def pending_splits(
    group_id: int,
    debtor_id: int,
    creditor_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Returns unpaid splits from debtor → creditor in a group."""
    if not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return db.fetch_pending_splits_between(group_id, debtor_id, creditor_id)


@router.get("/allocations/{payment_id}")
def payment_allocations(payment_id: int, current_user: dict = Depends(get_current_user)):
    """Which expenses a payment covers."""
    group_id = db.fetch_payment_group_id(payment_id)
    if group_id is None:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    return db.fetch_payment_allocations(payment_id)


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, current_user: dict = Depends(get_current_user)):
    """
    FIX S2: Verify the requesting user belongs to the group this payment
    is in — or is an admin — before allowing deletion.

    Steps:
      1. Look up the payment to find its group_id.
      2. If payment not found → 404 (avoids leaking existence to outsiders).
      3. Check membership or admin role → 403 if neither.
      4. Delete.
    """
    # Step 1: resolve which group this payment belongs to
    group_id = db.fetch_payment_group_id(payment_id)

    # Step 2: 404 if payment doesn't exist
    if group_id is None:
        raise HTTPException(status_code=404, detail="Payment not found.")

    # Step 3: membership or admin required
    is_member = db.is_group_member(group_id, current_user["user_id"])
    is_admin  = current_user.get("role") == "admin"
    if not is_member and not is_admin:
        raise HTTPException(status_code=403, detail="Not a member of this group.")

    # Step 4: delete
    db.delete_payment(payment_id)
    return {"message": "Payment deleted."}