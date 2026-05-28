// SplitEase/web/src/pages/ResetPassword.jsx

import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";


export default function ResetPassword() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const [token,   setToken]   = useState(params.get("token") || "");
  const [pass,    setPass]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    if (pass !== confirm) { setError("Passwords do not match."); setLoading(false); return; }
    try {
      await api.post("/auth/reset-password", { token, new_password: pass, confirm_password: confirm });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired reset link.");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>SplitEase</div>
        </div>
        <div className="auth-card">
          {done ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Password Reset ✓</div>
              <p style={{ fontSize: 14, color: "var(--text2)" }}>Your password has been updated. Redirecting to login…</p>
              <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Sign In Now</Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Set new password</div>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
              <form onSubmit={onSubmit}>
                <div className="form-group">
                  <label className="form-label">Reset token</label>
                  <input required placeholder="From your reset email"
                    value={token} onChange={e => setToken(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input type="password" required placeholder="At least 6 characters"
                    value={pass} onChange={e => setPass(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Confirm password</label>
                  <input type="password" required placeholder="Repeat new password"
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Resetting…" : "Reset Password →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}