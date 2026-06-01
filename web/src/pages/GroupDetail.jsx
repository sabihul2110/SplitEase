// --- web/src/pages/GroupDetail.jsx ---

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";

const UserPlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="22" y1="11" x2="16" y2="11"></line>
  </svg>
);

export default function GroupDetail() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab,         setTab]         = useState("ledger");
  const [expenses,    setExpenses]    = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [members,     setMembers]     = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [simplified,  setSimplified]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [settLoading, setSettLoading] = useState(false);
  const [groupName,   setGroupName]   = useState(`Group #${id}`);

  // Invite modal
  const [inviteModal,   setInviteModal]   = useState(false);
  const [inviteLink,    setInviteLink]    = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied,        setCopied]        = useState(false);

  // Feedback toast
  const [toast, setToast] = useState("");

  // Reminder sending state — tracks which debtor name is currently being reminded
  const [reminding, setReminding] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [e, p, m, g] = await Promise.all([
        api.get(`/expenses/${id}`),
        api.get(`/payments/${id}`),
        api.get(`/groups/${id}/members`),
        api.get(`/groups/`),
      ]);
      setExpenses(e.data);
      setPayments(p.data);
      setMembers(m.data);
      const thisGroup = (g.data || []).find(gr => gr.group_id === Number(id));
      if (thisGroup) setGroupName(thisGroup.group_name);
    } catch { navigate("/groups"); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function loadSettlements() {
    setSettLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.get(`/settlements/${id}`),
        api.get(`/settlements/${id}/simplified`),
      ]);
      setSettlements(r.data); setSimplified(s.data);
    } catch {} finally { setSettLoading(false); }
  }

  function handleTab(t) {
    setTab(t);
    if (t === "settlements" && settlements.length === 0) loadSettlements();
  }

  async function generateInvite() {
    setInviteLoading(true); setInviteModal(true); setCopied(false);
    try {
      const { data } = await api.post(`/groups/${id}/invite`);
      setInviteLink(`${window.location.origin}/join/${data.token}`);
    } catch { setInviteLink("Error generating link."); }
    finally { setInviteLoading(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function delExpense(eid) {
    if (!confirm("Delete expense?")) return;
    await api.delete(`/expenses/${eid}`);
    setExpenses(p => p.filter(e => e.expense_id !== eid));
  }
  async function delPayment(pid) {
    if (!confirm("Delete payment?")) return;
    await api.delete(`/payments/${pid}`);
    setPayments(p => p.filter(x => x.payment_id !== pid));
  }

  function upiLink(toName, amount) {
    const m = members.find(m => m.name === toName);
    if (!m?.upi_id) return null;
    return `upi://pay?pa=${m.upi_id}&am=${amount}&cu=INR&tn=SplitEase`;
  }

  async function handleLeaveGroup() {
    if (!window.confirm('Leave this group? You must have a zero balance.')) return;
    try {
      await api.delete(`/groups/${id}/members/${user.user_id}`);
      navigate('/groups');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to leave group. Settle your balance first.');
    }
  }

  async function handleDeleteGroup(force = false) {
    const msg = force
      ? 'Group has unsettled balances. Delete anyway? This cannot be undone.'
      : `Permanently delete this group and all its data?`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/groups/${id}${force ? '?force=true' : ''}`);
      navigate('/groups');
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409) handleDeleteGroup(true);
      else if (status === 403) alert(detail || 'Only the group creator or admin can delete this group.');
      else alert(detail || 'Failed to delete group.');
    }
  }

  async function sendReminder(s) {
    setReminding(s.from);
    try {
      await api.post(`/groups/${id}/remind`, {
        debtor_user_id: s.from_user_id,
        amount: s.amount,
      });
      showToast(`✓ Reminder sent to ${s.from} — they'll see it in their notifications.`);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to send reminder.");
    } finally {
      setReminding("");
    }
  }

  function settlementAction(s) {
    const myName   = user?.name?.trim();
    const fromName = s.from?.trim();
    const toName   = s.to?.trim();
    const link     = upiLink(s.to, s.amount);

    if (fromName === myName) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--danger)" }}>
            ₹{Number(s.amount).toLocaleString("en-IN")}
          </span>
          {link ? (
            <a href={link} className="upi-btn" target="_blank" rel="noreferrer">Pay via UPI</a>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>(No UPI ID set)</span>
          )}
        </div>
      );
    }

    if (toName === myName) {
      const isSending = reminding === s.from;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--success)" }}>
            +₹{Number(s.amount).toLocaleString("en-IN")}
          </span>
          <button
            className="btn btn-xs"
            disabled={isSending}
            onClick={() => sendReminder(s)}
            style={{
              color: "var(--warning)", borderColor: "rgba(245,158,11,0.35)",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {isSending ? "Sending…" : "🔔 Remind"}
          </button>
        </div>
      );
    }

    return (
      <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--text2)" }}>
        ₹{Number(s.amount).toLocaleString("en-IN")}
      </span>
    );
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.total_amount), 0);
  const myBalance  = settlements.find(s => s.user_name === user?.name);
  const myNet      = myBalance ? Number(myBalance.net_balance) : null;

  const actions = (
    <>
      <button
        className="btn btn-sm"
        onClick={generateInvite}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(59, 130, 246, 0.15)",
          color: "var(--primary-h)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "20px",
          padding: "4px 12px",
        }}
      >
        <UserPlusIcon /> Invite
      </button>
      <Link to={`/groups/${id}/add-payment`} className="btn btn-ghost btn-sm">+ Payment</Link>
      <Link to={`/groups/${id}/add-expense`} className="btn btn-primary btn-sm">+ Expense</Link>
    </>
  );

  if (loading) return (
    <AppShell title={groupName} actions={actions}>
      <div className="loading"><div className="spinner" />Loading…</div>
    </AppShell>
  );

  return (
    <>
      <AppShell title={groupName} actions={actions}>
        <button className="back-btn mb-4" onClick={() => navigate("/groups")}>← Back to Groups</button>

        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            {toast}
          </div>
        )}

        {/* Members */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 24 }}>
          {members.map(m => (
            <span key={m.user_id} className="badge badge-neutral" style={{ fontSize: 13, padding: "4px 10px" }}>
              {m.name}
              {m.name === user?.name && <span style={{ color: "var(--text3)", marginLeft: 4 }}>·you</span>}
            </span>
          ))}
          <span style={{ fontSize: 13, color: "var(--text3)" }}>{members.length} members</span>
        </div>

        {/* Stats */}
        <div className="stat-grid mb-6">
          <div className="stat-card">
            <div className="stat-label2">Total Spent</div>
            <div className="stat-val c-primary">₹{totalSpent.toLocaleString("en-IN")}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label2">Expenses</div>
            <div className="stat-val">{expenses.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label2">Payments</div>
            <div className="stat-val">{payments.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label2">Members</div>
            <div className="stat-val">{members.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: "ledger",      label: `Ledger (${expenses.length + payments.length})` },
            { id: "settlements", label: "Settlements" },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => handleTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── LEDGER ── */}
        {tab === "ledger" && (
          <div className="group-detail-grid">
            <div className="card">
              {expenses.length === 0 && payments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No transactions yet</div>
                  <div style={{ fontSize: 14, color: "var(--text2)" }}>Add an expense to get started</div>
                  <Link to={`/groups/${id}/add-expense`} className="btn btn-primary btn-sm mt-4">+ Add Expense</Link>
                </div>
              ) : (() => {
                const combined = [
                  ...expenses.map(e => ({ ...e, _type: 'expense', _date: e.expense_date })),
                  ...payments.map(p => ({ ...p, _type: 'payment', _date: p.payment_date })),
                ].sort((a, b) => new Date(b._date) - new Date(a._date));
                return (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th><th>Description</th><th>Payer</th>
                          <th>Category</th><th style={{ textAlign: "right" }}>Total</th>
                          <th>Split</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {combined.map(item => item._type === 'expense' ? (
                          <tr key={`e-${item.expense_id}`}>
                            <td style={{ color: "var(--text3)", fontSize: 13 }}>
                              {new Date(item.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </td>
                            <td style={{ fontWeight: 500 }}>{item.description}</td>
                            <td style={{ color: "var(--text2)" }}>
                              {item.payer_name}
                              {item.payer_name === user?.name && <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 4 }}>·you</span>}
                            </td>
                            <td><span className="tag">{item.subcategory_name || item.category_name}</span></td>
                            <td className="td-num" style={{ textAlign: "right" }}>
                              ₹{Number(item.total_amount).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className={`badge ${item.split_type === "equal" ? "badge-success" : "badge-primary"}`}>
                                {item.split_type}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-danger btn-xs" onClick={() => delExpense(item.expense_id)}>✕</button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={`p-${item.payment_id}`} style={{ opacity: 0.7 }}>
                            <td style={{ color: "var(--text3)", fontSize: 13 }}>
                              {new Date(item.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </td>
                            <td style={{ fontStyle: "italic", color: "var(--text2)" }}>
                              Settlement{item.note ? ` — ${item.note}` : ""}
                            </td>
                            <td style={{ color: "var(--text2)" }}>{item.payer_name}</td>
                            <td><span className="badge badge-success">payment</span></td>
                            <td className="td-num c-success" style={{ textAlign: "right" }}>
                              ₹{Number(item.amount).toLocaleString("en-IN")}
                            </td>
                            <td>—</td>
                            <td>
                              <button className="btn btn-danger btn-xs" onClick={() => delPayment(item.payment_id)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Right panel */}
            <div>
              <div className="card card-p mb-3">
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                  Your Balance
                </div>
                {myNet !== null ? (
                  <>
                    <div className={`t-money-md ${myNet >= 0 ? "c-success" : "c-danger"}`}>
                      {myNet >= 0 ? "+" : ""}₹{Math.abs(myNet).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
                      {myNet > 0 ? "owed to you" : myNet < 0 ? "you owe" : "settled up ✓"}
                    </div>
                    <button className="btn btn-ghost btn-sm w-full mt-4" style={{ justifyContent: "center" }} onClick={() => handleTab("settlements")}>
                      View settlements →
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTab("settlements")}>Calculate →</button>
                )}
              </div>

              <div className="card card-p">
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 12 }}>
                  Quick Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link to={`/groups/${id}/add-expense`} className="btn btn-primary" style={{ justifyContent: "center" }}>+ Add Expense</Link>
                  <Link to={`/groups/${id}/add-payment`} className="btn btn-ghost" style={{ justifyContent: "center" }}>+ Record Payment</Link>
                  <button
                    className="btn"
                    onClick={generateInvite}
                    style={{
                      justifyContent: "center", display: "flex", alignItems: "center", gap: "8px",
                      background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)",
                    }}
                  >
                    <UserPlusIcon /> Invite Member
                  </button>
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      className="btn"
                      onClick={handleLeaveGroup}
                      style={{ justifyContent: "center", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}
                    >
                      Leave Group
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleDeleteGroup()}
                      style={{ justifyContent: "center", color: "var(--text3)", border: "1px solid var(--border)", background: "transparent", fontSize: 12, opacity: 0.7 }}
                    >
                      Delete Group
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTLEMENTS ── */}
        {tab === "settlements" && (
          settLoading ? (
            <div className="loading"><div className="spinner" />Calculating…</div>
          ) : (
            <div className="group-detail-grid">
              <div>
                {/* My personal balance banner */}
                {settlements.length > 0 && (() => {
                  const me = settlements.find(s => s.user_name === user?.name);
                  if (!me) return null;
                  const net = Number(me.net_balance);
                  if (net === 0) return (
                    <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                      <span style={{ fontSize: 14, color: "var(--success)", fontWeight: 500 }}>✓ You're all settled up.</span>
                    </div>
                  );
                  if (net > 0) return (
                    <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>You are owed</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>+₹{Math.abs(net).toLocaleString("en-IN")}</div>
                    </div>
                  );
                  return (
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>You owe</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>₹{Math.abs(net).toLocaleString("en-IN")}</div>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Who pays whom</div>
                  <button className="btn btn-ghost btn-sm" onClick={loadSettlements}>↻ Refresh</button>
                </div>

                {simplified.length === 0 ? (
                  <div className="card">
                    <div className="empty-state" style={{ padding: "32px 20px" }}>
                      <div style={{ fontSize: 28 }}>🎉</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>All settled up!</div>
                      <div style={{ fontSize: 14, color: "var(--text2)" }}>No outstanding balances</div>
                    </div>
                  </div>
                ) : (
                  simplified.map((s, i) => {
                    const myName     = user?.name?.trim();
                    const isDebtor   = s.from?.trim() === myName;
                    const isCreditor = s.to?.trim()   === myName;
                    return (
                      <div
                        key={i}
                        className="settle-item"
                        style={{
                          borderColor: isDebtor ? "rgba(239,68,68,0.25)"
                            : isCreditor ? "rgba(16,185,129,0.2)"
                            : "var(--border)",
                        }}
                      >
                        <div className="settle-names">
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                            background: isDebtor ? "rgba(239,68,68,0.15)" : "var(--surface3)",
                            border: `1px solid ${isDebtor ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            color: isDebtor ? "var(--danger)" : "var(--text2)",
                          }}>
                            {s.from.split(" ").map(w => w[0]).slice(0,2).join("")}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.from}</span>
                            {isDebtor && <span style={{ fontSize: 11, color: "var(--danger)", marginLeft: 5 }}>·you</span>}
                          </div>
                          <span className="settle-sep">→</span>
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                            background: isCreditor ? "rgba(16,185,129,0.12)" : "var(--surface3)",
                            border: `1px solid ${isCreditor ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            color: isCreditor ? "var(--success)" : "var(--text2)",
                          }}>
                            {s.to.split(" ").map(w => w[0]).slice(0,2).join("")}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.to}</span>
                            {isCreditor && <span style={{ fontSize: 11, color: "var(--success)", marginLeft: 5 }}>·you</span>}
                          </div>
                        </div>

                        {settlementAction(s)}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Net balances */}
              <div className="card">
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>Net Balances</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Member</th><th>Paid</th><th>Net</th></tr></thead>
                    <tbody>
                      {settlements.map((s, i) => {
                        const net  = Number(s.net_balance);
                        const isMe = s.user_name === user?.name;
                        return (
                          <tr key={i} style={isMe ? { background: "rgba(37,99,235,0.05)" } : {}}>
                            <td style={{ fontWeight: isMe ? 700 : 500 }}>
                              {s.user_name}
                              {isMe && <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}>·you</span>}
                            </td>
                            <td className="td-num">₹{Number(s.total_paid).toLocaleString("en-IN")}</td>
                            <td>
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
            </div>
          )
        )}
      </AppShell>

      {/* Invite modal */}
      {inviteModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setInviteModal(false); }}>
          <div className="modal-box fade-up">
            <div className="modal-head">
              <span className="modal-title">Invite to {groupName}</span>
              <button className="btn btn-ghost btn-xs btn-icon" onClick={() => setInviteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 16 }}>
                Share this link. Anyone who opens it can join this group.
              </p>
              {inviteLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text2)", fontSize: 14 }}>
                  <div className="spinner" /> Generating…
                </div>
              ) : (
                <>
                  <div style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                      {inviteLink}
                    </span>
                    <button className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`} style={{ flexShrink: 0 }} onClick={copyLink}>
                      {copied ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    Link does not expire. Anyone with it can join.
                  </div>
                  <button className="btn btn-ghost btn-sm w-full mt-4" style={{ justifyContent: "center" }} onClick={() => setInviteModal(false)}>Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}