# --- backend/routers/borrows.py ---
"""
Borrow routes — money the current user BORROWED from someone.

GET  /borrows/                  → list borrows for current user
POST /borrows/                  → record a new borrow
POST /borrows/{id}/repay        → record repayment (reduces remaining)
DELETE /borrows/{id}            → delete borrow record (owner only)
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from schemas.borrows import BorrowIn, BorrowRepayIn

from repositories import borrow_repository, loan_repository, ledger_notification_repository, notification_repository, push_repository
from services.push_service import send_push
from core.dependencies import get_current_user

router = APIRouter()

@router.get("/borrows/")
def list_borrows(current_user: dict = Depends(get_current_user)):
    return loan_repository.fetch_borrows_with_pending(current_user["user_id"])


@router.post("/borrows/", status_code=status.HTTP_201_CREATED)
def add_borrow(
    body:              BorrowIn,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    if not body.lender_name.strip():
        raise HTTPException(status_code=422, detail="Lender name is required.")

    result = borrow_repository.insert_borrow(
        borrower_user_id = current_user["user_id"],
        lender_name      = body.lender_name,
        amount           = body.amount,
        note             = body.note,
        borrow_date      = body.borrow_date,
        linked_user_id   = body.linked_user_id,
    )

    if body.linked_user_id:
        sender_name = notification_repository.get_user_name(current_user["user_id"])
        msg = f"{sender_name} recorded ₹{body.amount:,.0f} — borrowed from you. Please accept or reject."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = body.linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "entry_request",
            message      = msg,
            entry_id     = result["entry_id"],
        )
        token = push_repository.get_push_token(body.linked_user_id)
        background_tasks.add_task(
            send_push, token, "New Ledger Request", msg,
            {"entry_id": result["entry_id"], "screen": "PendingRequests"},
        )

    return {
        "borrow_id": result["borrow_id"],
        "status":    result["status"],
        "message":   f"Borrow from {body.lender_name} recorded."
                      + (" Awaiting their acceptance." if result["status"] == "pending" else ""),
    }


@router.post("/borrows/{borrow_id}/repay", status_code=status.HTTP_200_OK)
def repay_borrow(
    borrow_id:         int,
    body:              BorrowRepayIn,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = borrow_repository.record_borrow_repayment(
            borrow_id        = borrow_id,
            user_id          = current_user["user_id"],
            repayment_amount = body.repayment_amount,
            repayment_date   = body.repayment_date,
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
                entry_id     = borrow_id,
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
                entry_id     = borrow_id,
            )
            token = push_repository.get_push_token(linked_user_id)
            background_tasks.add_task(send_push, token, "Repayment Recorded", msg, {"entry_id": borrow_id})
    return result


@router.delete("/borrows/{borrow_id}", status_code=status.HTTP_200_OK)
def delete_borrow(
    borrow_id:         int,
    current_user:      dict = Depends(get_current_user),
):
    try:
        result = borrow_repository.delete_borrow(borrow_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    if not result.get("deleted"):
        raise HTTPException(status_code=404, detail="Borrow not found.")
    return {"message": "Borrow record deleted."}