// --- frontend/src/pages/Login.jsx ---

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const next      = params.get("next") || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>SplitEase</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>College expense splitter</div>
        </div>

        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>Sign in</div>
          {next !== "/dashboard" && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Sign in to continue joining the group.
            </div>
          )}
          {error && <div className="alert alert-error">⚠ {error}</div>}
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" required autoFocus placeholder="you@college.edu"
                value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Password</label>
              <input type="password" required placeholder="Enter password"
                value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
            No account? <Link to={`/signup?next=${next}`} style={{ color: "var(--primary-h)", fontWeight: 600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}