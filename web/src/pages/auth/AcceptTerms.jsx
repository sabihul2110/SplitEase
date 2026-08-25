// web/src/pages/auth/AcceptTerms.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { acceptTerms } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons";

export default function AcceptTerms() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onAccept() {
    setLoading(true); setError("");
    try {
      await acceptTerms();
      await refreshUser?.();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Could not save your response. Please try again.");
    } finally { setLoading(false); }
  }

  function onDecline() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.svg" alt="SplitEase"
            style={{ width: 56, height: 56, margin: "0 auto 10px", display: "block" }} />
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em" }}>
            Split<span style={{ color: "#2563eb" }}>Ease</span>
          </div>
        </div>

        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            We've updated our Terms & Privacy Policy
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
            Please review and accept before continuing to use SplitEase.
          </p>

          {error && (
            <div style={{
              fontSize: 13, color: "var(--danger)", marginBottom: 16,
              padding: "9px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Icons.alertTriangle size={14} />
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, fontSize: 13, marginBottom: 20 }}>
            <Link to="/terms" target="_blank" style={{ color: "var(--primary-h)", fontWeight: 600 }}>
              Read Terms of Service
            </Link>
            <Link to="/privacy" target="_blank" style={{ color: "var(--primary-h)", fontWeight: 600 }}>
              Read Privacy Policy
            </Link>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
            onClick={onAccept} disabled={loading}>
            {loading ? "Saving…" : "I Agree — Continue"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={onDecline}
              style={{ background: "none", border: "none", color: "var(--text3)",
                       fontSize: 12, cursor: "pointer" }}>
              I don't agree — sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}