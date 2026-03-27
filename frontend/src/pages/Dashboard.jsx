// --- frontend/src/pages/Dashboard.jsx ---

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/groups/").then(r => setGroups(r.data)).finally(() => setLoading(false));
  }, []);

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={() => navigate("/groups")}>
      + New Group
    </button>
  );

  return (
    <AppShell title="Dashboard" actions={actions}>
      {/* Balance hero */}
      <div className="balance-hero">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(147,197,253,0.7)", marginBottom: 8 }}>
          Your account
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span className="t-money-lg" style={{ color: "#93c5fd" }}>
            {user?.name?.split(" ")[0]}'s SplitEase
          </span>
        </div>
        <div style={{ fontSize: 15, color: "rgba(147,197,253,0.6)" }}>
          {groups.length} active group{groups.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label2">Groups</div>
          <div className="stat-val" style={{ color: "var(--primary-h)" }}>{groups.length}</div>
          <div className="stat-sub">active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label2">Account</div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${user?.role === "admin" ? "badge-primary" : "badge-neutral"}`}>
              {user?.role}
            </span>
          </div>
          <div className="stat-sub" style={{ marginTop: 6 }}>{user?.email}</div>
        </div>
      </div>

      {/* Recent groups */}
      <div className="card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Recent Groups</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/groups")}>View all</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading…</div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No groups yet</div>
            <div style={{ fontSize: 14, color: "var(--text2)" }}>Create a group to start splitting expenses</div>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate("/groups")}>
              Create your first group
            </button>
          </div>
        ) : (
          <div>
            {groups.slice(0, 6).map((g, i) => (
              <div
                key={g.group_id}
                onClick={() => navigate(`/groups/${g.group_id}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", cursor: "pointer", transition: "background 0.1s",
                  borderBottom: i < Math.min(groups.length, 6) - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: "1px solid var(--border)" }}>
                    🏠
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{g.group_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      {g.created_at ? new Date(g.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}