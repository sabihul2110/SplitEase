# --- backend/routers/timeline.py ---
"""
Unified financial timeline.

GET /timeline/   → merged, date-sorted feed of all financial events
                   for the current user (personal expenses, group expenses,
                   income, loans, settlements received).

Optional query param:  ?limit=100  (default 100, max 200)
"""

import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from repositories import timeline_repository
from services import pdf_service
from core.dependencies import get_current_user

router = APIRouter()


@router.get("/timeline/")
def get_timeline(
    limit:  int = Query(default=50,  ge=1,  le=200),
    offset: int = Query(default=0,   ge=0),
    current_user: dict = Depends(get_current_user),
):
    return timeline_repository.fetch_unified_timeline(
        current_user["user_id"],
        limit=limit,
        offset=offset,
    )


@router.get("/timeline/statement")
def download_statement(
    start_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    end_date:   str | None = Query(default=None, description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generates a PDF statement. If start_date/end_date are provided, the
    statement covers exactly that inclusive range. Otherwise falls back
    to the 1000 most recent events across all time.
    """
    if start_date and end_date:
        events = timeline_repository.fetch_timeline_for_period(
            current_user["user_id"], start_date, end_date,
        )
        period_label = f"{start_date} to {end_date}"
    else:
        events = timeline_repository.fetch_unified_timeline(
            current_user["user_id"], limit=1000, offset=0,
        )
        period_label = "All time"

    pdf_bytes = pdf_service.generate_statement_pdf(
        user_name=current_user.get("email", "SplitEase User").split("@")[0],
        user_email=current_user.get("email", ""),
        events=events,
        period_label=period_label,
    )

    filename = "splitease-statement.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )