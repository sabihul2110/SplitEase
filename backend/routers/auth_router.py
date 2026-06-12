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
    generate_verification_token, complete_email_verification,
)

from core.dependencies import get_current_user
from core.database import get_connection, get_db
from infrastructure.email_service import send_reset_email, send_verification_email

logger = logging.getLogger("splitease.auth")
router = APIRouter(tags=["Auth"])

# ── Rate limiters ──────────────────────────────────────────────────────────
_LOGIN_WINDOW   = 60;  _LOGIN_MAX   = 10
_FORGOT_WINDOW  = 300; _FORGOT_MAX  = 3
_VERIFY_WINDOW  = 300; _VERIFY_MAX  = 3   
_login_attempts:  dict[str, list[float]] = defaultdict(list)
_forgot_attempts: dict[str, list[float]] = defaultdict(list)
_verify_attempts: dict[str, list[float]] = defaultdict(list)
_login_lock  = threading.Lock()
_forgot_lock = threading.Lock()
_verify_lock = threading.Lock()

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
def signup(body: SignupRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _rate_check(_verify_attempts, _verify_lock, client_ip, _VERIFY_WINDOW, _VERIFY_MAX, _VERIFY_WINDOW)

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

    sent = send_verification_email(
        result["email"],
        result["name"],
        result["raw_verification_token"],
    )
    if not sent:
        # Account created successfully but email failed — inform the caller.
        # The client should show a warning and offer a resend button.
        raise HTTPException(
            status_code=status.HTTP_207_MULTI_STATUS,
            detail="Account created, but we could not send the verification email. Use 'Resend verification' to try again.",
        )

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
            "SELECT user_id, name, email, role, upi_id, email_verified FROM Users WHERE user_id = %s",
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
async def forgot_password(
    body:             ForgotPasswordRequest,
    request:          Request,
):
    client_ip = request.client.host if request.client else "unknown"
    _rate_check(_forgot_attempts, _forgot_lock, client_ip, _FORGOT_WINDOW, _FORGOT_MAX, _FORGOT_WINDOW)

    result = initiate_password_reset(body.email)
    if result:
        sent = send_reset_email(
            result["user"]["email"],
            result["user"]["name"],
            result["raw_token"],
        )
        if not sent:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="We could not send the reset email right now. Please try again in a few minutes.",
            )
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(
    body: dict,                                  # { "token": "123456" }
    current_user: dict = Depends(get_current_user),
):
    """Consume the 6-digit OTP to mark the account as verified."""
    raw_token = (body.get("token") or "").strip()
    if not raw_token:
        raise HTTPException(400, "Verification code is required.")
    try:
        complete_email_verification(raw_token, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"message": "Email verified successfully."}


@router.post("/resend-verification")
async def resend_verification(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Re-sends the account verification OTP. Rate-limited per IP."""
    client_ip = request.client.host if request.client else "unknown"
    _rate_check(_verify_attempts, _verify_lock, client_ip, _VERIFY_WINDOW, _VERIFY_MAX, _VERIFY_WINDOW)

    from services.auth_service import generate_verification_token   # import here to avoid circular
    token_data = generate_verification_token(current_user["user_id"], current_user["email"])
    sent = send_verification_email(
        current_user["email"],
        current_user["name"],
        token_data["raw_token"],
    )
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We could not send the verification email right now. Please try again in a few minutes.",
        )
    return {"message": "Verification code sent."}


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