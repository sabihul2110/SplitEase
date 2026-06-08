# SplitEase/backend/core/database.py
"""
Single source of connection management.
All repositories import get_connection() from here.
Pool is created once on first use (lazy init, thread-safe).
"""

import threading
from mysql.connector.pooling import MySQLConnectionPool
from core.config import DB_CONFIG

_pool_lock = threading.Lock()
_pool: MySQLConnectionPool | None = None


def _get_pool() -> MySQLConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = MySQLConnectionPool(
                    pool_name="splitease",
                    pool_size=10,
                    pool_reset_session=True,
                    **DB_CONFIG,
                )
    return _pool


def get_connection():
    return _get_pool().get_connection()