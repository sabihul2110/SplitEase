// SplitEase/web/src/pages/ForgotPassword.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      navigate("/reset-password");
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else if (status === 503) {
        setError("Our email service is temporarily unavailable. Please try again in a few minutes.");
      } else {
        navigate("/reset-password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img 
            src="/logo.svg" 
            alt="SplitEase Logo" 
            style={{ width: 64, height: 64, margin: "0 auto 12px", display: "block" }} 
          />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>
            Split<span style={{ color: "var(--primary)" }}>Ease</span>
          </div>
        </div>
        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Forgot your password?</div>
          <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
            Enter your email and we'll send you a 6-digit reset code.
          </p>
          {error && (
            <div style={{
              background: "var(--error-bg, #2d1a1a)", color: "var(--error, #f87171)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13,
              marginBottom: 16, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          <form onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Email address</label>
              <input type="email" required autoFocus placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending Code…" : "Send Reset Code"}
            </button>
          </form>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
            Remember it? <Link to="/login" style={{ color: "var(--primary-h)", fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}