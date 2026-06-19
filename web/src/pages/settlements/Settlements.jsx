// web/src/pages/settlements/Settlements.jsx


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups } from "../../api/groups";
import { getSettlements, getSimplified } from "../../api/settlements";
import * as peopleApi from "../../api/people";
import AppShell from "../../components/layout/AppShell";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

export default function Settlements() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [tab, setTab]         = useState("groups"); // groups | personal
  const [groups, setGroups]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [simple, setSimple]   = useState([]);
  const [raw, setRaw]         = useState([]);
  const [gLoading, setGLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [people, setPeople]   = useState([]);
  const [pLoading, setPLoading] = useState(false);

  useEffect(() => {
    getMyGroups()
      .then(r => {
        setGroups(r.data || []);
        if (r.data?.length) selectGroup(r.data[0].group_id);
      })
      .finally(() => setGLoading(false));
    loadPeople();
  }, []);

  async function selectGroup(gid) {
    setSelected(gid); setLoading(true);
    try {
      const [s, r] = await Promise.all([getSimplified(gid), getSettlements(gid)]);
      setSimple(s.data || []); setRaw(r.data || []);
    } catch { setSimple([]); setRaw([]); }
    finally { setLoading(false); }
  }

  async function loadPeople() {
    setPLoading(true);
    try { const r = await peopleApi.getPeople(); setPeople(r.data || []); }
    catch { setPeople([]); }
    finally { setPLoading(false); }
  }

  const selectedGroup = groups.find(g => g.group_id === selected);
  const peopleWithBalance = people.filter(p => Math.abs(p.net_balance) > 0.005);
  const totalOwed   = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalOwe    = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  return (
    <AppShell title="Settlements">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em",
          color: "var(--text)", margin: 0 }}>Settlements</h1>
        <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 4 }}>
          All outstanding balances — groups and personal
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 24 }}>
        {[
          { id: "groups",   label: "Group Settlements" },
          { id: "personal", label: "Personal Ledger" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              cursor: "pointer", border: "none", background: "transparent",
              color: tab === t.id ? "var(--text)" : "var(--text2)",
              borderBottom: `2px solid ${tab === t.id ? "var(--primary-h)" : "transparent"}`,
              marginBottom: -2, transition: "all 0.14s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Group Settlements */}
      {tab === "groups" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          <div className="card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--text3)" }}>Groups</div>
            {gLoading ? (
              <div className="loading" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 24, fontSize: 14, color: "var(--text3)", textAlign: "center" }}>
                No groups yet
              </div>
            ) : groups.map(g => (
              <div key={g.group_id} onClick={() => selectGroup(g.group_id)}
                style={{ padding: "11px 16px", cursor: "pointer", fontSize: 14, fontWeight: 500,
                  background: selected === g.group_id ? "rgba(37,99,235,0.1)" : "transparent",
                  color: selected === g.group_id ? "var(--primary-h)" : "var(--text2)",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: `3px solid ${selected === g.group_id ? "var(--primary)" : "transparent"}`,
                  transition: "all 0.1s" }}>
                {g.group_name}
              </div>
            ))}
          </div>

          <div>
            {selectedGroup && (
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                  {selectedGroup.group_name}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => selectGroup(selected)}>
                    ↻ Refresh
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/groups/${selected}`)}>
                    View Group →
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading"><div className="spinner" />Calculating…</div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                    Outstanding
                  </div>
                  {simple.length === 0 ? (
                    <div className="card card-p" style={{ textAlign: "center", padding: "32px 20px" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%", margin: "0 auto 10px",
                        background: "rgba(16,185,129,0.1)", color: "var(--success)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icons.check size={22} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                        All settled up
                      </div>
                      <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
                        No outstanding balances in this group.
                      </div>
                    </div>
                  ) : simple.map((s, i) => (
                    <div key={i} className="settle-item">
                      <div className="settle-names">
                        <div style={{ width: 32, height: 32, borderRadius: "50%",
                          background: "var(--surface3)", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {s.from[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.from}</span>
                        <span className="settle-sep">→</span>
                        <div style={{ width: 32, height: 32, borderRadius: "50%",
                          background: "var(--surface3)", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {s.to[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.to}</span>
                      </div>
                      <div className="settle-actions">
                        <span className="settle-amt">₹{Number(s.amount).toLocaleString("en-IN")}</span>
                        {s.from?.trim() === user?.name?.trim() && s.to_upi_id && (
                          <a href={`upi://pay?pa=${s.to_upi_id}&am=${s.amount}&cu=INR&tn=SplitEase`}
                            className="upi-btn" target="_blank" rel="noreferrer">
                            Pay via UPI
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {raw.length > 0 && (
                  <div className="card">
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)",
                      fontSize: 14, fontWeight: 600 }}>Net Balances</div>
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
                                <td className="td-num" style={{ textAlign: "right" }}>
                                  ₹{Number(s.total_paid).toLocaleString("en-IN")}
                                </td>
                                <td className="td-num" style={{ textAlign: "right" }}>
                                  ₹{Number(s.total_owed).toLocaleString("en-IN")}
                                </td>
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
      )}

      {/* Personal Ledger balances */}
      {tab === "personal" && (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
                Total Owed to You
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b",
                fontVariantNumeric: "tabular-nums" }}>₹{fmt(totalOwed)}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                {people.filter(p => p.net_balance > 0).length} people owe you
              </div>
            </div>
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
                Total You Owe
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#818cf8",
                fontVariantNumeric: "tabular-nums" }}>₹{fmt(totalOwe)}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                You owe {people.filter(p => p.net_balance < 0).length} people
              </div>
            </div>
          </div>

          {pLoading ? (
            <div className="loading"><div className="spinner" />Loading…</div>
          ) : peopleWithBalance.length === 0 ? (
            <div className="card card-p" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(16,185,129,0.1)", color: "var(--success)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icons.check size={26} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                All personal balances are settled
              </div>
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                No outstanding balances with any person.
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)",
                fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                Outstanding Personal Balances
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th style={{ textAlign: "right" }}>You Lent</th>
                      <th style={{ textAlign: "right" }}>You Borrowed</th>
                      <th style={{ textAlign: "right" }}>Net Balance</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peopleWithBalance.map(p => {
                      const net = p.net_balance;
                      const isOwed = net > 0;
                      return (
                        <tr key={p.person_id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>
                              {p.display_name}
                            </div>
                            {p.active_entries > 0 && (
                              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                                {p.active_entries} active {p.active_entries === 1 ? "entry" : "entries"}
                              </div>
                            )}
                          </td>
                          <td className="td-num" style={{ textAlign: "right", color: "#f59e0b" }}>
                            ₹{fmt(Math.max(net, 0))}
                          </td>
                          <td className="td-num" style={{ textAlign: "right", color: "#818cf8" }}>
                            ₹{fmt(Math.max(-net, 0))}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className={`badge ${isOwed ? "badge-amber" : "badge-primary"}`}
                              style={{ color: isOwed ? "#f59e0b" : "#818cf8",
                                background: isOwed ? "rgba(245,158,11,0.12)" : "rgba(129,140,248,0.12)" }}>
                              {isOwed ? "+" : ""}₹{fmt(net)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn btn-ghost btn-xs"
                              onClick={() => navigate(`/loans`)}
                              style={{ fontSize: 12 }}>
                              View Ledger →
                            </button>
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
    </AppShell>
  );
}