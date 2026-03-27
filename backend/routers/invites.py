# --- backend/routers/invites.py ---

"""
routers/invites.py

POST /groups/{group_id}/invite        → generate invite link (members only)
POST /invite/{token}/join             → join group via token
GET  /invite/{token}                  → get invite info (group name) — public
"""

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status

import db
from auth import get_current_user

router = APIRouter()


# ── DB helpers (added here to keep invite logic self-contained) ──────────────

def create_invite(group_id: int, created_by: int, expires_hours: int | None = None) -> str:
    """Generate a token, store in Invites, return the token."""
    import mysql.connector
    token = secrets.token_urlsafe(32)   # 43-char URL-safe string
    expires_at = None
    if expires_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

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


def join_group_via_invite(token: str, user_id: int) -> dict:
    """
    Validate token, add user to group.
    Returns { group_id, group_name }.
    Raises HTTPException on any failure.
    """
    import mysql.connector

    invite = get_invite_by_token(token)

    if not invite:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has been deleted.")

    # Check expiry
    if invite["expires_at"]:
        # expires_at comes back as a naive datetime from MySQL — treat as UTC
        exp = invite["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=410, detail="This invite link has expired.")

    group_id   = invite["group_id"]
    group_name = invite["group_name"]

    # Already a member? That's fine — just redirect them.
    if db.is_group_member(group_id, user_id):
        return {"group_id": group_id, "group_name": group_name, "already_member": True}

    # Add to group
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


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/groups/{group_id}/invite", status_code=status.HTTP_201_CREATED)
def generate_invite(
    group_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate an invite link for a group.
    Only group members can generate invites.
    Returns the full invite URL.
    """
    user_id = current_user["user_id"]

    # Must be a member to invite (admin can override if they are a member)
    if not db.is_group_member(group_id, user_id) and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group members can generate invite links.",
        )

    token = create_invite(group_id=group_id, created_by=user_id)

    # Return the token — frontend constructs the full URL
    return {
        "token": token,
        "invite_url": f"/join/{token}",
        "group_id": group_id,
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

    if invite["expires_at"]:
        exp = invite["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=410, detail="This invite link has expired.")

    return {
        "group_id":   invite["group_id"],
        "group_name": invite["group_name"],
        "token":      token,
    }


@router.post("/invite/{token}/join")
def join_via_invite(
    token: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Join a group via invite token.
    User must be logged in.
    """
    result = join_group_via_invite(token, current_user["user_id"])
    return {
        "message":        "Welcome to the group!" if not result["already_member"] else "You're already in this group.",
        "group_id":       result["group_id"],
        "group_name":     result["group_name"],
        "already_member": result["already_member"],
    }