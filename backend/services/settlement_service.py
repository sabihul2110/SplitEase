# backend/services/settlement_service.py
"""
Settlement calculation logic.
simplify_debts is a pure algorithm — no DB, no HTTP.
Moved here from settlement_repository where it did not belong.
"""


def simplify_debts(rows: list[dict]) -> list[dict]:
    """
    Greedy debt-simplification algorithm.
    Input:  list of settlement rows, each with user_id, user_name, upi_id, net_balance.
    Output: minimal list of transactions that clear all debts.
    """
    creditors: list[list] = []
    debtors:   list[list] = []

    for r in rows:
        balance = float(r.get("net_balance", 0))
        entry = {
            "user_id": r["user_id"],
            "name":    r["user_name"],
            "upi_id":  r.get("upi_id"),
        }
        if balance > 0.005:
            creditors.append([entry, balance])
        elif balance < -0.005:
            debtors.append([entry, -balance])

    settlements = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        debtor,   debt   = debtors[i]
        creditor, credit = creditors[j]
        amount = round(min(debt, credit), 2)

        settlements.append({
            "from":         debtor["name"],
            "from_user_id": debtor["user_id"],
            "to":           creditor["name"],
            "to_user_id":   creditor["user_id"],
            "to_upi_id":    creditor["upi_id"],
            "amount":       amount,
        })

        debtors[i][1]   = round(debtors[i][1]   - amount, 2)
        creditors[j][1] = round(creditors[j][1] - amount, 2)

        if debtors[i][1]   < 0.005: i += 1
        if creditors[j][1] < 0.005: j += 1

    return settlements