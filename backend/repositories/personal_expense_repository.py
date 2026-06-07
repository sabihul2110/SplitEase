# backend/repositories/personal_expense_repository.py
from database import get_connection


def fetch_personal_expenses(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT pe.expense_id, pe.amount, pe.category, pe.note,
               pe.expense_date, pe.created_at,
               pe.merchant_name,
               sc.subcategory_name
        FROM   Personal_Expenses pe
        LEFT JOIN Subcategories sc ON sc.subcategory_id = pe.subcategory_id
        WHERE  pe.user_id = %s
        ORDER  BY pe.expense_date DESC, pe.expense_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r.get("expense_date"):
            r["expense_date"] = str(r["expense_date"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


def insert_personal_expense(
    user_id: int,
    amount: float,
    category: str,
    note: str | None,
    expense_date: str,
    subcategory_id: int | None = None,
    merchant_name: str | None = None,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Personal_Expenses
                (user_id, amount, category, note, expense_date, subcategory_id, merchant_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                round(float(amount), 2),
                category.strip(),
                note or None,
                expense_date,
                subcategory_id or None,
                merchant_name.strip() if merchant_name else None,
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_personal_expense(expense_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Personal_Expenses WHERE expense_id = %s AND user_id = %s",
            (expense_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()