# --- backend/routers/invites.py ---
"""
routers/invites.py

POST /groups/{group_id}/invite   → generate invite link (members only)
GET  /invite/{token}             → get invite info (group name) — public
POST /invite/{token}/join        → join group via token
DELETE /invite/{token}           → revoke invite link (creator or admin)  ← NEW S4

FIX S4a: Invite links now have a default expiry (INVITE_EXPIRY_HOURS from config,
          default 72 h). Callers can still request a custom duration via
          expires_hours in the request body; setting it to 0 opts into
          never-expiring behaviour explicitly.

FIX S4b: New DELETE /invite/{token} endpoint allows the creator of an invite
          (or any admin) to revoke it immediately. Revoking is an irreversible
          hard-delete of the Invites row; the token stops working at once.
"""

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import get_current_user
from config import INVITE_EXPIRY_HOURS

router = APIRouter()


# ── DB helpers ────────────────────────────────────────────────────────────────

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
    import mysql.connector

    token = secrets.token_urlsafe(32)   # 43-char URL-safe string

    # Resolve expiry
    if expires_hours is None:
        expires_hours = INVITE_EXPIRY_HOURS
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        if expires_hours > 0
        else None
    )

    conn = db.get_connection()
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
    conn = db.get_connection()
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


def _assert_not_expired(invite: dict) -> None:
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
    import mysql.connector

    invite = get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has been deleted.")

    _assert_not_expired(invite)

    group_id   = invite["group_id"]
    group_name = invite["group_name"]

    if db.is_group_member(group_id, user_id):
        return {"group_id": group_id, "group_name": group_name, "already_member": True}

    conn = db.get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "INSERT INTO Group_Members (group_id, user_id) VALUES (%s, %s)",
            (group_id, user_id),
        )
        conn.commit()
    except mysql.connector.IntegrityError:
        conn.rollback()
        # Race condition — already inserted, that's fine
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()

    return {"group_id": group_id, "group_name": group_name, "already_member": False}


# ── Request body models ───────────────────────────────────────────────────────

class GenerateInviteRequest(BaseModel):
    # FIX S4a: caller can override expiry; None means "use server default"
    expires_hours: int | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/groups/{group_id}/invite", status_code=status.HTTP_201_CREATED)
def generate_invite(
    group_id: int,
    body: GenerateInviteRequest = GenerateInviteRequest(),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate an invite link for a group.
    Only group members (or admins) can generate invites.

    FIX S4a: Default expiry is INVITE_EXPIRY_HOURS (72 h).
    Body field expires_hours overrides it; 0 = never expire.
    """
    user_id = current_user["user_id"]

    if not db.is_group_member(group_id, user_id) and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group members can generate invite links.",
        )

    token = create_invite(
        group_id=group_id,
        created_by=user_id,
        expires_hours=body.expires_hours,
    )

    # Compute when the invite expires for the response
    hours = body.expires_hours if body.expires_hours is not None else INVITE_EXPIRY_HOURS
    expires_at = (
        (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
        if hours > 0
        else None
    )

    return {
        "token":      token,
        "invite_url": f"/join/{token}",
        "group_id":   group_id,
        "expires_at": expires_at,   # ISO-8601 string or null
    }


@router.get("/invite/{token}")
def get_invite_info(token: str):
    """
    Public route — returns group name for the invite.
    Used by the /join/:token page to show what group you're joining.
    No auth required.
    """
    invite = get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite link.")

    _assert_not_expired(invite)

    return {
        "group_id":   invite["group_id"],
        "group_name": invite["group_name"],
        "token":      token,
        "expires_at": invite["expires_at"].isoformat() if invite["expires_at"] else None,
    }


@router.post("/invite/{token}/join")
def join_via_invite(
    token: str,
    current_user: dict = Depends(get_current_user),
):
    """Join a group via invite token. User must be logged in."""
    result = join_group_via_invite(token, current_user["user_id"])
    return {
        "message":        "Welcome to the group!" if not result["already_member"] else "You're already in this group.",
        "group_id":       result["group_id"],
        "group_name":     result["group_name"],
        "already_member": result["already_member"],
    }


@router.delete("/invite/{token}", status_code=status.HTTP_200_OK)
def revoke_invite(
    token: str,
    current_user: dict = Depends(get_current_user),
):
    """
    FIX S4b: Revoke (hard-delete) an invite link.

    Allowed when the requesting user is:
      - The original creator of the invite, OR
      - An admin

    Anyone else gets 403.
    A nonexistent or already-deleted token gets 404.
    """
    invite = get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already revoked.")

    is_creator = invite["created_by"] == current_user["user_id"]
    is_admin   = current_user.get("role") == "admin"

    if not is_creator and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the invite creator or an admin can revoke this link.",
        )

    conn = db.get_connection()
    cur  = conn.cursor()
    try:
        cur.execute("DELETE FROM Invites WHERE token = %s", (token,))
        conn.commit()
    finally:
        cur.close(); conn.close()

    return {"message": "Invite link revoked. It can no longer be used to join the group."}