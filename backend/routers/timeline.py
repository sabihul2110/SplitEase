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
def download_statement(current_user: dict = Depends(get_current_user)):
    """
    Generates a PDF statement of the user's full financial timeline
    (up to 1000 most recent events) and streams it back as a download.
    """
    events = timeline_repository.fetch_unified_timeline(
        current_user["user_id"],
        limit=1000,
        offset=0,
    )

    pdf_bytes = pdf_service.generate_statement_pdf(
        user_name=current_user.get("email", "SplitEase User").split("@")[0],
        user_email=current_user.get("email", ""),
        events=events,
    )

    filename = "splitease-statement.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )