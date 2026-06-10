# backend/repositories/settlement_repository.py
from core.database import get_connection, get_db


def calculate_settlements(group_id: int, user_id: int) -> list[dict]:
    with get_db() as (conn, cur):
        cur.execute(
            "SELECT 1 FROM Group_Members WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        )
        if cur.fetchone() is None:
            return []
        cur.callproc("Calculate_Settlements", [group_id])
        results = []
        for result in cur.stored_results():
            results = result.fetchall()
        return results


def fetch_settlements_for_groups(group_ids: list[int]) -> dict[int, list[dict]]:
    if not group_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(group_ids))
    conn = get_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        f"""
        SELECT gm.group_id, u.user_id, u.name AS user_name, u.upi_id,
               IFNULL(paid.total_paid,        0.00) AS total_paid,
               IFNULL(owed.total_owed,        0.00) AS total_owed,
               IFNULL(psent.payments_sent,    0.00) AS payments_sent,
               IFNULL(prec.payments_received, 0.00) AS payments_received,
               (
                   IFNULL(paid.total_paid,        0.00)
                 - IFNULL(owed.total_owed,        0.00)
                 + IFNULL(psent.payments_sent,    0.00)
                 - IFNULL(prec.payments_received, 0.00)
               ) AS net_balance
        FROM Group_Members gm
        JOIN Users u ON u.user_id = gm.user_id
        LEFT JOIN (
            SELECT group_id, payer_id, SUM(total_amount) AS total_paid
            FROM Expenses WHERE group_id IN ({placeholders})
            GROUP BY group_id, payer_id
        ) paid ON paid.group_id = gm.group_id AND paid.payer_id = u.user_id
        LEFT JOIN (
            SELECT e.group_id, es.user_id, SUM(es.amount_owed) AS total_owed
            FROM Expense_Splits es JOIN Expenses e ON e.expense_id = es.expense_id
            WHERE e.group_id IN ({placeholders})
            GROUP BY e.group_id, es.user_id
        ) owed ON owed.group_id = gm.group_id AND owed.user_id = u.user_id
        LEFT JOIN (
            SELECT group_id, payer_id, SUM(amount) AS payments_sent
            FROM Payments WHERE group_id IN ({placeholders})
            GROUP BY group_id, payer_id
        ) psent ON psent.group_id = gm.group_id AND psent.payer_id = u.user_id
        LEFT JOIN (
            SELECT group_id, payee_id, SUM(amount) AS payments_received
            FROM Payments WHERE group_id IN ({placeholders})
            GROUP BY group_id, payee_id
        ) prec ON prec.group_id = gm.group_id AND prec.payee_id = u.user_id
        WHERE gm.group_id IN ({placeholders})
        ORDER BY gm.group_id, net_balance DESC
        """,
        group_ids * 5,
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    result: dict[int, list[dict]] = {gid: [] for gid in group_ids}
    for r in rows:
        gid = r.pop("group_id")
        r["net_balance"]       = float(r["net_balance"])
        r["total_paid"]        = float(r["total_paid"])
        r["total_owed"]        = float(r["total_owed"])
        r["payments_sent"]     = float(r["payments_sent"])
        r["payments_received"] = float(r["payments_received"])
        result[gid].append(r)
    return result