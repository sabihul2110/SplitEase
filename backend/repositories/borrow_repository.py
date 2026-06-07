# backend/repositories/borrow_repository.py
from database import get_connection


def fetch_borrows(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT borrow_id, lender_name, amount, remaining_amount,
               note, borrow_date, status, created_at
        FROM   Borrows
        WHERE  borrower_user_id = %s
        ORDER  BY borrow_date DESC, borrow_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["borrow_date"]      = str(r["borrow_date"]) if r.get("borrow_date") else ""
        r["created_at"]       = str(r["created_at"])  if r.get("created_at")  else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def insert_borrow(
    borrower_user_id: int,
    lender_name: str,
    amount: float,
    note: str | None,
    borrow_date: str,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Borrows
                (borrower_user_id, lender_name, amount, remaining_amount, note, borrow_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            """,
            (
                borrower_user_id,
                lender_name.strip(),
                round(float(amount), 2),
                round(float(amount), 2),
                note or None,
                borrow_date,
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


def record_borrow_repayment(borrow_id: int, user_id: int, repayment_amount: float) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            """
            SELECT borrow_id, remaining_amount, status
            FROM   Borrows
            WHERE  borrow_id = %s AND borrower_user_id = %s
            FOR UPDATE
            """,
            (borrow_id, user_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Borrow not found or not owned by user.")
        if row["status"] == "repaid":
            raise ValueError("Borrow is already fully repaid.")
        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)
        if repay <= 0:
            raise ValueError("Repayment must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")
        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"
        cur.execute(
            "UPDATE Borrows SET remaining_amount = %s, status = %s WHERE borrow_id = %s",
            (new_remaining, new_status, borrow_id),
        )
        conn.commit()
        return {"borrow_id": borrow_id, "remaining_amount": new_remaining, "status": new_status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_borrow(borrow_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Borrows WHERE borrow_id = %s AND borrower_user_id = %s",
            (borrow_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()