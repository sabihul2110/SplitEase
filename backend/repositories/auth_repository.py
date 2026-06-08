# backend/repositories/auth_repository.py
from database import get_connection


def create_reset_token(user_id: int, token_hash: str, expires_at: str) -> None:
    """
    Invalidates any existing unused tokens for the user, then inserts a new one.
    token_hash is SHA-256(raw_token) — never store the raw token.
    """
    conn = get_connection()
    cur  = conn.cursor()
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
    finally:
        cur.close(); conn.close()


def get_reset_token(token_hash: str) -> dict | None:
    """
    Look up a reset token by hash.
    Only returns rows that are unused AND not yet expired.
    Expired/used tokens return None — validation happens at the DB, not the caller.
    """
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM PasswordResetTokens WHERE token = %s AND used = 0 AND expires_at > NOW()",
        (token_hash,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row


def use_reset_token(token_hash: str, user_id: int, new_password_hash: str) -> None:
    """
    Atomically: marks token used + updates password + bumps token_version.
    Bumping token_version invalidates all existing JWTs for this user.
    """
    conn = get_connection()
    cur  = conn.cursor()
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
    finally:
        cur.close(); conn.close()


def update_password_and_bump_version(user_id: int, new_password_hash: str) -> None:
    """
    Updates password hash and bumps token_version atomically.
    Called by change_user_password — invalidates all existing JWTs for this user.
    """
    conn = get_connection()
    cur  = conn.cursor()
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
    finally:
        cur.close(); conn.close()