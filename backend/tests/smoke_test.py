# SplitEase/backend/tests/smoke_test.py
"""
Run against deployed backend to verify critical paths are alive.
Usage: python tests/smoke_test.py https://your-render-url.onrender.com
"""
import sys
import requests

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

def check(name, r, expected=200):
    status = "✅" if r.status_code == expected else "❌"
    print(f"{status} {name}: {r.status_code}")
    if r.status_code != expected:
        print(f"   {r.text[:200]}")

# Health
check("Health check", requests.get(f"{BASE}/health"))

# Auth — signup with throwaway account
import random, string
rand = ''.join(random.choices(string.ascii_lowercase, k=8))
email = f"smoketest_{rand}@example.com"

r = requests.post(f"{BASE}/api/v1/auth/signup", json={
    "name": "Smoke Test", "email": email, "password": "smoketest123"
})
check("Signup", r, 201)

if r.status_code == 201:
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    check("GET /auth/me",        requests.get(f"{BASE}/api/v1/auth/me", headers=headers))
    check("GET /groups/",        requests.get(f"{BASE}/api/v1/groups/", headers=headers))
    check("GET /users/",         requests.get(f"{BASE}/api/v1/users/", headers=headers))
    check("GET /notifications/", requests.get(f"{BASE}/api/v1/notifications/", headers=headers))
    check("GET /timeline/",      requests.get(f"{BASE}/api/v1/timeline/", headers=headers))
    check("GET /loans/",         requests.get(f"{BASE}/api/v1/loans/", headers=headers))
    check("GET /borrows/",       requests.get(f"{BASE}/api/v1/borrows/", headers=headers))
    check("GET /income/",        requests.get(f"{BASE}/api/v1/income/", headers=headers))
    check("GET /personal-expenses/", requests.get(f"{BASE}/api/v1/personal-expenses/", headers=headers))
    check("GET /groups/categories",  requests.get(f"{BASE}/api/v1/groups/categories", headers=headers))

    # Forgot password (should always return 200)
    check("POST /auth/forgot-password",
        requests.post(f"{BASE}/api/v1/auth/forgot-password", json={"email": email}))

print("\nDone.")