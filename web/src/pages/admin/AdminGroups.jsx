// --- web/src/pages/admin/AdminGroups.jsx ---

import { useState, useEffect } from "react";
import api from "../../api/axios";

export default function AdminGroups() {
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/groups/all").then(r => setGroups(r.data)).finally(() => setLoading(false));
  }, []);
  async function deleteGroup(id, name) {
    if (!confirm(`Delete "${name}"? All expenses and payments will be removed.`)) return;
    await api.delete(`/groups/${id}?force=true`);
    setGroups(p => p.filter(g => g.group_id !== id));
  }

  async function deleteAllGroups() {
    if (!confirm("Delete ALL groups? This removes every expense, payment, and settlement across the entire app. This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? Type OK to confirm.")) return;
    try {
      await api.delete("/groups/admin/wipe-groups");
      setGroups([]);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to wipe groups.");
    }
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Groups</div>
          <div className="page-sub">{groups.length} total groups</div>
        </div>
        <button
          className="btn btn-danger btn-sm"
          onClick={deleteAllGroups}
          style={{ marginTop: 4 }}
        >
          Wipe All Groups
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Members</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.group_id}>
                  <td style={{ color: "var(--text3)" }}>{g.group_id}</td>
                  <td style={{ fontWeight: 600 }}>{g.group_name}</td>
                  <td><span className="badge badge-neutral">{g.member_count} members</span></td>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>
                    {new Date(g.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => deleteGroup(g.group_id, g.group_name)}>Delete</button>
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