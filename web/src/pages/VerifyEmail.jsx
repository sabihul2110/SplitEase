import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { verifyEmail, resendVerification } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refreshUser, login, user } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    async function autoSend() {
      try {
        await resendVerification();
        setSuccess("A verification code has been sent to your email.");
      } catch (err) {
        if (err.response?.status !== 429) {
          setError("Could not send code automatically. Use 'Resend code' below.");
        }
      }
    }
    autoSend();
  }, []);

  async function onVerify(e) {
    e.preventDefault(); setError(""); setSuccess("");
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
    e.preventDefault(); setError(""); setSuccess(""); setResending(true);
    try {
      await resendVerification();
      setSuccess("Code resent — check your inbox.");
    } catch (err) {
      setError(err.response?.status === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again.");
    } finally { setResending(false); }
  }

  async function onSkip() {
    // Stay logged in, go to dashboard — banner will show
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">

        {/* Logo header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.svg" alt="SplitEase"
            style={{ width: 64, height: 64, margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>
            Split<span style={{ color: "#2563eb" }}>Ease</span>
          </div>
        </div>

        <div className="auth-card">
          {/* Mail icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(37,99,235,0.10)",
              border: "1px solid rgba(37,99,235,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
            Check your inbox
          </div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5, textAlign: "center" }}>
            We sent a 6-digit code to{" "}
            <strong style={{ color: "var(--text)" }}>{user?.email}</strong>
          </p>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>⚠ {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {success}</div>}

          <form onSubmit={onVerify}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Verification code</label>
              {/* OTP boxes */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} style={{
                    width: 44, height: 52,
                    border: `1.5px solid ${otp.length === i ? "var(--primary)" : otp[i] ? "var(--primary-h)" : "var(--border2)"}`,
                    borderRadius: 8,
                    background: otp.length === i ? "rgba(37,99,235,0.06)" : "var(--surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 700, color: "var(--text)",
                    transition: "border-color 0.15s",
                  }}>
                    {otp[i] || ""}
                  </div>
                ))}
              </div>
              <div
                onClick={() => document.getElementById("otp-input").focus()}
                style={{ position: "absolute", inset: 0, cursor: "text", zIndex: 1 }}
              />
              <input
                id="otp-input"
                required autoFocus maxLength="6"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                style={{
                  position: "absolute", opacity: 0, pointerEvents: "none",
                  width: 1, height: 1,
                }}
              />
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

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={onSkip}
              style={{ background: "none", border: "none", color: "var(--text3)",
                       fontSize: 13, cursor: "pointer", padding: 0 }}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}