# --- backend/routers/payments.py ---

"""
routers/payments.py

GET    /payments/{group_id}      → list payments for a group
POST   /payments/{group_id}      → record a payment
DELETE /payments/{payment_id}    → delete a payment
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date

import db
from auth import get_current_user

router = APIRouter()


class AddPaymentRequest(BaseModel):
    payer_id:     int
    payee_id:     int
    amount:       float
    note:         str | None = None
    payment_date: date


@router.get("/{group_id}")
def list_payments(group_id: int, current_user: dict = Depends(get_current_user)):
    return db.fetch_group_payments(group_id, current_user["user_id"])


@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def add_payment(group_id: int, body: AddPaymentRequest, current_user: dict = Depends(get_current_user)):
    if not db.is_group_member(group_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    if body.payer_id == body.payee_id:
        raise HTTPException(status_code=400, detail="Payer and payee must be different.")

    payment_id = db.insert_payment(
        group_id     = group_id,
        payer_id     = body.payer_id,
        payee_id     = body.payee_id,
        amount       = body.amount,
        note         = body.note,
        payment_date = str(body.payment_date),
    )
    return {"payment_id": payment_id, "message": "Payment recorded."}


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, current_user: dict = Depends(get_current_user)):
    db.delete_payment(payment_id)
    return {"message": "Payment deleted."}