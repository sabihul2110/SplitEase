# --- backend/config.py ---
"""
config.py — loads .env and exposes all settings as constants.
Import from here everywhere else — never hardcode credentials.

FIX S7: Fail fast at startup if JWT_SECRET is still the insecure default.
         A weak secret means any attacker can forge valid tokens for any user.
         Better to crash loudly at startup than silently run insecurely.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()   # reads backend/.env into os.environ

# ── MySQL ──────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME",     "expense_splitter_react"),
    "ssl_disabled": os.getenv("DB_SSL_DISABLED", "false").lower() == "true",
}

# ── JWT ────────────────────────────────────────────────────────────────────
_INSECURE_DEFAULT = "dev_secret_change_me"

JWT_SECRET         = os.getenv("JWT_SECRET", _INSECURE_DEFAULT)
JWT_ALGORITHM      = os.getenv("JWT_ALGORITHM",      "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))

# FIX S7: Hard-fail on startup if the secret is still the placeholder.
# Skip this check only during automated testing (set TESTING=1 in test env).
if JWT_SECRET == _INSECURE_DEFAULT and os.getenv("TESTING") != "1":
    print(
        "\n[FATAL] JWT_SECRET is still set to the insecure default value.\n"
        "        Set a strong secret in backend/.env before starting the server.\n"
        "        Generate one with:  python -c \"import secrets; print(secrets.token_hex(32))\"\n",
        file=sys.stderr,
    )
    sys.exit(1)

# ── CORS ───────────────────────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins.
# Example .env entry:
#   ALLOWED_ORIGINS=https://splitease.yourdomain.com,https://www.splitease.yourdomain.com
# Defaults to localhost for local development only.
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
 
# ── INVITE ─────────────────────────────────────────────────────────────────
# Default lifetime for new invite links (hours). 0 = never expire (old behaviour).
INVITE_EXPIRY_HOURS: int = int(os.getenv("INVITE_EXPIRY_HOURS", 72))

# ── AI — Google Gemini ─────────────────────────────────────────────────────
# NOTE: The env var is named GEMINI_API_KEY throughout. The SDK is google-genai.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


# ── Shared constants ───────────────────────────────────────────────────────
VALID_SOURCE_TYPES: frozenset[str] = frozenset({
    "salary", "pocket_money", "stipend", "other"
})