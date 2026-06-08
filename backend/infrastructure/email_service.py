# backend/infrastructure/email_service.py

import logging
import requests
from config import BREVO_SMTP_KEY, BREVO_SENDER_EMAIL, APP_BASE_URL

logger = logging.getLogger("splitease.email")

def send_reset_email(to_email: str, name: str, token: str) -> None:
    if not BREVO_SMTP_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("Email not configured — check your Brevo env vars.")
    
    reset_link = f"{APP_BASE_URL}/reset-password?token={token}"

    html = f"""
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;
                background:#0a0d14;color:#f0f4ff;border-radius:12px;border:1px solid #242a3d;">
      
      <div style="display:flex;align-items:center;margin-bottom:24px;">
        <img src="https://raw.githubusercontent.com/sabihul2110/SplitEase/main/mobile/assets/icon.png" 
             alt="SplitEase Logo" 
             style="width:48px;height:48px;border-radius:12px;display:block;margin-right:12px;">
        <span style="font-size:24px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">
          Split<span style="color:#2563eb;">Ease</span>
        </span>
      </div>

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
      
      <p style="color:#8892b0;font-size:13px;margin:0 0 16px;border-top:1px solid #242a3d;padding-top:16px;">
        Or copy this token manually into the SplitEase app:<br/>
        <code style="background:#1e2438;color:#60a5fa;padding:6px 10px;border-radius:6px;
                      font-size:13px;display:inline-block;margin-top:8px;
                      word-break:break-all;">{token}</code>
      </p>

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
        "subject": "Reset your SplitEase password",
        "htmlContent": html
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_SMTP_KEY,
        "content-type": "application/json"
    }

    try:
        # 10 second timeout prevents the frontend from hanging indefinitely
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status() 
        logger.info("Reset email sent to=%s", to_email)
        
    except requests.exceptions.RequestException as e:
        logger.error("Brevo API error: %s", str(e))
        if hasattr(e, 'response') and e.response is not None:
            logger.error("Brevo response: %s", e.response.text)
        raise