# --- backend/config.py ---
"""
config.py — loads .env and exposes all settings as constants.
Import from here everywhere else — never hardcode credentials.
"""

import os
from dotenv import load_dotenv

load_dotenv()   # reads backend/.env into os.environ

# ── MySQL ──────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME",     "expense_splitter_react"),
}

# ── JWT ────────────────────────────────────────────
JWT_SECRET          = os.getenv("JWT_SECRET",          "dev_secret_change_me")
JWT_ALGORITHM       = os.getenv("JWT_ALGORITHM",       "HS256")
JWT_EXPIRE_MINUTES  = int(os.getenv("JWT_EXPIRE_MINUTES", 60))