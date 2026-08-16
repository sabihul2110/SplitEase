# --- backend/routers/loans.py ---
"""
Lending / loan routes.

GET  /loans/                         → list loans given by current user
POST /loans/                         → record a new loan
POST /loans/{id}/repay               → record a partial or full repayment
DELETE /loans/{id}                   → delete loan record (owner only)
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from schemas.loans import LoanIn, RepaymentIn

from repositories import loan_repository, ledger_notification_repository, notification_repository, push_repository
from services.push_service import send_push
from core.push_channels import CHANNEL_LEDGER
from core.dependencies import get_current_user

router = APIRouter()


# class LoanIn(BaseModel):
#     borrower_name: str
#     amount:        float
#     note:          str | None = None
#     loan_date:     str          # YYYY-MM-DD


# class RepaymentIn(BaseModel):
#     repayment_amount: float


@router.get("/loans/")
def list_loans(current_user: dict = Depends(get_current_user)):
    return loan_repository.fetch_loans_with_pending(current_user["user_id"])


@router.post("/loans/", status_code=status.HTTP_201_CREATED)
def add_loan(
    body:              LoanIn,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Loan amount must be positive.")
    if not body.borrower_name.strip():
        raise HTTPException(status_code=422, detail="Borrower name is required.")

    result = loan_repository.insert_loan(
        lender_user_id  = current_user["user_id"],
        borrower_name   = body.borrower_name,
        amount          = body.amount,
        note            = body.note,
        loan_date       = body.loan_date,
        linked_user_id  = body.linked_user_id,
    )

    if body.linked_user_id:
        sender_name = notification_repository.get_user_name(current_user["user_id"])
        msg = f"{sender_name} recorded ₹{body.amount:,.0f} — lent you. Please accept or reject."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = body.linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "entry_request",
            message      = msg,
            entry_id     = result["entry_id"],
        )
        notification_repository.create_notification(
            user_id       = body.linked_user_id,
            from_user_id  = current_user["user_id"],
            notification_type = "entry_request",
            message       = msg,
            ref_type      = "entry",
            ref_id        = result["entry_id"],
        )
        token = push_repository.get_push_token(body.linked_user_id)
        background_tasks.add_task(
            send_push, token, "New Ledger Request", msg,
            {"entry_id": result["entry_id"], "screen": "PendingRequests"},
            channel_id=CHANNEL_LEDGER,
        )

    return {
        "loan_id": result["loan_id"],
        "status":  result["status"],
        "message": f"Loan to {body.borrower_name} recorded."
                    + (" Awaiting their acceptance." if result["status"] == "pending" else ""),
    }


@router.post("/loans/{loan_id}/repay", status_code=status.HTTP_200_OK)
def repay_loan(
    loan_id:           int,
    body:              RepaymentIn,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    if body.repayment_amount <= 0:
        raise HTTPException(status_code=422, detail="Repayment must be positive.")
    try:
        result = loan_repository.record_loan_repayment(
            loan_id          = loan_id,
            user_id          = current_user["user_id"],
            repayment_amount = body.repayment_amount,
            repayment_date   = body.repayment_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    linked_user_id = result.get("linked_user_id")
    if linked_user_id:
        sender_name = notification_repository.get_user_name(current_user["user_id"])
        msg = f"₹{body.repayment_amount:,.0f} repayment recorded on your shared ledger entry."
        ledger_notification_repository.create_ledger_notif(
            recipient_id = linked_user_id,
            sender_id    = current_user["user_id"],
            notif_type   = "repayment_recorded",
            message      = msg,
            entry_id     = loan_id,
        )
        token = push_repository.get_push_token(linked_user_id)
        background_tasks.add_task(send_push, token, "Repayment Recorded", msg, {"entry_id": loan_id}, channel_id=CHANNEL_LEDGER)
    return result


@router.delete("/loans/{loan_id}", status_code=status.HTTP_200_OK)
def delete_loan(
    loan_id:           int,
    background_tasks:  BackgroundTasks,
    current_user:      dict = Depends(get_current_user),
):
    try:
        result = loan_repository.delete_loan(loan_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    if not result.get("deleted"):
        raise HTTPException(status_code=404, detail="Loan not found.")

    linked_user_id = result.get("linked_user_id")
    if linked_user_id and result.get("was_active"):
        sender_name = notification_repository.get_user_name(current_user["user_id"])
        msg = f"{sender_name} removed the shared ledger entry of ₹{result['amount']:,.0f} (lent you)."
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
        token = push_repository.get_push_token(linked_user_id)
        background_tasks.add_task(send_push, token, "Entry Removed", msg, {}, channel_id=CHANNEL_LEDGER)

    return {"message": "Loan record deleted."}