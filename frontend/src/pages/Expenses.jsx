// --- frontend/src/pages/Expenses.jsx ---

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import AddEntryModal from "../components/AddEntryModal";
import { Icons } from "../utils/Icons";

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const STYLES = `
  @keyframes mePulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes meFadeUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .me-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }
  .me-sum-card {
    border-radius: 12px; border: 1px solid var(--border);
    background: var(--surface); padding: 18px 20px 16px;
    animation: meFadeUp 0.25s ease both;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .me-sum-card:hover { border-color: var(--border2); box-shadow: 0 4px 20px rgba(0,0,0,0.22); }
  .me-sum-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }
  .me-sum-val   { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1.05; margin-bottom: 5px; }
  .me-sum-sub   { font-size: 12px; color: var(--text3); }

  .me-toolbar {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 22px; flex-wrap: wrap;
    min-height: 38px;
  }
  .me-tabs {
    display: flex; gap: 4px;
    background: var(--surface2); padding: 4px;
    border-radius: 10px; border: 1px solid var(--border);
  }
  .me-tab {
    padding: 5px 14px; border-radius: 7px;
    font-size: 12.5px; font-weight: 600; font-family: inherit;
    cursor: pointer; border: none; background: transparent;
    color: var(--text2); transition: all 0.13s;
  }
  .me-tab:hover { color: var(--text); }
  .me-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.3); }

  .me-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
  .me-search-wrap input {
    width: 100%; padding: 9px 14px 9px 38px;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface2); color: var(--text);
    font-size: 13.5px; font-family: inherit; outline: none;
    box-sizing: border-box; transition: border-color 0.14s;
  }
  .me-search-wrap input:focus { border-color: var(--border2); }
  .me-search-wrap input::placeholder { color: var(--text3); }
  .me-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: var(--text3);
    display: flex; pointer-events: none;
  }

  .me-date-header {
    font-size: 11.5px; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; color: var(--text3);
    padding: 10px 0 8px; margin-top: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
  }

  .me-entry {
    display: flex; align-items: flex-start; gap: 13px;
    padding: 13px 6px 13px 2px;
    border-bottom: 1px solid var(--border);
    animation: meFadeUp 0.2s ease both;
    border-radius: 4px;
  }
  .me-entry:last-child { border-bottom: none; }
  .me-entry:hover { background: rgba(255,255,255,0.012); }

  .me-entry-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .me-entry-body { flex: 1; min-width: 0; }
  .me-entry-label {
    font-size: 14px; font-weight: 600; color: var(--text);
    margin-bottom: 2px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .me-entry-sub { font-size: 12px; color: var(--text3); line-height: 1.4; }

  .me-breakdown {
    margin-top: 7px; padding: 9px 11px;
    border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface2);
    display: flex; flex-direction: column; gap: 4px;
  }
  .me-breakdown-row {
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--text2);
  }

  /* Inline repayment row for loan entries */
  .me-repay-row {
    display: flex; align-items: center; gap: 7px;
    margin-top: 8px;
  }
  .me-repay-input {
    flex: 1; max-width: 160px;
    padding: 6px 10px; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); font-size: 12px; font-family: inherit;
    outline: none; transition: border-color 0.13s;
  }
  .me-repay-input:focus { border-color: var(--border2); }
  .me-repay-input::placeholder { color: var(--text3); }
  .me-repay-btn {
    padding: 6px 12px; border-radius: 7px;
    font-size: 11.5px; font-weight: 700; font-family: inherit;
    border: none; cursor: pointer; transition: opacity 0.12s;
    white-space: nowrap;
  }
  .me-repay-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .me-repay-err { font-size: 11px; color: #f87171; margin-top: 4px; }

  /* Settled badge */
  .me-settled-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; padding: 2px 8px; border-radius: 20px;
    background: rgba(16,185,129,0.1); color: #10b981;
    margin-top: 6px;
  }

  .me-entry-right {
    display: flex; flex-direction: column; align-items: flex-end;
    gap: 4px; flex-shrink: 0; min-width: 80px;
  }
  .me-entry-amount {
    font-size: 15px; font-weight: 800;
    font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
  }

  .me-del {
    opacity: 0; padding: 3px 7px; border-radius: 6px;
    background: none; border: 1px solid transparent;
    color: var(--text3); cursor: pointer; font-size: 11px;
    font-family: inherit; transition: all 0.12s; align-self: center;
  }
  .me-entry:hover .me-del { opacity: 1; }
  .me-del:hover { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.2); }

  .me-group-link {
    display: inline-block; margin-top: 3px;
    font-size: 11px; color: var(--primary-h);
    background: none; border: none; padding: 0;
    cursor: pointer; font-family: inherit; text-decoration: underline;
  }

  .me-empty { text-align: center; padding: 64px 24px; color: var(--text3); }
  .me-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.35; }

  .me-skel { animation: mePulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }

  .me-month-select {
    padding: 5px 28px 5px 11px; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); font-size: 12.5px; font-family: inherit;
    font-weight: 600; outline: none; cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 9px center;
    transition: border-color 0.13s;
    height: 34px;
  }
  .me-month-select:focus { border-color: var(--border2); }
  .me-month-select.active { border-color: rgba(37,99,235,0.45); background: rgba(37,99,235,0.1); color: var(--primary-h); }
`;

// ─────────────────────────────────────────────
//  SVG icons — replaces all emojis
// ─────────────────────────────────────────────
const TYPE_ICONS = {
  personal_expense:    { icon: Icons.personalExpense, bg: "rgba(239,68,68,0.12)",   color: "var(--danger)"  },
  group_expense:       { icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "var(--danger)"  },
  group_expense_owed:  { icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "var(--danger)"  },
  settlement_sent:     { icon: Icons.settlement,      bg: "rgba(239,68,68,0.10)",   color: "var(--danger)"  },
  income:              { icon: Icons.income,          bg: "rgba(16,185,129,0.12)",  color: "var(--success)" },
  settlement_received: { icon: Icons.settlement,      bg: "rgba(99,102,241,0.12)",  color: "var(--success)" },
  loan_given:          { icon: Icons.lendMoney,       bg: "rgba(245,158,11,0.12)",  color: "#f59e0b"        },
  loan_taken:          { icon: Icons.borrowMoney,     bg: "rgba(99,102,241,0.12)",  color: "#818cf8"        },
};

// Keep separate from icon config — sign and bucket logic
const TYPE_CFG = {
  personal_expense:    { sign: "-", bucket: "spent"    },
  group_expense:       { sign: "-", bucket: "spent"    },
  group_expense_owed:  { sign: "-", bucket: "spent"    },
  settlement_sent:     { sign: "-", bucket: "spent"    },
  income:              { sign: "+", bucket: "received" },
  settlement_received: { sign: "+", bucket: "received" },
  loan_given:          { sign: "-", bucket: "loans"    },
  loan_taken:          { sign: "+", bucket: "loans"    },
};

const TABS = [
  { id: "all",      label: "All"      },
  { id: "spent",    label: "Spent"    },
  { id: "received", label: "Received" },
  { id: "loans",    label: "Loans"    },
];

const TAB_TO_MODAL = {
  all:      "personal",
  spent:    "personal",
  received: "income",
  loans:    "lend",
};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function fmtDate(s) {
  if (!s) return "";
  const d    = new Date(s + "T00:00:00");
  const now  = new Date(); now.setHours(0,0,0,0);
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.getTime() === now.getTime())  return "Today";
  if (d.getTime() === yest.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(arr) {
  const m = {};
  for (const e of arr) {
    const k = e.date || "Unknown";
    (m[k] = m[k] || []).push(e);
  }
  return m;
}

function displayAmount(entry) {
  if (entry.type === "group_expense") return entry.my_share ?? entry.amount;
  return entry.amount;
}

const SVG_SEARCH = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SVG_TRASH = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─────────────────────────────────────────────
//  Inline repayment widget (shown on loan_given entries)
// ─────────────────────────────────────────────
function InlineRepay({ entry, onSuccess }) {
  const [amt,     setAmt]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const remaining = entry.receivable ?? 0;
  const isFullyRepaid = remaining <= 0;

  if (isFullyRepaid) {
    return (
      <div className="me-settled-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Settled
      </div>
    );
  }

  async function handleRepay() {
    setErr("");
    const parsed = parseFloat(amt);
    if (isNaN(parsed) || parsed <= 0) { setErr("Enter a valid amount."); return; }
    if (parsed > remaining) { setErr(`Max ₹${remaining.toLocaleString("en-IN")}`); return; }
    setSaving(true);
    try {
      await api.post(`/loans/${entry.ref_id}/repay`, { repayment_amount: parsed });
      setAmt("");
      onSuccess();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11.5, color: "var(--text3)", marginBottom: 5 }}>
        Remaining: <span style={{ color: "#f59e0b", fontWeight: 700 }}>
          ₹{remaining.toLocaleString("en-IN")}
        </span>
        {" "}· Record repayment:
      </div>
      <div className="me-repay-row">
        <input
          className="me-repay-input"
          type="number" min="0" step="0.01"
          placeholder={`Amount (max ₹${remaining.toLocaleString("en-IN")})`}
          value={amt}
          onChange={e => { setAmt(e.target.value); setErr(""); }}
        />
        <button
          className="me-repay-btn"
          style={{ background: "#10b981", color: "#fff" }}
          disabled={saving || !amt}
          onClick={handleRepay}
        >
          {saving ? "…" : "Received Back"}
        </button>
      </div>
      {err && <div className="me-repay-err">{err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function Expenses() {
  const navigate = useNavigate();

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState(null);
  const [selMonth, setSelMonth] = useState("all"); // "all" or "YYYY-MM"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/timeline/");
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Summary ──
  const summary = (() => {
    let spent = 0, received = 0, net = 0;
    for (const e of entries) {
      const cfg = TYPE_CFG[e.type];
      if (!cfg) continue;
      const disp = displayAmount(e);
      if (cfg.bucket === "spent")    spent    += disp;
      if (cfg.bucket === "received") received += disp;
      if (e.type === "group_expense")      net += (e.receivable ?? 0);
      if (e.type === "group_expense_owed") net -= (e.amount ?? 0);
      if (e.type === "loan_given")         net += (e.receivable ?? 0);
      if (e.type === "loan_taken")         net -= (e.receivable ?? 0);
    }
    return { spent, received, lent: net > 0 ? net : 0, borrowed: net < 0 ? Math.abs(net) : 0 };
  })();

  // ── Available months derived from entries ──
  const monthOptions = (() => {
    const seen = new Set();
    for (const e of entries) {
      if (e.date && e.date.length >= 7) seen.add(e.date.slice(0, 7)); // "YYYY-MM"
    }
    return Array.from(seen).sort().reverse(); // newest first
  })();

  // ── Filter ──
  const visible = entries.filter(e => {
    const cfg = TYPE_CFG[e.type];
    if (!cfg) return false;
    if (filter !== "all" && cfg.bucket !== filter) return false;
    if (selMonth !== "all" && (!e.date || e.date.slice(0, 7) !== selMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${e.label} ${e.sub} ${e.group_name || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped  = groupByDate(visible);
  const dateKeys = Object.keys(grouped).sort().reverse();

  // ── Delete ──
  async function handleDelete(entry) {
    setDeleting(entry.ref_id);
    try {
      if (entry.type === "personal_expense") await api.delete(`/personal-expenses/${entry.ref_id}/`);
      else if (entry.type === "income")      await api.delete(`/income/${entry.ref_id}/`);
      else if (entry.type === "loan_given")  await api.delete(`/loans/${entry.ref_id}/`);
      else if (entry.type === "loan_taken")  await api.delete(`/borrows/${entry.ref_id}/`);
      await load();
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  const isDeletable = t => ["personal_expense", "income", "loan_given", "loan_taken"].includes(t);

  const sumCards = [
    { label: "Total Spent",    value: summary.spent,    color: "var(--danger)",  sub: "personal + your group share" },
    { label: "Money Received", value: summary.received, color: "var(--success)", sub: "income + settlements in"     },
    { label: "You Are Owed",   value: summary.lent,     color: summary.lent     > 0 ? "var(--success)" : "var(--text2)", sub: "group balances + loans" },
    { label: "You Owe",        value: summary.borrowed, color: summary.borrowed  > 0 ? "var(--danger)"  : "var(--text2)", sub: "outstanding borrowed"    },
  ];

  const modalDefaultTab = TAB_TO_MODAL[filter] || "personal";
  const actions = <AddEntryModal onSuccess={load} defaultTab={modalDefaultTab} />;

  return (
    <>
      <style>{STYLES}</style>

      <AppShell title="Expenses" actions={actions}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>
            Expenses
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>Your complete financial timeline</p>
        </div>

        {/* Summary cards */}
        <div className="me-summary">
          {sumCards.map((c, i) => (
            <div key={c.label} className="me-sum-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="me-sum-label">{c.label}</div>
              {loading
                ? <span className="me-skel" style={{ width: "60%", height: 26, marginBottom: 8 }} />
                : <div className="me-sum-val" style={{ color: c.color }}>
                    ₹{c.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>}
              <div className="me-sum-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar — matches Groups page layout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>

          {/* Search — LEFT, pushes everything else right */}
          <div className="me-search-wrap" style={{ marginRight: "auto" }}>
            <span className="me-search-icon">{SVG_SEARCH}</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
            />
          </div>

          {/* RIGHT side: type tabs + month dropdown + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {/* Type filter tabs */}
            <div className="me-tabs">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`me-tab ${filter === t.id ? "active" : ""}`}
                  onClick={() => setFilter(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Month / year dropdown */}
            <select
              className={`me-month-select ${selMonth !== "all" ? "active" : ""}`}
              value={selMonth}
              onChange={e => setSelMonth(e.target.value)}
            >
              <option value="all">All time</option>
              {monthOptions.map(m => {
                const [yr, mo] = m.split("-");
                const label = new Date(+yr, +mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>

            <div style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>
              {visible.length} entr{visible.length !== 1 ? "ies" : "y"}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="me-skel" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span className="me-skel" style={{ width: "45%", height: 13, marginBottom: 8 }} />
                  <span className="me-skel" style={{ width: "28%", height: 10 }} />
                </div>
                <span className="me-skel" style={{ width: 64, height: 15, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="me-empty">
            <div className="me-empty-icon">📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)", marginBottom: 5 }}>
              {search ? `No results for "${search}"` : filter !== "all" ? `No ${filter} entries` : "No entries yet"}
            </div>
            <div style={{ fontSize: 13 }}>
              {!search && filter === "all" && 'Use "+ Add Entry" to record your first transaction.'}
            </div>
          </div>
        ) : (
          <div>
            {dateKeys.map(dateKey => (
              <div key={dateKey}>
                <div className="me-date-header">{fmtDate(dateKey)}</div>

                {grouped[dateKey].map((entry, idx) => {
                  const cfg     = TYPE_CFG[entry.type];
                  const iconCfg = TYPE_ICONS[entry.type];
                  if (!cfg || !iconCfg) return null;

                  const disp  = displayAmount(entry);
                  const isGrp = entry.type === "group_expense";
                  const isLoanGiven = entry.type === "loan_given";
                  const isLoanTaken = entry.type === "loan_taken";

                  return (
                    <div
                      key={`${entry.type}-${entry.ref_id}-${idx}`}
                      className="me-entry"
                      style={{ animationDelay: `${idx * 0.025}s` }}
                    >
                      {/* Icon — SVG, no emoji */}
                      <div
                        className="me-entry-icon"
                        style={{ background: iconCfg.bg, color: iconCfg.color }}
                      >
                        {iconCfg.icon}
                      </div>

                      {/* Body */}
                      <div className="me-entry-body">
                        <div className="me-entry-label">{entry.label}</div>
                        <div className="me-entry-sub">{entry.sub}</div>

                        {/* Group expense breakdown */}
                        {isGrp && (
                          <div className="me-breakdown">
                            <div className="me-breakdown-row">
                              <span>You paid</span>
                              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                                ₹{Number(entry.amount).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="me-breakdown-row">
                              <span>Your share</span>
                              <span style={{ color: "#f87171", fontWeight: 600 }}>
                                ₹{Number(entry.my_share ?? 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="me-breakdown-row">
                              <span>You are owed</span>
                              <span style={{ color: "#34d399", fontWeight: 600 }}>
                                ₹{Number(entry.receivable ?? 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Loan given — inline repayment */}
                        {isLoanGiven && (
                          <InlineRepay entry={entry} onSuccess={load} />
                        )}

                        {/* Loan taken — show remaining to repay */}
                        {isLoanTaken && (
                          (() => {
                            const rem = entry.receivable ?? 0;
                            return rem <= 0 ? (
                              <div className="me-settled-badge">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Repaid
                              </div>
                            ) : (
                              <div style={{ marginTop: 5, fontSize: 12, color: "var(--text3)" }}>
                                Still to repay:{" "}
                                <span style={{ color: "#818cf8", fontWeight: 600 }}>
                                  ₹{rem.toLocaleString("en-IN")}
                                </span>
                              </div>
                            );
                          })()
                        )}

                        {/* Group link */}
                        {entry.group_id && (
                          <button
                            className="me-group-link"
                            onClick={() => navigate(`/groups/${entry.group_id}`)}
                          >
                            → {entry.group_name}
                          </button>
                        )}
                      </div>

                      {/* Right: amount + delete */}
                      <div className="me-entry-right">
                        <div className="me-entry-amount" style={{ color: iconCfg.color }}>
                          {cfg.sign}₹{disp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {isDeletable(entry.type) && (
                          <button
                            className="me-del"
                            title="Delete"
                            disabled={deleting === entry.ref_id}
                            onClick={() => handleDelete(entry)}
                          >
                            {deleting === entry.ref_id ? "…" : SVG_TRASH}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

      </AppShell>
    </>
  );
}