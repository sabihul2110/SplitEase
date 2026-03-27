// --- frontend/src/pages/Signup.jsx ---

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const next      = params.get("next") || "/dashboard";

  const [form, setForm] = useState({ name: "", email: "", password: "", upi_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { ...form, upi_id: form.upi_id.trim() || null });
      login(data);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>SplitEase</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>First signup becomes admin</div>
        </div>
        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Create account</div>
          {next !== "/dashboard" && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Create an account to join the group.
            </div>
          )}
          {error && <div className="alert alert-error">⚠ {error}</div>}
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input required autoFocus placeholder="Ayaan Khan"
                value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" required placeholder="you@college.edu"
                value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" required placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">
                UPI ID <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text3)" }}>— optional</span>
              </label>
              <input placeholder="name@upi"
                value={form.upi_id} onChange={e => setForm(f => ({...f, upi_id: e.target.value}))} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating…" : "Create account →"}
            </button>
          </form>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
            Have an account? <Link to={`/login?next=${next}`} style={{ color: "var(--primary-h)", fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}