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


import time
from mysql.connector.errors import PoolError
from contextlib import contextmanager

def get_connection():
    # Attempting to grab a connection for up to 5 seconds
    for _ in range(25):
        try:
            return _get_pool().get_connection()
        except PoolError:
            time.sleep(0.2)
    raise RuntimeError("Database connection pool exhausted")

@contextmanager
def get_db():
    """
    Context manager that guarantees connection + cursor are always closed.
    Usage:
        with get_db() as (conn, cur):
            cur.execute(...)
            rows = cur.fetchall()
    """
    conn = get_connection()  # <--- FIX: Now it waits in the queue!
    cur  = conn.cursor(dictionary=True)
    try:
        yield conn, cur
    finally:
        cur.close()
        conn.close()