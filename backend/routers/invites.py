# --- backend/routers/invites.py ---
"""
routers/invites.py

"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from schemas.invites import GenerateInviteRequest

from repositories import group_repository, invite_repository
from core.dependencies import get_current_user
from core.config import INVITE_EXPIRY_HOURS

router = APIRouter()


# ── Request body models ───────────────────────────────────────────────────────

# class GenerateInviteRequest(BaseModel):
#     # FIX S4a: caller can override expiry; None means "use server default"
#     expires_hours: int | None = None


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

    if not group_repository.is_group_member(group_id, user_id) and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group members can generate invite links.",
        )

    token = invite_repository.create_invite(
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
    invite = invite_repository.get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite link.")

    invite_repository.assert_not_expired(invite)

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
    result = invite_repository.join_group_via_invite(token, current_user["user_id"])
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
    
    invite = invite_repository.get_invite_by_token(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already revoked.")

    is_creator = invite["created_by"] == current_user["user_id"]
    is_admin   = current_user.get("role") == "admin"

    if not is_creator and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the invite creator or an admin can revoke this link.",
        )

    invite_repository.revoke_invite(token)

    return {"message": "Invite link revoked. It can no longer be used to join the group."}