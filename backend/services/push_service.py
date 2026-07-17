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

EXPO_PUSH_URL = "https://exp.host/--/exponent-push-token/"


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
            if resp.status_code != 200:
                logger.warning("Push failed: %s %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Push send error: %s", exc)


def send_push_sync(token: str | None, title: str, body: str, data: dict | None = None) -> None:
    """Blocking sender for sync (non-async def) route handlers, e.g. the
    pending-bills sweep. Uses a plain blocking httpx.Client — no event loop
    juggling, no silent swallow."""
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
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(EXPO_PUSH_URL, json=payload)
            if resp.status_code != 200:
                logger.warning("Push (sync) failed: %s %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Push (sync) send error: %s", exc)