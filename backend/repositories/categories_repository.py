# SplitEase/backend/repositories/categories_repository.py


from core.database import get_connection


def fetch_categories() -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT category_id, category_name FROM Categories ORDER BY category_id ASC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_subcategories(category_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT subcategory_id, subcategory_name FROM Subcategories WHERE category_id = %s ORDER BY subcategory_id ASC",
        (category_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def fetch_category_by_id(category_id: int) -> dict | None:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT category_id, category_name FROM Categories WHERE category_id = %s",
        (category_id,),
    )
    row = cur.fetchone()
    cur.close(); conn.close()
    return row