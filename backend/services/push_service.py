# SplitEase/backend/services/push_service.py


"""
push_service.py — Send push notifications via Expo Push API.

Expo handles FCM/APNs internally. No Firebase setup required.
Tokens look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

Failures are logged but never raise — a push failure must never
break the API response that triggered it.
"""

import logging
import httpx

logger = logging.getLogger("splitease.push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(token: str | None, title: str, body: str, data: dict | None = None) -> None:
    """Fire-and-forget. Swallows all errors."""
    if not token or not token.startswith("ExponentPushToken"):
        return
    payload = {
        "to":    token,
        "title": title,
        "body":  body,
        "sound": "default",
        "data":  data or {},
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload)
            _log_expo_response(resp)
    except Exception as exc:
        logger.warning("Push send error: %s", exc)


def _log_expo_response(resp: "httpx.Response") -> None:
    """Expo returns HTTP 200 even when an individual ticket failed — the real
    error lives in the response body, not the status code. Log it explicitly
    so push failures are actually visible instead of silently 'succeeding'."""
    if resp.status_code != 200:
        logger.warning("Push HTTP failed: %s %s", resp.status_code, resp.text)
        return
    try:
        body = resp.json()
    except Exception:
        logger.warning("Push response not JSON: %s", resp.text)
        return
    for ticket in body.get("data", []):
        if isinstance(ticket, dict) and ticket.get("status") == "error":
            logger.warning(
                "Expo push ticket error: %s | details=%s",
                ticket.get("message"), ticket.get("details"),
            )


def send_push_sync(token: str | None, title: str, body: str, data: dict | None = None) -> None:
    """Blocking sender for sync (non-async def) route handlers, e.g. the
    pending-bills sweep. Uses a plain blocking httpx.Client — no event loop
    juggling, no silent swallow."""
    if not token or not token.startswith("ExponentPushToken"):
        logger.warning("send_push_sync: no/invalid token, skipping.")
        return
    payload = {
        "to":    token,
        "title": title,
        "body":  body,
        "sound": "default",
        "data":  data or {},
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(EXPO_PUSH_URL, json=payload)
            _log_expo_response(resp)
    except Exception as exc:
        logger.warning("Push (sync) send error: %s", exc)