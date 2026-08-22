# backend/repositories/auth_repository.py
from core.database import get_db


def create_reset_token(user_id: int, token_hash: str, expires_at: str) -> None:
    """
    Invalidates any existing unused tokens for the user, then inserts a new one.
    token_hash is SHA-256(raw_token) — never store the raw token.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "UPDATE PasswordResetTokens SET used=1 WHERE user_id=%s AND used=0",
                (user_id,),
            )
            cur.execute(
                "INSERT INTO PasswordResetTokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, token_hash, expires_at),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def get_reset_token(token_hash: str) -> dict | None:
    """
    Look up a reset token by hash — returns the row regardless of used/expired
    status so the service layer can return a specific error message to the user.
    """
    with get_db() as (conn, cur):
        cur.execute(
            "SELECT * FROM PasswordResetTokens WHERE token = %s",
            (token_hash,),
        )
        return cur.fetchone()


def use_reset_token(token_hash: str, user_id: int, new_password_hash: str) -> None:
    """
    Atomically: marks token used + updates password + bumps token_version.
    Bumping token_version invalidates all existing JWTs for this user.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "UPDATE PasswordResetTokens SET used=1 WHERE token=%s",
                (token_hash,),
            )
            cur.execute(
                "UPDATE Users SET password_hash=%s, token_version=token_version+1 WHERE user_id=%s",
                (new_password_hash, user_id),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def create_verification_token(user_id: int, token_hash: str, expires_at: str) -> None:
    """
    Invalidates any existing unused verification tokens for the user, then inserts a new one.
    token_hash is SHA-256(raw_token) — never store the raw token.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "UPDATE EmailVerificationTokens SET used=1 WHERE user_id=%s AND used=0",
                (user_id,),
            )
            cur.execute(
                "INSERT INTO EmailVerificationTokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, token_hash, expires_at),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def get_verification_token(token_hash: str, user_id: int) -> dict | None:
    """
    Look up a verification token by hash and user_id — returns the row regardless
    of used/expired status so the service layer can return a specific error message.
    """
    with get_db() as (conn, cur):
        cur.execute(
            "SELECT * FROM EmailVerificationTokens WHERE token=%s AND user_id=%s",
            (token_hash, user_id),
        )
        return cur.fetchone()


def use_verification_token(token_hash: str, user_id: int) -> None:
    """
    Atomically: marks token used + sets email_verified=1 on the user row.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "UPDATE EmailVerificationTokens SET used=1 WHERE token=%s",
                (token_hash,),
            )
            cur.execute(
                "UPDATE Users SET email_verified=1 WHERE user_id=%s",
                (user_id,),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def mark_email_verified(user_id: int) -> None:
    """
    Directly sets email_verified=1, bypassing the OTP token flow entirely.
    Used only for the dev auto-verify allowlist — never called from the
    normal signup/verify path.
    """
    with get_db() as (conn, cur):
        cur.execute(
            "UPDATE Users SET email_verified=1 WHERE user_id=%s",
            (user_id,),
        )
        conn.commit()


def update_password_and_bump_version(user_id: int, new_password_hash: str) -> None:
    """
    Updates password hash and bumps token_version atomically.
    Called by change_user_password — invalidates all existing JWTs for this user.
    """
    with get_db() as (conn, cur):
        try:
            conn.start_transaction()
            cur.execute(
                "UPDATE Users SET password_hash = %s, token_version = token_version + 1 WHERE user_id = %s",
                (new_password_hash, user_id),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise