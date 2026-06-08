# backend/infrastructure/email_service.py

import logging
import requests
from config import BREVO_SMTP_KEY, BREVO_SENDER_EMAIL, APP_BASE_URL

logger = logging.getLogger("splitease.email")

def send_reset_email(to_email: str, name: str, token: str) -> None:
    if not BREVO_SMTP_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("Email not configured — check your Brevo env vars.")

    # We center the text and make the OTP massive with letter-spacing
    html = f"""
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;
                background:#0a0d14;color:#f0f4ff;border-radius:12px;border:1px solid #242a3d;text-align:center;">
      
      <div style="display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
        <img src="https://raw.githubusercontent.com/sabihul2110/SplitEase/main/mobile/assets/icon.png" 
             alt="SplitEase Logo" 
             style="width:48px;height:48px;border-radius:12px;display:block;margin-right:12px;">
        <span style="font-size:24px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">
          Split<span style="color:#2563eb;">Ease</span>
        </span>
      </div>

      <h2 style="color:#f0f4ff;margin:0 0 16px;font-size:22px;">Your Password Reset Code</h2>
      <p style="color:#8892b0;margin:0 0 24px;line-height:1.6;">
        Hi {name}, use the 6-digit OTP below to reset your SplitEase password.
        This code expires in <strong style="color:#f0f4ff;">15 minutes</strong>.
      </p>
      
      <div style="background:#1e2438;border-radius:8px;padding:20px;margin-bottom:24px;
                  letter-spacing:12px;font-size:36px;font-weight:800;color:#60a5fa;">
        {token}
      </div>

      <p style="color:#4a5578;font-size:13px;margin:0;">
        If you didn't request this, you can safely ignore this email.
        Your password will not change.
      </p>
    </div>
    """

    url = "https://api.brevo.com/v3/smtp/email"
    
    payload = {
        "sender": {"name": "SplitEase", "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": name}],
        "subject": "SplitEase Recovery Code: " + token,
        "htmlContent": html
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_SMTP_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status() 
        logger.info("Reset OTP sent to=%s", to_email)
    except requests.exceptions.RequestException as e:
        logger.error("Brevo API error: %s", str(e))
        raise