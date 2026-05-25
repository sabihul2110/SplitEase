// --- frontend/src/pages/Settlements.jsx ---

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

export default function Settlements() {
  const navigate = useNavigate();
  const [groups,   setGroups]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [simple,   setSimple]   = useState([]);
  const [raw,      setRaw]      = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(true);

  useEffect(() => {
    api.get("/groups/").then(r => {
      setGroups(r.data);
      if (r.data.length > 0) selectGroup(r.data[0].group_id);
    }).finally(() => setGLoading(false));
  }, []);

  async function selectGroup(gid) {
    setSelected(gid); setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get(`/settlements/${gid}/simplified`),
        api.get(`/settlements/${gid}`),
      ]);
      setSimple(s.data); setRaw(r.data);
    } catch {} finally { setLoading(false); }
  }

  const selectedGroup = groups.find(g => g.group_id === selected);

  return (
    <AppShell title="Settlements">
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
        {/* Group picker */}
        <div className="card">
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
            Groups
          </div>
          {gLoading ? (
            <div className="loading" style={{ padding: 24 }}><div className="spinner" /></div>
          ) : groups.map(g => (
            <div
              key={g.group_id}
              onClick={() => selectGroup(g.group_id)}
              style={{
                padding: "11px 14px", cursor: "pointer", fontSize: 14, fontWeight: 500,
                background: selected === g.group_id ? "rgba(37,99,235,0.12)" : "transparent",
                color: selected === g.group_id ? "var(--primary-h)" : "var(--text2)",
                borderBottom: "1px solid var(--border)", transition: "all 0.1s",
              }}
            >
              {g.group_name}
            </div>
          ))}
        </div>

        {/* Settlements for selected group */}
        <div>
          {selectedGroup && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedGroup.group_name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => selectGroup(selected)}>↻ Refresh</button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/groups/${selected}`)}>View Group →</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading"><div className="spinner" />Calculating…</div>
          ) : (
            <>
              {/* Who pays whom */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                  Outstanding
                </div>
                {simple.length === 0 ? (
                  <div className="card">
                    <div className="empty-state" style={{ padding: "36px 20px" }}>
                      <div style={{ fontSize: 28 }}>🎉</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>All settled up!</div>
                      <div style={{ fontSize: 14, color: "var(--text2)" }}>No outstanding balances in this group.</div>
                    </div>
                  </div>
                ) : (
                  simple.map((s, i) => (
                    <div key={i} className="settle-item">
                      <div className="settle-names">
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {s.from[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.from}</span>
                        <span className="settle-sep">→</span>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {s.to[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.to}</span>
                      </div>
                      <div className="settle-actions">
                        <span className="settle-amt">₹{Number(s.amount).toLocaleString("en-IN")}</span>
                        {(() => {
                          const m = raw.find(r => r.user_name === s.to);
                          return s.to_upi_id ? (
                            <a
                              href={`upi://pay?pa=${m.upi_id}&am=${s.amount}&cu=INR&tn=SplitEase`}
                              className="upi-btn" target="_blank" rel="noreferrer"
                            >
                              Pay via UPI
                            </a>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Net balances table */}
              {raw.length > 0 && (
                <div className="card">
                  <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>
                    Net Balances
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th style={{ textAlign: "right" }}>Paid</th>
                          <th style={{ textAlign: "right" }}>Owed</th>
                          <th style={{ textAlign: "right" }}>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raw.map((s, i) => {
                          const net = Number(s.net_balance);
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{s.user_name}</td>
                              <td className="td-num" style={{ textAlign: "right" }}>₹{Number(s.total_paid).toLocaleString("en-IN")}</td>
                              <td className="td-num" style={{ textAlign: "right" }}>₹{Number(s.total_owed).toLocaleString("en-IN")}</td>
                              <td style={{ textAlign: "right" }}>
                                <span className={`badge ${net > 0 ? "badge-success" : net < 0 ? "badge-danger" : "badge-neutral"}`}>
                                  {net > 0 ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}