// --- frontend/src/pages/admin/AdminUsers.jsx ---

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/all").then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  async function deleteUser(id, name) {
    if (!confirm(`Delete ${name}? This removes all their data.`)) return;
    await api.delete(`/users/${id}`);
    setUsers(p => p.filter(u => u.user_id !== id));
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Users</div>
        <div className="page-sub">{users.length} registered users</div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Email</th><th>UPI</th><th>Role</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td style={{ color: "var(--text3)" }}>{u.user_id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {u.name}
                    {u.user_id === me.user_id && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>you</span>}
                  </td>
                  <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.email}</td>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>{u.upi_id || "—"}</td>
                  <td><span className={`badge ${u.role === "admin" ? "badge-primary" : "badge-neutral"}`}>{u.role}</span></td>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td>
                    {u.role !== "admin" && (
                      <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.user_id, u.name)}>Delete</button>
                    )}
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