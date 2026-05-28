// SplitEase/web/src/pages/ForgotPassword.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post("/auth/forgot-password", { email }); } catch {}
    setSent(true); setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>SplitEase</div>
        </div>
        <div className="auth-card">
          {sent ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Check your email</div>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
                If that email is registered, a reset link has been sent. Check your inbox and spam folder. The link expires in 15 minutes.
              </p>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Back to Login</Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Forgot your password?</div>
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>Enter your email and we'll send you a reset link.</p>
              <form onSubmit={onSubmit}>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Email address</label>
                  <input type="email" required autoFocus placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <div className="divider" style={{ margin: "20px 0" }} />
              <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
                Remember it? <Link to="/login" style={{ color: "var(--primary-h)", fontWeight: 600 }}>Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}