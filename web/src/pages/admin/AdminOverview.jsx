// --- frontend/src/pages/admin/AdminOverview.jsx ---

import { useState, useEffect } from "react";
import api from "../../api/axios";

function AdminWipe() {
  const [step, setStep] = useState("idle"); // idle | confirm | done | error
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleWipe() {
    if (confirmText !== "WIPE") return;
    setLoading(true);
    setError("");
    try {
      await api.post("/users/admin-wipe");
      setStep("done");
      setTimeout(() => window.location.reload(), 1500); // reload after 1.5s
    } catch (e) {
      setError(e.response?.data?.detail || "Wipe failed.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") return (
    <div className="card card-p" style={{ borderColor: "rgba(16,185,129,0.3)", marginTop: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>✓ App wiped successfully</div>
      <div style={{ fontSize: 13, color: "var(--text3)" }}>All users, groups, and data have been deleted. Only your admin account remains.</div>
    </div>
  );

  if (step === "confirm") return (
    <div className="card card-p" style={{ borderColor: "rgba(239,68,68,0.4)", marginTop: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--danger)", marginBottom: 6 }}>⚠ Complete App Wipe</div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
        This will permanently delete ALL users, groups, expenses, payments, loans, and activity.
        Only your admin account and categories will remain. <strong style={{ color: "var(--text)" }}>This cannot be undone.</strong>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Type <strong style={{ color: "var(--text)" }}>WIPE</strong> to confirm:</div>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="WIPE"
          style={{ maxWidth: 200 }}
          autoFocus
        />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStep("idle"); setConfirmText(""); }}>Cancel</button>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleWipe}
          disabled={confirmText !== "WIPE" || loading}
        >
          {loading ? "Wiping…" : "Wipe Everything"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 12 }}>
        Danger Zone
      </div>
      <div className="card card-p" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Wipe Entire App</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>Delete all users, groups, and data. Cannot be undone.</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setStep("confirm")}>
            Wipe App
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [users,  setUsers]  = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/users/all"), api.get("/groups/all")])
      .then(([u, g]) => { setUsers(u.data); setGroups(g.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div className="page-title">System Overview</div>
        <div className="page-sub">Admin control panel</div>
      </div>

      <div className="stat-grid mb-6">
        <div className="stat-card">
          <div className="stat-label2">Total Users</div>
          <div className="stat-val" style={{ color: "#a78bfa" }}>
            {users.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label2">Total Groups</div>
          <div className="stat-val" style={{ color: "var(--success)" }}>
            {groups.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label2">Admins</div>
          <div className="stat-val">
            {users.filter((u) => u.role === "admin").length}
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Recent Users
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((u) => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: "var(--text2)", fontSize: 13 }}>
                    {u.email}
                  </td>
                  <td>
                    <span
                      className={`badge ${u.role === "admin" ? "badge-primary" : "badge-neutral"}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADMIN WIPE ── */}
      <AdminWipe />
    </div>
  );
}