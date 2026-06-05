# SplitEase/backend/email_service.py

import os
import requests

# Fallback to SMTP_KEY if API_KEY isn't explicitly set
BREVO_API_KEY = os.getenv("BREVO_API_KEY", os.getenv("BREVO_SMTP_KEY", ""))
SENDER_EMAIL  = os.getenv("BREVO_SENDER_EMAIL", "")
APP_BASE_URL  = os.getenv("APP_BASE_URL", "http://localhost:5173")

def send_reset_email(to_email: str, name: str, token: str) -> None:
    if not BREVO_API_KEY or not SENDER_EMAIL:
        raise RuntimeError("Email not configured — check your Brevo env vars.")
    
    reset_link = f"{APP_BASE_URL}/reset-password?token={token}"

    html = f"""
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;
                background:#0a0d14;color:#f0f4ff;border-radius:12px;border:1px solid #242a3d;">
      <div style="width:44px;height:44px;background:#2563eb;border-radius:12px;
                  display:flex;align-items:center;justify-content:center;
                  font-size:20px;font-weight:800;color:#fff;margin-bottom:20px;">S</div>
      <h2 style="color:#f0f4ff;margin:0 0 8px;font-size:20px;">Reset your password</h2>
      <p style="color:#8892b0;margin:0 0 24px;line-height:1.6;">
        Hi {name}, click below to reset your SplitEase password.
        This link expires in <strong style="color:#f0f4ff;">15 minutes</strong>.
      </p>
      <a href="{reset_link}"
         style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;
                margin-bottom:24px;">
        Reset Password
      </a>
      <p style="color:#4a5578;font-size:13px;margin:0;">
        If you didn't request this, you can safely ignore this email.
        Your password will not change.
      </p>
    </div>
    """

    url = "https://api.brevo.com/v3/smtp/email"
    
    payload = {
        "sender": {"name": "SplitEase", "email": SENDER_EMAIL},
        "to": [{"email": to_email, "name": name}],
        "subject": "Reset your SplitEase password",
        "htmlContent": html
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        # 10 second timeout prevents the frontend from hanging indefinitely
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status() 
        print(f"[email] Successfully sent reset link to {to_email} via HTTP API")
        
    except requests.exceptions.RequestException as e:
        print(f"[email] Failed: Brevo API Error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"[email] Details: {e.response.text}")
        raise