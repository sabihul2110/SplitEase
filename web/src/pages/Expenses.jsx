// --- web/src/pages/Expenses.jsx ---

import { useState, useEffect, useCallback, useMemo } from "react";
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
  @keyframes meSlideIn {
    from { opacity:0; transform:translateX(-6px); }
    to   { opacity:1; transform:translateX(0); }
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

  /* ── Month Navigator ── */
  .me-month-nav {
    display: flex; align-items: center; gap: 0;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    height: 34px;
  }
  .me-month-nav-btn {
    width: 32px; height: 34px; display: flex; align-items: center; justify-content: center;
    background: none; border: none; color: var(--text2);
    cursor: pointer; font-family: inherit; transition: all 0.12s;
    flex-shrink: 0;
  }
  .me-month-nav-btn:hover:not(:disabled) { background: var(--surface3); color: var(--text); }
  .me-month-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .me-month-nav-label {
    padding: 0 10px; font-size: 12.5px; font-weight: 600;
    color: var(--text); white-space: nowrap; min-width: 108px; text-align: center;
    border-left: 1px solid var(--border); border-right: 1px solid var(--border);
    height: 34px; display: flex; align-items: center; justify-content: center;
    cursor: default; user-select: none;
  }
  .me-month-nav-label.is-current { color: var(--primary-h); }

  /* "Back to current month" reset chip */
  .me-month-reset {
    padding: 4px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    background: rgba(37,99,235,0.12); color: var(--primary-h);
    border: 1px solid rgba(37,99,235,0.25);
    cursor: pointer; font-family: inherit; transition: all 0.12s;
    animation: meFadeUp 0.15s ease both;
    white-space: nowrap;
  }
  .me-month-reset:hover { background: rgba(37,99,235,0.2); }

  /* ── Month section header ── */
  .me-month-section {
    margin-top: 32px;
    animation: meSlideIn 0.2s ease both;
  }
  .me-month-section:first-child { margin-top: 0; }
  .me-month-heading {
    font-size: 13px; font-weight: 800; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text2);
    padding: 0 0 10px 0;
    border-bottom: 2px solid var(--border);
    margin-bottom: 0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .me-month-heading-sum {
    font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
    text-transform: none; color: var(--text3);
  }

  /* ── Day sub-header ── */
  .me-date-header {
    font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--text3);
    padding: 12px 0 7px; margin-top: 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
  }
  .me-date-header.is-today {
    color: var(--primary-h);
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

  .me-empty {
    text-align: center; padding: 64px 24px; color: var(--text3);
    animation: meFadeUp 0.25s ease both;
  }
  .me-empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.35; }

  .me-skel { animation: mePulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }
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

/** Returns today's "YYYY-MM-DD" string */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns current month as "YYYY-MM" */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** Advance a "YYYY-MM" string by +1 or -1 month */
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format "YYYY-MM" → "April 2026" */
function fmtMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Format a date string for the day sub-header */
function fmtDayHeader(s) {
  if (!s) return "";
  const today = todayStr();
  if (s === today) return "Today";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Filter entries to a specific month "YYYY-MM".
 * Pass null / "all" to return all entries.
 */
function filterByMonth(entries, ym) {
  if (!ym || ym === "all") return entries;
  return entries.filter(e => e.date && e.date.slice(0, 7) === ym);
}

/** Compute summary totals from a list of entries */
function computeSummary(entries) {
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
  return {
    spent,
    received,
    lent:     net > 0 ? net : 0,
    borrowed: net < 0 ? Math.abs(net) : 0,
  };
}

/**
 * Groups entries into a two-level structure:
 * [
 *   { monthKey: "2026-04", monthLabel: "April 2026", days: [
 *       { dateKey: "2026-04-01", dayLabel: "Today" | "1 April 2026", entries: [...] },
 *       ...
 *   ]},
 *   ...
 * ]
 * Sorted newest-first at both levels.
 */
function groupByMonthAndDay(entries) {
  const monthMap = {};
  for (const e of entries) {
    const mk = e.date ? e.date.slice(0, 7) : "unknown";
    const dk = e.date || "unknown";
    if (!monthMap[mk]) monthMap[mk] = {};
    if (!monthMap[mk][dk]) monthMap[mk][dk] = [];
    monthMap[mk][dk].push(e);
  }

  return Object.keys(monthMap)
    .sort()
    .reverse()
    .map(mk => ({
      monthKey:   mk,
      monthLabel: mk === "unknown" ? "Unknown" : fmtMonthLabel(mk),
      days: Object.keys(monthMap[mk])
        .sort()
        .reverse()
        .map(dk => ({
          dateKey:  dk,
          dayLabel: fmtDayHeader(dk),
          isToday:  dk === todayStr(),
          entries:  monthMap[mk][dk],
        })),
    }));
}

function displayAmount(entry) {
  if (entry.type === "group_expense") return entry.my_share ?? entry.amount;
  return entry.amount;
}

// ─────────────────────────────────────────────
//  SVG primitives
// ─────────────────────────────────────────────
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

const SVG_ARROW_LEFT = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const SVG_ARROW_RIGHT = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─────────────────────────────────────────────
//  Month Navigator component
// ─────────────────────────────────────────────
function MonthNavigator({ value, onChange, availableMonths }) {
  const cur = currentMonth();
  const isCurrentMonth = value === cur;

  // Determine bounds from available data
  const oldest = availableMonths.length ? availableMonths[0] : value;
  const canGoBack    = value > oldest;
  const canGoForward = value < cur || availableMonths.some(m => m > value);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="me-month-nav">
        <button
          className="me-month-nav-btn"
          onClick={() => onChange(shiftMonth(value, -1))}
          disabled={!canGoBack}
          title="Previous month"
        >
          {SVG_ARROW_LEFT}
        </button>

        <div className={`me-month-nav-label ${isCurrentMonth ? "is-current" : ""}`}>
          {fmtMonthLabel(value)}
        </div>

        <button
          className="me-month-nav-btn"
          onClick={() => onChange(shiftMonth(value, 1))}
          disabled={!canGoForward}
          title="Next month"
        >
          {SVG_ARROW_RIGHT}
        </button>
      </div>

      {!isCurrentMonth && (
        <button className="me-month-reset" onClick={() => onChange(cur)}>
          Back to {fmtMonthLabel(cur).split(" ")[0]}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Inline repayment widget
// ─────────────────────────────────────────────
function InlineRepay({ entry, onSuccess }) {
  const [amt,    setAmt]    = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const remaining = entry.receivable ?? 0;
  if (remaining <= 0) {
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
//  Single entry row
// ─────────────────────────────────────────────
function EntryRow({ entry, idx, deleting, onDelete, navigate }) {
  const cfg     = TYPE_CFG[entry.type];
  const iconCfg = TYPE_ICONS[entry.type];
  if (!cfg || !iconCfg) return null;

  const disp        = displayAmount(entry);
  const isGrp       = entry.type === "group_expense";
  const isLoanGiven = entry.type === "loan_given";
  const isLoanTaken = entry.type === "loan_taken";

  const isDeletable = ["personal_expense", "income", "loan_given", "loan_taken"].includes(entry.type);

  return (
    <div
      className="me-entry"
      style={{ animationDelay: `${idx * 0.025}s` }}
    >
      <div className="me-entry-icon" style={{ background: iconCfg.bg, color: iconCfg.color }}>
        {iconCfg.icon}
      </div>

      <div className="me-entry-body">
        <div className="me-entry-label">{entry.label}</div>
        <div className="me-entry-sub">{entry.sub}</div>

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

        {isLoanGiven && <InlineRepay entry={entry} onSuccess={() => {}} />}

        {isLoanTaken && (() => {
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
        })()}

        {entry.group_id && (
          <button className="me-group-link" onClick={() => navigate(`/groups/${entry.group_id}`)}>
            → {entry.group_name}
          </button>
        )}
      </div>

      <div className="me-entry-right">
        <div className="me-entry-amount" style={{ color: iconCfg.color }}>
          {cfg.sign}₹{disp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
        {isDeletable && (
          <button
            className="me-del"
            title="Delete"
            disabled={deleting === entry.ref_id}
            onClick={() => onDelete(entry)}
          >
            {deleting === entry.ref_id ? "…" : SVG_TRASH}
          </button>
        )}
      </div>
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

  // Default to current month instead of "all"
  const [selMonth, setSelMonth] = useState(currentMonth);

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

  // ── All months present in data (for nav bounds) ──
  const availableMonths = useMemo(() => {
    const seen = new Set();
    for (const e of entries) {
      if (e.date?.length >= 7) seen.add(e.date.slice(0, 7));
    }
    return Array.from(seen).sort(); // oldest first
  }, [entries]);

  // ── Monthly-filtered entries → summary ──
  const monthEntries = useMemo(() => filterByMonth(entries, selMonth), [entries, selMonth]);
  const summary      = useMemo(() => computeSummary(monthEntries), [monthEntries]);

  // ── Tab + search filter ──
  const visible = useMemo(() => monthEntries.filter(e => {
    const cfg = TYPE_CFG[e.type];
    if (!cfg) return false;
    if (filter !== "all" && cfg.bucket !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${e.label} ${e.sub} ${e.group_name || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [monthEntries, filter, search]);

  // ── Hierarchical grouping ──
  const grouped = useMemo(() => groupByMonthAndDay(visible), [visible]);

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

  const sumCards = [
    { label: "Total Spent",    value: summary.spent,    color: "var(--danger)",  sub: "personal + your group share" },
    { label: "Money Received", value: summary.received, color: "var(--success)", sub: "income + settlements in"     },
    { label: "You Are Owed",   value: summary.lent,     color: summary.lent     > 0 ? "var(--success)" : "var(--text2)", sub: "group balances + loans" },
    { label: "You Owe",        value: summary.borrowed, color: summary.borrowed  > 0 ? "var(--danger)"  : "var(--text2)", sub: "outstanding borrowed"    },
  ];

  const modalDefaultTab = TAB_TO_MODAL[filter] || "personal";
  const actions = <AddEntryModal onSuccess={load} defaultTab={modalDefaultTab} />;

  // Month label for the subtitle
  const monthDisplayLabel = fmtMonthLabel(selMonth);

  return (
    <>
      <style>{STYLES}</style>

      <AppShell title="Expenses" actions={actions}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>
            Expenses
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>
            Financial summary for <span style={{ color: "var(--text2)", fontWeight: 600 }}>{monthDisplayLabel}</span>
          </p>
        </div>

        {/* Summary cards — monthly */}
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

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>

          {/* Search — left */}
          <div className="me-search-wrap" style={{ marginRight: "auto" }}>
            <span className="me-search-icon">{SVG_SEARCH}</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
            />
          </div>

          {/* Right side: tabs + month nav + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

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

            <MonthNavigator
              value={selMonth}
              onChange={setSelMonth}
              availableMonths={availableMonths}
            />

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
              {search
                ? `No results for "${search}"`
                : filter !== "all"
                  ? `No ${filter} entries in ${monthDisplayLabel}`
                  : `No entries for ${monthDisplayLabel}`}
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {!search && filter === "all" && (
                <>
                  Use "+ Add Entry" to record a transaction,
                  <br/>or navigate to another month using the arrows above.
                </>
              )}
            </div>
          </div>

        ) : (
          <div>
            {grouped.map(({ monthKey, monthLabel, days }) => {
              // Compute net spend for this month section (for the header annotation)
              const sectionEntries = days.flatMap(d => d.entries);
              const sectionSpent   = sectionEntries.reduce((acc, e) => {
                const cfg = TYPE_CFG[e.type];
                if (!cfg || cfg.bucket !== "spent") return acc;
                return acc + displayAmount(e);
              }, 0);

              return (
                <div key={monthKey} className="me-month-section">
                  {/* Month heading */}
                  <div className="me-month-heading">
                    <span>{monthLabel}</span>
                    {sectionSpent > 0 && (
                      <span className="me-month-heading-sum">
                        spent ₹{sectionSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Days within month */}
                  {days.map(({ dateKey, dayLabel, isToday, entries: dayEntries }) => (
                    <div key={dateKey}>
                      <div className={`me-date-header ${isToday ? "is-today" : ""}`}>
                        {dayLabel}
                      </div>
                      {dayEntries.map((entry, idx) => (
                        <EntryRow
                          key={`${entry.type}-${entry.ref_id}-${idx}`}
                          entry={entry}
                          idx={idx}
                          deleting={deleting}
                          onDelete={handleDelete}
                          navigate={navigate}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      </AppShell>
    </>
  );
}