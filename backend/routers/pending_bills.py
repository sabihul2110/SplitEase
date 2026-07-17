# SplitEase/backend/routers/pending_bills.py


from fastapi import APIRouter, Depends, HTTPException, status
from schemas.pending_bills import PendingBillPayRequest
from repositories import pending_bill_repository
from services import quick_entry_service, recurring_bill_service
from core.dependencies import get_current_user
from core.config import settings

router = APIRouter()


@router.get("/")
def list_pending_bills(current_user: dict = Depends(get_current_user)):
    # Backup sweep layer — cheap; uq_pb_bill_month makes repeat calls a no-op.
    recurring_bill_service.sweep_generate_for_user(current_user["user_id"])
    return pending_bill_repository.fetch_pending_bills(current_user["user_id"])


@router.get("/sweep/{cron_secret}")
def sweep_all(cron_secret: str):
    """
    Hit by UptimeRobot's free-tier keep-alive ping — a plain GET, no
    custom headers or method override needed (both are paid-tier only).
    The secret lives in the URL path instead. Point a second UptimeRobot
    monitor at:
        https://<your-render-url>/api/v1/pending-bills/sweep/<CRON_SECRET>
    Keep that URL private — anyone with it can trigger a sweep, though
    the sweep itself is idempotent and only ever creates Pending_Bills
    rows, never mutates money data, so worst case is noise, not damage.
    """
    if not settings.CRON_SECRET or cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret.")
    created          = recurring_bill_service.sweep_generate_all()
    bills_reminded   = recurring_bill_service.sweep_send_bill_reminders()
    routines_reminded = recurring_bill_service.sweep_send_routine_reminders()
    return {"created": created, "bills_reminded": bills_reminded, "routines_reminded": routines_reminded}


@router.post("/{pending_id}/pay", status_code=status.HTTP_201_CREATED)
def pay_pending_bill(pending_id: int, body: PendingBillPayRequest, current_user: dict = Depends(get_current_user)):
    try:
        return quick_entry_service.pay_pending_bill(pending_id, current_user["user_id"], body)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not a member of this group.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{pending_id}/dismiss")
def dismiss_pending_bill(pending_id: int, current_user: dict = Depends(get_current_user)):
    existing = pending_bill_repository.fetch_pending_bill(pending_id, current_user["user_id"])
    if existing is None:
        raise HTTPException(status_code=404, detail="Pending bill not found.")
    pending_bill_repository.dismiss_pending_bill(pending_id, current_user["user_id"])
    return {"message": "Pending bill dismissed."}