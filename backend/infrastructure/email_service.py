# backend/infrastructure/email_service.py

import logging
import requests
from core.config import BREVO_API_KEY, BREVO_SENDER_EMAIL

logger = logging.getLogger("splitease.email")

def _send_brevo_email(to_email: str, name: str, subject: str, sender_name: str, html_content: str) -> bool:
    """Internal helper to execute the Brevo API request. Returns True on success, False on failure."""
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("Email configuration missing. Check Brevo environment variables.")

    url = "https://api.brevo.com/v3/smtp/email"
    
    payload = {
        "sender": {"name": sender_name, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": name}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status() 
        logger.info("Email sent successfully | To: %s | Subject: %s", to_email, subject)
    except requests.exceptions.RequestException as e:
        logger.error("Brevo API delivery failure: %s", str(e))
        return False
    return True


def send_reset_email(to_email: str, name: str, token: str) -> bool:
    """Sends a formal password reset OTP."""
    html = f"""
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;
                background:#0a0d14;color:#f0f4ff;border-radius:12px;border:1px solid #242a3d;text-align:center;">
      
      <div style="display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">
          Split<span style="color:#3b82f6;">Ease</span>
        </span>
      </div>

      <h2 style="color:#f0f4ff;margin:0 0 16px;font-size:20px;font-weight:600;">Password Reset Request</h2>
      <p style="color:#8892b0;margin:0 0 24px;line-height:1.6;font-size:15px;">
        Dear {name} ,<br><br>
        A request has been received to reset the password for your SplitEase account. 
        Please use the 6-digit authorization code below to proceed. This code will expire in <strong style="color:#f0f4ff;">15 minutes</strong>.
      </p>
      
      <div style="background:#1e2438;border-radius:8px;padding:20px;margin-bottom:24px;
                  letter-spacing:12px;font-size:36px;font-weight:800;color:#3b82f6;">
        {token}
      </div>

      <p style="color:#4a5578;font-size:13px;margin:0;line-height:1.5;">
        If you did not initiate this request, no further action is required. Your account remains secure.
      </p>
    </div>
    """
    
    return _send_brevo_email(
        to_email=to_email,
        name=name,
        subject="[SplitEase] Password Reset Authorization",
        sender_name="SplitEase Security",
        html_content=html
    )


def send_verification_email(to_email: str, name: str, token: str) -> bool:
    """Sends a formal account onboarding/verification OTP."""
    html = f"""
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;
                background:#0a0d14;color:#f0f4ff;border-radius:12px;border:1px solid #242a3d;text-align:center;">
      
      <div style="display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">
          Split<span style="color:#3b82f6;">Ease</span>
        </span>
      </div>

      <h2 style="color:#f0f4ff;margin:0 0 16px;font-size:20px;font-weight:600;">Verify Your Email Address</h2>
      <p style="color:#8892b0;margin:0 0 24px;line-height:1.6;font-size:15px;">
        Dear {name},<br><br>
        Thank you for registering with SplitEase. To complete your account setup, please verify your email address using the authorization code below. 
        This code will expire in <strong style="color:#f0f4ff;">15 minutes</strong>.
      </p>
      
      <div style="background:#1e2438;border-radius:8px;padding:20px;margin-bottom:24px;
                  letter-spacing:12px;font-size:36px;font-weight:800;color:#3b82f6;">
        {token}
      </div>

      <p style="color:#4a5578;font-size:13px;margin:0;line-height:1.5;">
        If you did not create a SplitEase account, please disregard this email.
      </p>
    </div>
    """
    
    return _send_brevo_email(
        to_email=to_email,
        name=name,
        subject="[SplitEase] Complete Your Account Registration",
        sender_name="SplitEase Onboarding",
        html_content=html
    )