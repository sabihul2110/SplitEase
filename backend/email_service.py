import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_PASSWORD = os.getenv("BREVO_SMTP_KEY", "")
SMTP_LOGIN    = os.getenv("BREVO_SMTP_LOGIN", "")
SENDER_EMAIL  = os.getenv("BREVO_SENDER_EMAIL", "")
APP_BASE_URL  = os.getenv("APP_BASE_URL", "http://localhost:5173")

def send_reset_email(to_email: str, name: str, token: str) -> None:
    if not SMTP_PASSWORD or not SENDER_EMAIL or not SMTP_LOGIN:
        raise RuntimeError("Email not configured — check your Brevo env vars.")
    
    reset_link = f"{APP_BASE_URL}/reset-password?token={token}"

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your SplitEase password"
    msg["From"]    = f"SplitEase <{SENDER_EMAIL}>"
    msg["To"]      = to_email

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

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp-relay.brevo.com", 587) as server:
        server.starttls()
        # Logging in with your specific Brevo account ID, sending FROM your verified Gmail
        server.login(SMTP_LOGIN, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())