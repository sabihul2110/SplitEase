# SplitEase/backend/services/recurring_bill_service.py


"""
services/recurring_bill_service.py

Render free tier has no persistent cron. Strategy: lazy, idempotent
generation instead of a scheduled fire. sweep_generate_all() is called
by /pending-bills/sweep, which UptimeRobot's existing keep-alive ping
hits — piggybacking on infra that already exists. sweep_generate_for_user()
also runs on every GET /pending-bills/ as a redundancy net, cheap because
uq_pb_bill_month makes duplicate inserts a no-op.
"""

import calendar
from datetime import date

from repositories import recurring_bill_repository, pending_bill_repository


def _clamp_day(year: int, month: int, cron_day: int) -> int:
    last_day = calendar.monthrange(year, month)[1]
    return min(cron_day, last_day)


def sweep_generate_for_user(user_id: int, today: date | None = None) -> int:
    today = today or date.today()
    bills = recurring_bill_repository.fetch_bills(user_id)
    created = 0
    for bill in bills:
        due_day = _clamp_day(today.year, today.month, bill["cron_day"])
        if today.day < due_day:
            continue
        month_start = date(today.year, today.month, 1)
        if pending_bill_repository.exists_for_month(bill["bill_id"], month_start):
            continue
        if pending_bill_repository.insert_pending_bill(bill["bill_id"], user_id, month_start):
            created += 1
    return created


def sweep_generate_all(today: date | None = None) -> int:
    today = today or date.today()
    total = 0
    for uid in recurring_bill_repository.fetch_distinct_bill_owners():
        total += sweep_generate_for_user(uid, today)
    return total