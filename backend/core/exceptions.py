# SplitEase/backend/core/exceptions.py
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("splitease")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception request_id=%s path=%s method=%s error=%s",
        request_id,
        request.url.path,
        request.method,
        repr(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred.", "request_id": request_id},
    )