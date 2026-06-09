"""
backend/tests/test_api.py

Full integration test suite. Runs against a live backend.
Usage:
    python tests/test_api.py https://splitease-4hcc.onrender.com
    python tests/test_api.py http://localhost:8000

Tests connection pool health by making 15 concurrent requests
(more than pool_size=10) to catch leaks before deploy.
"""
import sys
import time
import random
import string
import requests
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

PASS  = "✅"
FAIL  = "❌"
WARN  = "⚠️ "
total = 0
failed = 0

def rand(n=8):
    return ''.join(random.choices(string.ascii_lowercase, k=n))

def check(name, r, expected=200):
    global total, failed
    total += 1
    ok = r.status_code == expected
    if not ok:
        failed += 1
    symbol = PASS if ok else FAIL
    print(f"  {symbol} {name}: {r.status_code}", end="")
    if not ok:
        try:
            print(f" — {r.json().get('detail', r.text[:120])}", end="")
        except Exception:
            print(f" — {r.text[:120]}", end="")
    print()
    return ok, r

def section(title):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print(f"{'─'*50}")

# ── 1. Health ─────────────────────────────────────────────────────────────────
section("1. Health")
check("GET /health", requests.get(f"{BASE}/health"))

# ── 2. Auth ───────────────────────────────────────────────────────────────────
section("2. Auth — signup + login + me")
email = f"test_{rand()}@test.invalid"
password = "TestPass123!"

ok, r = check("POST /auth/signup", requests.post(f"{BASE}/api/v1/auth/signup", json={
    "name": "Test User", "email": email, "password": password
}), 201)

token = None
user_id = None
if ok:
    token = r.json()["access_token"]
    user_id = r.json()["user_id"]
    H = {"Authorization": f"Bearer {token}"}

    check("GET /auth/me", requests.get(f"{BASE}/api/v1/auth/me", headers=H))

    ok2, r2 = check("POST /auth/login", requests.post(f"{BASE}/api/v1/auth/login", json={
        "email": email, "password": password
    }))
    if ok2:
        token = r2.json()["access_token"]
        H = {"Authorization": f"Bearer {token}"}

    check("POST /auth/login — wrong password (expect 401)",
        requests.post(f"{BASE}/api/v1/auth/login", json={"email": email, "password": "wrong"}), 401)

    check("POST /auth/forgot-password",
        requests.post(f"{BASE}/api/v1/auth/forgot-password", json={"email": email}))

    check("POST /auth/forgot-password — unknown email (should still 200)",
        requests.post(f"{BASE}/api/v1/auth/forgot-password", json={"email": "nobody@nowhere.invalid"}))
else:
    print(f"  {WARN} Skipping auth-dependent tests — signup failed")
    sys.exit(1)

# ── 3. Users ──────────────────────────────────────────────────────────────────
section("3. Users")
check("GET /users/",       requests.get(f"{BASE}/api/v1/users/", headers=H))
check("PUT /users/me",     requests.put(f"{BASE}/api/v1/users/me", headers=H, json={
    "name": "Test User Updated", "email": email
}))
check("GET /auth/me (after update)", requests.get(f"{BASE}/api/v1/auth/me", headers=H))

# ── 4. Groups ─────────────────────────────────────────────────────────────────
section("4. Groups — create + read + bulk")
ok_g, r_g = check("POST /groups/ (expect 201)",
    requests.post(f"{BASE}/api/v1/groups/", headers=H, json={
        "group_name": f"Test Group {rand(4)}", "user_ids": [user_id]
    }), 201)

group_id = None
if ok_g:
    group_id = r_g.json()["group_id"]
    check("GET /groups/",          requests.get(f"{BASE}/api/v1/groups/", headers=H))
    check("GET /groups/categories", requests.get(f"{BASE}/api/v1/groups/categories", headers=H))
    check("GET /groups/{id}/members", requests.get(f"{BASE}/api/v1/groups/{group_id}/members", headers=H))
    check("POST /groups/members-bulk", requests.post(f"{BASE}/api/v1/groups/members-bulk", headers=H, json={"group_ids": [group_id]}))
    check("POST /groups/has-expenses-bulk", requests.post(f"{BASE}/api/v1/groups/has-expenses-bulk", headers=H, json={"group_ids": [group_id]}))

# ── 5. Expenses ───────────────────────────────────────────────────────────────
section("5. Expenses")
expense_id = None
if group_id:
    ok_e, r_e = check("POST /expenses/{group_id} (expect 201)",
        requests.post(f"{BASE}/api/v1/expenses/{group_id}", headers=H, json={
            "payer_id": user_id, "category_id": 1, "total_amount": 300.0,
            "description": "Test expense", "split_type": "equal",
            "expense_date": "2026-06-01",
            "splits": [{"user_id": user_id, "amount_owed": 300.0, "share_pct": 100.0}]
        }), 201)
    if ok_e:
        expense_id = r_e.json()["expense_id"]
        check("GET /expenses/{group_id}", requests.get(f"{BASE}/api/v1/expenses/{group_id}", headers=H))
        check("GET /expenses/{group_id}/settlement-status",
            requests.get(f"{BASE}/api/v1/expenses/{group_id}/settlement-status", headers=H))

# ── 6. Payments ───────────────────────────────────────────────────────────────
section("6. Payments")
if group_id:
    check("GET /payments/{group_id}", requests.get(f"{BASE}/api/v1/payments/{group_id}", headers=H))

# ── 7. Settlements ────────────────────────────────────────────────────────────
section("7. Settlements")
if group_id:
    check("GET /settlements/{group_id}",           requests.get(f"{BASE}/api/v1/settlements/{group_id}", headers=H))
    check("GET /settlements/{group_id}/simplified", requests.get(f"{BASE}/api/v1/settlements/{group_id}/simplified", headers=H))
    check("POST /settlements/bulk",                 requests.post(f"{BASE}/api/v1/settlements/bulk", headers=H, json={"group_ids": [group_id]}))

# ── 8. Timeline ───────────────────────────────────────────────────────────────
section("8. Timeline")
check("GET /timeline/", requests.get(f"{BASE}/api/v1/timeline/", headers=H))

# ── 9. Notifications ──────────────────────────────────────────────────────────
section("9. Notifications")
check("GET /notifications/",             requests.get(f"{BASE}/api/v1/notifications/", headers=H))
check("GET /notifications/unread-count", requests.get(f"{BASE}/api/v1/notifications/unread-count", headers=H))

# ── 10. Personal finances ─────────────────────────────────────────────────────
section("10. Personal finances — expenses, income, loans, borrows")
ok_pe, r_pe = check("POST /personal-expenses/ (expect 201)",
    requests.post(f"{BASE}/api/v1/personal-expenses/", headers=H, json={
        "amount": 150.0, "category": "Coffee", "expense_date": "2026-06-01"
    }), 201)
if ok_pe:
    pe_id = r_pe.json()["expense_id"]
    check("GET /personal-expenses/", requests.get(f"{BASE}/api/v1/personal-expenses/", headers=H))
    check("DELETE /personal-expenses/{id}", requests.delete(f"{BASE}/api/v1/personal-expenses/{pe_id}/", headers=H))

ok_inc, r_inc = check("POST /income/ (expect 201)",
    requests.post(f"{BASE}/api/v1/income/", headers=H, json={
        "amount": 5000.0, "source_type": "salary", "income_date": "2026-06-01"
    }), 201)
if ok_inc:
    inc_id = r_inc.json()["income_id"]
    check("GET /income/", requests.get(f"{BASE}/api/v1/income/", headers=H))
    check("DELETE /income/{id}", requests.delete(f"{BASE}/api/v1/income/{inc_id}/", headers=H))

ok_ln, r_ln = check("POST /loans/ (expect 201)",
    requests.post(f"{BASE}/api/v1/loans/", headers=H, json={
        "borrower_name": "Rahul", "amount": 500.0, "loan_date": "2026-06-01"
    }), 201)
if ok_ln:
    loan_id = r_ln.json()["loan_id"]
    check("GET /loans/", requests.get(f"{BASE}/api/v1/loans/", headers=H))
    check("POST /loans/{id}/repay",
        requests.post(f"{BASE}/api/v1/loans/{loan_id}/repay", headers=H, json={"repayment_amount": 200.0}))
    check("DELETE /loans/{id}", requests.delete(f"{BASE}/api/v1/loans/{loan_id}", headers=H))

ok_br, r_br = check("POST /borrows/ (expect 201)",
    requests.post(f"{BASE}/api/v1/borrows/", headers=H, json={
        "lender_name": "Mom", "amount": 1000.0, "borrow_date": "2026-06-01"
    }), 201)
if ok_br:
    borrow_id = r_br.json()["borrow_id"]
    check("GET /borrows/", requests.get(f"{BASE}/api/v1/borrows/", headers=H))
    check("POST /borrows/{id}/repay",
        requests.post(f"{BASE}/api/v1/borrows/{borrow_id}/repay", headers=H, json={"repayment_amount": 500.0}))
    check("DELETE /borrows/{id}", requests.delete(f"{BASE}/api/v1/borrows/{borrow_id}", headers=H))

# ── 11. Connection pool stress test ───────────────────────────────────────────
section("11. Connection pool stress test (15 concurrent /auth/me)")
print("  Firing 15 concurrent requests (pool_size=10) to detect leaks…")
errors = []
def hit_me():
    try:
        r = requests.get(f"{BASE}/api/v1/auth/me", headers=H, timeout=10)
        return r.status_code
    except Exception as e:
        return str(e)

with ThreadPoolExecutor(max_workers=15) as ex:
    futures = [ex.submit(hit_me) for _ in range(15)]
    results = [f.result() for f in as_completed(futures)]

pool_ok = all(r == 200 for r in results)
status_counts = {}
for r in results:
    status_counts[r] = status_counts.get(r, 0) + 1

if pool_ok:
    print(f"  {PASS} All 15 requests returned 200 — pool is healthy")
else:
    failed += 1
    print(f"  {FAIL} Pool stress failed: {status_counts}")

total += 1

# ── 12. Cleanup ───────────────────────────────────────────────────────────────
section("12. Cleanup — delete test expense + group")
if expense_id:
    check("DELETE /expenses/{id}", requests.delete(f"{BASE}/api/v1/expenses/{expense_id}", headers=H))
if group_id:
    check("DELETE /groups/{id}?force=true",
        requests.delete(f"{BASE}/api/v1/groups/{group_id}?force=true", headers=H))

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'═'*50}")
passed = total - failed
symbol = PASS if failed == 0 else FAIL
print(f"  {symbol} {passed}/{total} passed  |  {failed} failed")
print(f"{'═'*50}\n")
sys.exit(0 if failed == 0 else 1)