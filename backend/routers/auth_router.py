# backend/routers/auth_router.py
import logging
import time
import threading
from collections import defaultdict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from schemas.auth import (
    SignupRequest, LoginRequest, AuthResponse,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
import mysql.connector

from services.auth_service import (
    login_user, register_user,
    initiate_password_reset, complete_password_reset,
    change_user_password,
)

from core.dependencies import get_current_user
from core.database import get_connection, get_db
from infrastructure.email_service import send_reset_email

logger = logging.getLogger("splitease.auth")
router = APIRouter(tags=["Auth"])

# ── Rate limiters ──────────────────────────────────────────────────────────
_LOGIN_WINDOW   = 60;  _LOGIN_MAX   = 10
_FORGOT_WINDOW  = 300; _FORGOT_MAX  = 3
_login_attempts:  dict[str, list[float]] = defaultdict(list)
_forgot_attempts: dict[str, list[float]] = defaultdict(list)
_login_lock  = threading.Lock()
_forgot_lock = threading.Lock()

def _rate_check(store, lock, ip, window, max_attempts, retry_after):
    now = time.monotonic()
    with lock:
        store[ip] = [t for t in store[ip] if now - t < window]
        if len(store[ip]) >= max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        store[ip].append(now)

# ── Schemas ────────────────────────────────────────────────────────────────
# class SignupRequest(BaseModel):
#     name:     str
#     email:    EmailStr
#     password: str
#     upi_id:   str | None = None

# class LoginRequest(BaseModel):
#     email:    EmailStr
#     password: str

# class AuthResponse(BaseModel):
#     access_token: str
#     token_type:   str = "bearer"
#     user_id:      int
#     name:         str
#     role:         str
#     email:        str

# class ChangePasswordRequest(BaseModel):
#     current_password: str
#     new_password:     str
#     confirm_password: str

# class ForgotPasswordRequest(BaseModel):
#     email: EmailStr

# class ResetPasswordRequest(BaseModel):
#     token:            str
#     new_password:     str
#     confirm_password: str

# ── Routes ─────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    try:
        result = register_user(
            name=body.name,
            email=body.email,
            password=body.password,
            upi_id=body.upi_id,
        )
    except mysql.connector.IntegrityError:
        raise HTTPException(409, "An account with this email already exists.")
    return AuthResponse(**result)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _rate_check(_login_attempts, _login_lock, client_ip, _LOGIN_WINDOW, _LOGIN_MAX, _LOGIN_WINDOW)

    result = login_user(body.email, body.password)
    if not result:
        raise HTTPException(401, "Invalid email or password.")
    return AuthResponse(**result)


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    with get_db() as (conn, cur):
        cur.execute(
            "SELECT user_id, name, email, role, upi_id FROM Users WHERE user_id = %s",
            (current_user["user_id"],),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(401, "User no longer exists.")
    return user


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body:         ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    if len(body.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters.")
    if body.new_password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")
    if body.current_password == body.new_password:
        raise HTTPException(400, "New password must differ from the current one.")
    try:
        change_user_password(
            user_id=current_user["user_id"],
            email=current_user["email"],
            current_password=body.current_password,
            new_password=body.new_password,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"message": "Password changed. All other sessions have been logged out."}


@router.post("/forgot-password")
def forgot_password(
    body:             ForgotPasswordRequest,
    request:          Request,
    background_tasks: BackgroundTasks,
):
    client_ip = request.client.host if request.client else "unknown"
    _rate_check(_forgot_attempts, _forgot_lock, client_ip, _FORGOT_WINDOW, _FORGOT_MAX, _FORGOT_WINDOW)

    result = initiate_password_reset(body.email)
    if result:
        background_tasks.add_task(
            send_reset_email,
            result["user"]["email"],
            result["user"]["name"],
            result["raw_token"],
        )
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    if body.new_password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")
    try:
        complete_password_reset(body.token.strip(), body.new_password)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"message": "Password reset. Please log in with your new password."}