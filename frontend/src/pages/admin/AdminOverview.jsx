// --- frontend/src/pages/admin/AdminOverview.jsx ---

import { useState, useEffect } from "react";
import api from "../../api/axios";

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
          <div className="stat-val" style={{ color: "#a78bfa" }}>{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label2">Total Groups</div>
          <div className="stat-val" style={{ color: "var(--success)" }}>{groups.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label2">Admins</div>
          <div className="stat-val">{users.filter(u => u.role === "admin").length}</div>
        </div>
      </div>

      {/* Recent users */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>
          Recent Users
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {users.slice(0, 5).map(u => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.email}</td>
                  <td><span className={`badge ${u.role === "admin" ? "badge-primary" : "badge-neutral"}`}>{u.role}</span></td>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}