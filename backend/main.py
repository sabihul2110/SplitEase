# --- backend/main.py ---
"""
main.py — FastAPI entry point
Run: uvicorn main:app --reload --loop asyncio

FIX S6: CORS allowed_origins no longer hardcoded to localhost.
         Reads from ALLOWED_ORIGINS env var (comma-separated list).
         Defaults to http://localhost:5173 for local dev so existing
         workflows are unaffected — but production MUST set the env var.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS
from routers import (
    auth_router, users, groups, expenses, payments,
    settlements, invites, notifications, personal_expenses,
    income, loans, timeline, borrows, ai_agent,
)

app = FastAPI(title="College Expense Splitter API", version="2.1.0")

# FIX S6: origins come from config, which reads from the environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router,   prefix="/auth",        tags=["Auth"])
app.include_router(users.router,         prefix="/users",       tags=["Users"])
app.include_router(groups.router,        prefix="/groups",      tags=["Groups"])
app.include_router(expenses.router,      prefix="/expenses",    tags=["Expenses"])
app.include_router(payments.router,      prefix="/payments",    tags=["Payments"])
app.include_router(settlements.router,   prefix="/settlements", tags=["Settlements"])
app.include_router(invites.router,                              tags=["Invites"])
app.include_router(notifications.router,                        tags=["Notifications"])
app.include_router(personal_expenses.router)
app.include_router(income.router)
app.include_router(loans.router)
app.include_router(timeline.router)
app.include_router(borrows.router)
app.include_router(ai_agent.router)     # prefix="/ai" defined in router


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}

print("ALLOWED_ORIGINS =", ALLOWED_ORIGINS)