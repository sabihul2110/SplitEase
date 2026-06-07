# backend/repositories/loan_repository.py
from database import get_connection


def fetch_loans(user_id: int) -> list[dict]:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT loan_id, borrower_name, amount, remaining_amount,
               note, loan_date, status, created_at
        FROM   Loans
        WHERE  lender_user_id = %s
        ORDER  BY loan_date DESC, loan_id DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        r["loan_date"]        = str(r["loan_date"]) if r.get("loan_date") else ""
        r["created_at"]       = str(r["created_at"]) if r.get("created_at") else ""
        r["amount"]           = float(r["amount"])
        r["remaining_amount"] = float(r["remaining_amount"])
    return rows


def insert_loan(
    lender_user_id: int, borrower_name: str,
    amount: float, note: str | None, loan_date: str,
) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            """
            INSERT INTO Loans
                (lender_user_id, borrower_name, amount, remaining_amount, note, loan_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            """,
            (lender_user_id, borrower_name.strip(),
             round(float(amount), 2), round(float(amount), 2),
             note or None, loan_date),
        )
        new_id = cur.lastrowid
        conn.commit()
        return new_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def record_loan_repayment(loan_id: int, user_id: int, repayment_amount: float) -> dict:
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cur.execute(
            "SELECT loan_id, remaining_amount, status FROM Loans WHERE loan_id = %s AND lender_user_id = %s FOR UPDATE",
            (loan_id, user_id),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError("Loan not found or not owned by user.")
        if row["status"] == "repaid":
            raise ValueError("Loan is already fully repaid.")
        remaining = float(row["remaining_amount"])
        repay     = round(float(repayment_amount), 2)
        if repay <= 0:
            raise ValueError("Repayment amount must be positive.")
        if repay > remaining:
            raise ValueError(f"Repayment ₹{repay} exceeds remaining ₹{remaining}.")
        new_remaining = round(remaining - repay, 2)
        new_status    = "repaid" if new_remaining == 0 else "active"
        cur.execute(
            "UPDATE Loans SET remaining_amount = %s, status = %s WHERE loan_id = %s",
            (new_remaining, new_status, loan_id),
        )
        conn.commit()
        return {"loan_id": loan_id, "remaining_amount": new_remaining, "status": new_status}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()


def delete_loan(loan_id: int, user_id: int) -> None:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        conn.start_transaction()
        cur.execute(
            "DELETE FROM Loans WHERE loan_id = %s AND lender_user_id = %s",
            (loan_id, user_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close(); conn.close()