# SplitEase/backend/services/routine_status_service.py


"""
services/routine_status_service.py

Computes, per routine, whether today is done/pending/skipped/inactive,
and which past active days (bounded by LOOKBACK_DAYS, or the routine's
created_at if that column exists and is more recent) were neither run
nor explicitly skipped — i.e. still need a catch-up entry or a "mark
not required" tap.
"""

from datetime import date, datetime, timedelta

from repositories import routine_repository

LOOKBACK_DAYS = 14  # bound on how far back we scan for missed days


def _active_day_set(active_days: str) -> set[int]:
    return {int(d) for d in (active_days or "").split(",") if d.strip().isdigit()}


def _scan_start_date(routine: dict, today: date) -> date:
    floor_date = today - timedelta(days=LOOKBACK_DAYS)
    created_at = routine.get("created_at")
    if created_at:
        try:
            created_date = datetime.fromisoformat(str(created_at)).date()
            return max(created_date, floor_date)
        except ValueError:
            pass
    return floor_date


def compute_routine_status(user_id: int, today: date | None = None) -> list[dict]:
    today = today or date.today()
    routines = routine_repository.fetch_routines(user_id)
    results = []

    for routine in routines:
        active_set  = _active_day_set(routine["active_days"])
        start_date  = _scan_start_date(routine, today)
        run_dates   = routine_repository.fetch_run_dates(routine["routine_id"], start_date)
        skip_dates  = routine_repository.fetch_skipped_dates(routine["routine_id"], start_date)

        pending_catchup = []
        cursor = start_date
        while cursor < today:
            if cursor.isoweekday() in active_set:
                iso = cursor.isoformat()
                if iso not in run_dates and iso not in skip_dates:
                    pending_catchup.append(iso)
            cursor += timedelta(days=1)

        today_iso = today.isoformat()
        if today.isoweekday() not in active_set:
            today_status = "inactive_today"
        elif today_iso in run_dates:
            today_status = "done"
        elif today_iso in skip_dates:
            today_status = "skipped"
        else:
            today_status = "pending"

        results.append({
            "routine_id":            routine["routine_id"],
            "name":                  routine["name"],
            "icon_name":             routine["icon_name"],
            "active_days":           routine["active_days"],
            "today_status":          today_status,
            "pending_catchup_dates": pending_catchup,  # oldest first, excludes today
        })

    return results