# SplitEase/backend/routers/ledger_notifications.py


"""
Ledger notification routes.

GET  /ledger-notifications/              → list my ledger notifications
GET  /ledger-notifications/unread-count  → badge count
POST /ledger-notifications/{id}/read     → mark one read
POST /ledger-notifications/read-all      → mark all read
"""

from fastapi import APIRouter, Depends
from repositories import ledger_notification_repository, people_repository
from core.dependencies import get_current_user

router = APIRouter()


@router.get("/ledger-notifications/unread-count")
def ledger_unread_count(current_user: dict = Depends(get_current_user)):
    # NOTE: despite the route/function name (kept for API compatibility —
    # every frontend badge already calls this exact endpoint), this now
    # returns real pending-action counts (Ledger_Entries/Repayments/
    # Settlement_Requests still status='pending'), not Ledger_Notifications
    # is_read counts. See fetch_pending_action_counts's docstring in
    # people_repository.py for why.
    return people_repository.fetch_pending_action_counts(current_user["user_id"])


@router.post("/ledger-notifications/read-category/{category}")
def mark_ledger_category_read(
    category: str,
    current_user: dict = Depends(get_current_user),
):
    ledger_notification_repository.mark_category_read(current_user["user_id"], category)
    return {"message": "Marked as read."}


@router.get("/ledger-notifications/")
def list_ledger_notifs(current_user: dict = Depends(get_current_user)):
    return ledger_notification_repository.fetch_ledger_notifs(current_user["user_id"])


@router.post("/ledger-notifications/{notif_id}/read")
def mark_ledger_notif_read(
    notif_id: int,
    current_user: dict = Depends(get_current_user),
):
    ledger_notification_repository.mark_read(notif_id, current_user["user_id"])
    return {"message": "Marked as read."}


@router.post("/ledger-notifications/read-all")
def mark_all_ledger_notifs_read(current_user: dict = Depends(get_current_user)):
    ledger_notification_repository.mark_all_read(current_user["user_id"])
    return {"message": "All marked as read."}