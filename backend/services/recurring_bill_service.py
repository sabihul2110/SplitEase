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
from datetime import date, datetime, timedelta, timezone

from repositories import (
    recurring_bill_repository, pending_bill_repository,
    routine_repository, push_repository,
)
from services.push_service import send_push_sync

IST = timezone(timedelta(hours=5, minutes=30))
ROUTINE_REMINDER_HOUR_IST = 22  # 10:00 PM IST


def _now_ist() -> datetime:
    return datetime.now(timezone.utc).astimezone(IST)


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
            token = push_repository.get_push_token(user_id)
            send_push_sync(
                token,
                "Bill Due",
                f"\u2018{bill['name']}\u2019 is due this month \u2014 tap to log it.",
                {"screen": "QuickEntry", "bill_id": bill["bill_id"]},
            )
    return created


def sweep_generate_all(today: date | None = None) -> int:
    today = today or date.today()
    total = 0
    for uid in recurring_bill_repository.fetch_distinct_bill_owners():
        total += sweep_generate_for_user(uid, today)
    return total


def sweep_send_bill_reminders(today: date | None = None) -> int:
    """
    Rules:
      1. First reminder fires 2 days before the due date (due_date - 2).
      2. Exactly one push per calendar day from then on (dedup via
         last_reminded_date — never two sends on the same date even if
         this sweep is pinged repeatedly).
      3. Keeps firing daily after the due date passes (overdue nag).
      4. Stops the instant status leaves 'pending' — fetch_reminder_candidates()
         only returns status='pending' rows, so paid/dismissed bills are
         already excluded at the query level; nothing further needed here.
    """
    today = today or date.today()
    sent = 0
    for row in pending_bill_repository.fetch_reminder_candidates():
        month_start = date.fromisoformat(row["generated_for_month"])
        due_day     = _clamp_day(month_start.year, month_start.month, row["cron_day"])
        due_date    = date(month_start.year, month_start.month, due_day)
        window_start = due_date - timedelta(days=2)

        if today < window_start:
            continue  # too early — first reminder not due yet

        last_sent = date.fromisoformat(row["last_reminded_date"]) if row["last_reminded_date"] else None
        if last_sent == today:
            continue  # already reminded today — dedup

        token = row["expo_push_token"]
        is_overdue = today > due_date
        body = (
            f"'{row['name']}' is overdue \u2014 tap to log it."
            if is_overdue else
            f"'{row['name']}' is due on {due_date.strftime('%b %d')} \u2014 tap to log it."
        )
        send_push_sync(
            token,
            "Bill Overdue" if is_overdue else "Bill Due Soon",
            body,
            {"screen": "QuickEntry", "bill_id": row["pending_id"]},
        )
        pending_bill_repository.mark_reminded(row["pending_id"], today)
        sent += 1
    return sent


def sweep_send_routine_reminders(now_ist: datetime | None = None) -> int:
    """
    Rules:
      1. Only fires from ROUTINE_REMINDER_HOUR_IST (22:00 IST) onward — a sweep
         ping before that hour is a no-op for every routine, regardless of how
         often UptimeRobot pings.
      2. Only fires on a routine's active_days (1=Mon..7=Sun, ISO weekday).
      3. Skipped entirely if Routine_Runs already has a row for this routine
         today — the routine was run, nothing to nag about.
      4. Exactly one push per calendar day (IST) via last_reminded_date dedup,
         same pattern as the bills sweep.
    """
    now_ist = now_ist or _now_ist()
    if now_ist.hour < ROUTINE_REMINDER_HOUR_IST:
        return 0

    today = now_ist.date()
    iso_dow = today.isoweekday()  # Monday=1..Sunday=7 — matches active_days format
    sent = 0

    for row in routine_repository.fetch_reminder_candidates():
        active_days = {int(d) for d in row["active_days"].split(",") if d.strip().isdigit()}
        if iso_dow not in active_days:
            continue

        last_sent = date.fromisoformat(row["last_reminded_date"]) if row["last_reminded_date"] else None
        if last_sent == today:
            continue  # already reminded today

        if routine_repository.has_run_on_date(row["routine_id"], today):
            continue  # already run today — nothing to nag about

        send_push_sync(
            row["expo_push_token"],
            "Routine Reminder",
            f"You haven't run '{row['name']}' today \u2014 log it before you forget.",
            {"screen": "RunRoutine", "routine_id": row["routine_id"]},
        )
        routine_repository.mark_reminded(row["routine_id"], today)
        sent += 1

    return sent