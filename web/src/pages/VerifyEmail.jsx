// SplitEase/web/src/pages/VerifyEmail

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyEmail, resendVerification } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [error,     setError]     = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function onVerify(e) {
    e.preventDefault(); setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setVerifying(true);
    try {
      await verifyEmail(otp.trim());
      await refreshUser?.();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

  async function onResend(e) {
    e.preventDefault(); setError(""); setResending(true);
    try {
      await resendVerification();
    } catch (err) {
      setError(err.response?.status === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again.");
    } finally { setResending(false); }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Verify your email</div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
            Enter the 6-digit code we sent to your email address.
          </p>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
          <form onSubmit={onVerify}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Verification code</label>
              <input required autoFocus maxLength="6" placeholder="123456"
                style={{ letterSpacing: "0.5em", fontSize: 20, fontWeight: 700, textAlign: "center" }}
                value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={verifying}>
              {verifying ? "Verifying…" : "Verify Email →"}
            </button>
          </form>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
            Didn't receive it?{" "}
            <button onClick={onResend} disabled={resending}
              style={{ background: "none", border: "none", color: "var(--primary-h)",
                       fontWeight: 600, cursor: "pointer", fontSize: 14, padding: 0 }}>
              {resending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}