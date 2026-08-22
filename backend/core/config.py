# SplitEase/backend/core/config.py
"""
config.py — all settings via pydantic-settings.
Validates required fields at startup. Crashes immediately with a clear
error message if anything is missing or wrong, rather than failing at
first use deep in a request handler.
"""

import sys
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # ── MySQL ──────────────────────────────────────────────────────────────
    DB_HOST:     str = "localhost"
    DB_PORT:     int = 3306
    DB_USER:     str = "root"
    DB_PASSWORD: str = ""
    DB_NAME:     str = "splitease_db"
    DB_SSL_DISABLED: bool = False

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET:         str = "dev_secret_change_me"
    JWT_ALGORITHM:      str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # ── CORS ───────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # ── Invite ─────────────────────────────────────────────────────────────
    INVITE_EXPIRY_HOURS: int = 72

    # ── AI ─────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Sentry ─────────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Email (Brevo) ──────────────────────────────────────────────────────
    BREVO_SMTP_KEY: str = ""
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "sabihul2024@gmail.com"

    # ── Frontend URL ───────────────────────────────────────────────────────
    APP_BASE_URL: str = "http://localhost:5173"

    # ── Env ────────────────────────────────────────────────────────────────
    TESTING: bool = False

    # ── Dev-only OTP bypass ────────────────────────────────────────────────
    # Comma-separated list of emails that get auto-verified on signup,
    # skipping the OTP mail entirely. Leave empty in real production —
    # this is for your own test accounts during dev/preview builds only.
    DEV_AUTO_VERIFY_EMAILS: str = ""

    # ── Cron / scheduled sweeps (hit by UptimeRobot) ─────────────────────────
    CRON_SECRET: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_must_be_changed(cls, v: str, info) -> str:
        testing = (info.data or {}).get("TESTING", False)
        if v == "dev_secret_change_me" and not testing:
            print(
                "\n[FATAL] JWT_SECRET is still the insecure default.\n"
                "        Set a strong secret in backend/.env\n"
                "        Generate: python -c \"import secrets; print(secrets.token_hex(32))\"\n",
                file=sys.stderr,
            )
            sys.exit(1)
        return v


settings = Settings()

# ── Derived values kept as module-level constants for backward compat ──────
# All routers that did `from config import X` continue to work unchanged.

DB_CONFIG: dict = {
    "host":               settings.DB_HOST,
    "port":               settings.DB_PORT,
    "user":               settings.DB_USER,
    "password":           settings.DB_PASSWORD,
    "database":           settings.DB_NAME,
    "ssl_disabled":       settings.DB_SSL_DISABLED,
    "connection_timeout": 30,
    "use_pure":           False,
}

JWT_SECRET:         str = settings.JWT_SECRET
JWT_ALGORITHM:      str = settings.JWT_ALGORITHM
JWT_EXPIRE_MINUTES: int = settings.JWT_EXPIRE_MINUTES

ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in settings.ALLOWED_ORIGINS.split(",")
    if o.strip()
]

INVITE_EXPIRY_HOURS: int       = settings.INVITE_EXPIRY_HOURS
GEMINI_API_KEY:      str       = settings.GEMINI_API_KEY
SENTRY_DSN:          str       = settings.SENTRY_DSN
# BREVO_SMTP_KEY: str = settings.BREVO_SMTP_KEY or settings.BREVO_API_KEY
BREVO_API_KEY: str = settings.BREVO_API_KEY
BREVO_SENDER_EMAIL: str = settings.BREVO_SENDER_EMAIL
APP_BASE_URL:        str       = settings.APP_BASE_URL
CRON_SECRET:         str       = settings.CRON_SECRET

DEV_AUTO_VERIFY_EMAILS: frozenset[str] = frozenset(
    e.strip().lower()
    for e in settings.DEV_AUTO_VERIFY_EMAILS.split(",")
    if e.strip()
)

VALID_SOURCE_TYPES: frozenset[str] = frozenset({
    "salary", "pocket_money", "stipend", "other"
})