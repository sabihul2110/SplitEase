# --- backend/main.py ---


import uuid
import sentry_sdk
from fastapi import FastAPI, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from core.config import ALLOWED_ORIGINS, SENTRY_DSN
from core.logging import configure_logging, logger
from core.exceptions import global_exception_handler

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.2,   # 20% of requests traced — free tier safe
        profiles_sample_rate=0.1,
        environment="production",
    )

from routers import (
    auth_router, users, groups, expenses, payments,
    settlements, invites, notifications, personal_expenses,
    income, loans, people, ledger_notifications, timeline, borrows, ai_agent, quick_templates, recurring_bills, pending_bills, routines,
)

configure_logging()

app = FastAPI(title="SplitEase API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.add_exception_handler(Exception, global_exception_handler)


api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(auth_router.router,         prefix="/auth",             tags=["Auth"])
api_v1.include_router(users.router,               prefix="/users",            tags=["Users"])
api_v1.include_router(groups.router,              prefix="/groups",           tags=["Groups"])
api_v1.include_router(expenses.router,            prefix="/expenses",         tags=["Expenses"])
api_v1.include_router(payments.router,            prefix="/payments",         tags=["Payments"])
api_v1.include_router(settlements.router,         prefix="/settlements",      tags=["Settlements"])
api_v1.include_router(invites.router,                                         tags=["Invites"])
api_v1.include_router(notifications.router,                                   tags=["Notifications"])
api_v1.include_router(personal_expenses.router,                               tags=["Personal Expenses"])
api_v1.include_router(income.router,                                          tags=["Income"])
api_v1.include_router(loans.router,                                           tags=["Loans"])
api_v1.include_router(people.router,                                          tags=["People"])
api_v1.include_router(ledger_notifications.router,                            tags=["Ledger Notifications"])
api_v1.include_router(timeline.router,                                        tags=["Timeline"])
api_v1.include_router(borrows.router,                                         tags=["Borrows"])
api_v1.include_router(ai_agent.router,                                        tags=["AI Agent"])
api_v1.include_router(quick_templates.router,     prefix="/quick-templates",  tags=["Quick Templates"])
api_v1.include_router(recurring_bills.router,     prefix="/recurring-bills",  tags=["Recurring Bills"])
api_v1.include_router(pending_bills.router,       prefix="/pending-bills",    tags=["Pending Bills"])
api_v1.include_router(routines.router,            prefix="/routines",         tags=["Routines"])

app.include_router(api_v1)


@app.get("/health", tags=["Health"])
@app.head("/health", tags=["Health"])
def health():
    return {"status": "ok"}

logger.info("ALLOWED_ORIGINS = %s", ALLOWED_ORIGINS)