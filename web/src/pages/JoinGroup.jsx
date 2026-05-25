// --- web/src/pages/JoinGroup.jsx ---

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function JoinGroup() {
  const { token } = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [info,    setInfo]    = useState(null);   // { group_id, group_name }
  const [status,  setStatus]  = useState("loading"); // loading | ready | joining | success | error
  const [message, setMessage] = useState("");

  // Step 1: fetch invite info (group name) — no auth needed
  useEffect(() => {
    api.get(`/invite/${token}`)
      .then(r => { setInfo(r.data); setStatus("ready"); })
      .catch(err => {
        setMessage(err.response?.data?.detail || "This invite link is invalid or has expired.");
        setStatus("error");
      });
  }, [token]);

  async function handleJoin() {
    if (!user) {
      // Not logged in — send to signup with redirect
      navigate(`/signup?next=/join/${token}`);
      return;
    }
    setStatus("joining");
    try {
      const { data } = await api.post(`/invite/${token}/join`);
      setStatus("success");
      setMessage(data.message);
      setTimeout(() => navigate(`/groups/${data.group_id}`), 1500);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to join group.");
      setStatus("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }} className="fade-up">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>S</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em" }}>SplitEase</div>
        </div>

        <div className="auth-card">
          {/* LOADING */}
          {status === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text2)", fontSize: 14 }}>
              <div className="spinner" />
              Validating invite link…
            </div>
          )}

          {/* READY — show group name + join button */}
          {(status === "ready" || status === "joining") && info && (
            <>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>You've been invited to join</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 20 }}>
                {info.group_name}
              </div>

              {user ? (
                <>
                  <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 18 }}>
                    Joining as <strong>{user.name}</strong>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width: "100%", justifyContent: "center" }}
                    disabled={status === "joining"}
                    onClick={handleJoin}
                  >
                    {status === "joining" ? (
                      <><div className="spinner" style={{ borderTopColor: "#fff" }} /> Joining…</>
                    ) : "Join Group →"}
                  </button>
                  <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--text3)" }}>
                    Not you? <Link to={`/login?next=/join/${token}`} style={{ color: "var(--primary-h)" }}>Switch account</Link>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 18 }}>
                    Sign in or create an account to join this group.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Link
                      to={`/login?next=/join/${token}`}
                      className="btn btn-primary btn-lg"
                      style={{ justifyContent: "center" }}
                    >
                      Sign in to join
                    </Link>
                    <Link
                      to={`/signup?next=/join/${token}`}
                      className="btn btn-ghost btn-lg"
                      style={{ justifyContent: "center" }}
                    >
                      Create account
                    </Link>
                  </div>
                </>
              )}
            </>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>You're in!</div>
              <div style={{ fontSize: 14, color: "var(--text2)" }}>{message}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 8 }}>Redirecting…</div>
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Invalid Invite</div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>{message}</div>
              <Link to={user ? "/dashboard" : "/login"} className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>
                ← {user ? "Go to Dashboard" : "Sign in"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}