# SplitEase/backend/repositories/invite_repository.py
"""
Data-access layer for Invites — extracted from routers/invites.py so this
domain follows the same router -> repository split every other domain uses.
No route paths or public behavior change; this is a pure relocation.
"""

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

from core.database import get_connection, get_db
from core.config import INVITE_EXPIRY_HOURS
from repositories import group_repository


def create_invite(
    group_id: int,
    created_by: int,
    expires_hours: int | None = None,
) -> str:
    """
    Generate a token, store in Invites, return the token.

    FIX S4a: expires_hours defaults to INVITE_EXPIRY_HOURS from config (72 h).
    Pass expires_hours=0 explicitly to create a never-expiring link.
    """
    token = secrets.token_urlsafe(32)   # 43-char URL-safe string

    if expires_hours is None:
        expires_hours = INVITE_EXPIRY_HOURS
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        if expires_hours > 0
        else None
    )

    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO Invites (token, group_id, created_by, expires_at)
            VALUES (%s, %s, %s, %s)
            """,
            (token, group_id, created_by, expires_at),
        )
        conn.commit()
    finally:
        cur.close(); conn.close()
    return token


def get_invite_by_token(token: str) -> dict | None:
    """Return invite row or None. Includes group_name via JOIN."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT i.invite_id, i.token, i.group_id, i.created_by,
               i.expires_at, i.created_at,
               g.group_name
        FROM   Invites i
        JOIN   `Groups` g ON g.group_id = i.group_id
        WHERE  i.token = %s
        """,
        (token,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def assert_not_expired(invite: dict) -> None:
    """Raise HTTP 410 if the invite has passed its expiry timestamp."""
    if invite["expires_at"]:
        exp = invite["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(
                status_code=410,
                detail="This invite link has expired.",
            )


def join_group_via_invite(token: str, user_id: int) -> dict:
    """
    Validate token, add user to group.
    Returns { group_id, group_name, already_member }.
    Raises HTTPException on any failure.
    """
    invite = get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has been deleted.")

    assert_not_expired(invite)

    group_id   = invite["group_id"]
    group_name = invite["group_name"]

    if group_repository.is_group_member(group_id, user_id):
        return {"group_id": group_id, "group_name": group_name, "already_member": True}

    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "INSERT INTO Group_Members (group_id, user_id) VALUES (%s, %s)",
                (group_id, user_id),
            )
            conn.commit()
        except Exception:
            conn.rollback()

    return {"group_id": group_id, "group_name": group_name, "already_member": False}


def revoke_invite(token: str) -> None:
    """Hard-delete an invite row by token."""
    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute("DELETE FROM Invites WHERE token = %s", (token,))
        conn.commit()
    finally:
        cur.close(); conn.close()