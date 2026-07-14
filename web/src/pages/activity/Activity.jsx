// --- web/src/pages/activity/Activity.jsx ---


import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTimeline, downloadStatement } from "../../api/timeline";
import DateInput from "../../components/common/DateInput";

const STYLES = `
  @keyframes actFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes actPulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  .act-chips { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
  .act-chip  { display: flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); font-size: 12px; color: var(--text2); font-weight: 500; animation: actFadeUp 0.3s ease both; transition: border-color 0.13s; }
  .act-chip:hover { border-color: var(--border2); }
  .act-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .act-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .act-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
  .act-search-wrap input { width: 100%; padding: 9px 14px 9px 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.14s; }
  .act-search-wrap input:focus { border-color: var(--border2); }
  .act-search-wrap input::placeholder { color: var(--text3); }
  .act-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); display: flex; pointer-events: none; }
  .act-tabs { display: flex; gap: 4px; background: var(--surface2); padding: 4px; border-radius: 10px; border: 1px solid var(--border); }
  .act-tab  { padding: 5px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer; border: none; background: transparent; color: var(--text2); transition: all 0.13s; }
  .act-tab:hover { color: var(--text); }
  .act-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.3); }
  .act-month-select { padding: 5px 28px 5px 11px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: 12.5px; font-family: inherit; font-weight: 600; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; transition: border-color 0.13s; height: 34px; }
  .act-month-select:focus { border-color: var(--border2); }
  .act-month-select.active { border-color: rgba(37,99,235,0.45); background: rgba(37,99,235,0.1); color: var(--primary-h); }
  .act-feed { border-radius: 14px; border: 1px solid var(--border); background: var(--surface); overflow: hidden; animation: actFadeUp 0.3s ease both; }
  .act-date-head { padding: 10px 20px; background: var(--surface2); border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); }
  .act-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.1s; animation: actFadeUp 0.2s ease both; }
  .act-row:last-child { border-bottom: none; }
  .act-row:hover { background: rgba(255,255,255,0.022); }
  .act-row.no-link { cursor: default; }
  .act-icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .act-body { flex: 1; min-width: 0; }
  .act-desc { font-size: 13.5px; line-height: 1.5; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .act-desc strong { font-weight: 700; color: var(--text); }
  .act-desc span   { color: var(--text3); }
  .act-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .act-tag  { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; background: var(--surface2); border: 1px solid var(--border); color: var(--text3); }
  .act-amt  { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; flex-shrink: 0; text-align: right; }
  .act-skel { animation: actPulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }
  .act-empty { text-align: center; padding: 64px 24px; color: var(--text3); }
  .act-empty-icon { margin-bottom: 14px; opacity: 0.2; display: flex; justify-content: center; }

  .act-download-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface2); color: var(--primary-h); cursor: pointer; transition: border-color 0.13s, background 0.13s; flex-shrink: 0; }
  .act-download-btn:hover:not(:disabled) { border-color: var(--border2); }
  .act-download-btn:disabled { color: var(--text3); cursor: default; opacity: 0.6; }

  .act-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: actFadeUp 0.15s ease both; }
  .act-modal { width: 100%; max-width: 420px; background: #171c2c; border: 1px solid #242a3d; border-radius: 16px; padding: 24px; max-height: 88vh; overflow-y: auto; }
  .act-modal-title { font-size: 17px; font-weight: 800; color: var(--text); text-align: center; margin-bottom: 4px; }
  .act-modal-sub { font-size: 13px; color: var(--text3); text-align: center; margin-bottom: 4px; }

  .act-modal-tabs { display: flex; gap: 6px; background: var(--surface2); padding: 4px; border-radius: 10px; border: 1px solid var(--border); margin-top: 16px; }
  .act-modal-tab { flex: 1; padding: 8px 4px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; border: none; background: transparent; color: var(--text2); transition: all 0.13s; }
  .act-modal-tab.active { background: var(--surface); color: var(--text); }

  .act-radio-list { margin-top: 14px; }
  .act-radio-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 2px; border-bottom: 1px solid var(--border); cursor: pointer; }
  .act-radio-row:last-child { border-bottom: none; }
  .act-radio-label { font-size: 14px; color: var(--text); font-weight: 500; }
  .act-radio-outer { width: 19px; height: 19px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .act-radio-outer.active { border-color: var(--primary); }
  .act-radio-inner { width: 9px; height: 9px; border-radius: 50%; background: var(--primary); }

  .act-custom-row { margin-top: 14px; display: flex; flex-direction: column; gap: 12px; }

  font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; }

  .act-modal-primary-btn { width: 100%; background: var(--primary); color: #fff; border: none; border-radius: 11px; padding: 13px; font-size: 14.5px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 20px; transition: opacity 0.13s; }
  .act-modal-primary-btn:disabled { opacity: 0.6; cursor: default; }
  .act-modal-secondary-btn { width: 100%; background: transparent; color: var(--text2); border: 1px solid var(--border); border-radius: 11px; padding: 13px; font-size: 14.5px; font-weight: 600; font-family: inherit; cursor: pointer; margin-top: 10px; }

  .act-success-icon-wrap { width: 54px; height: 54px; border-radius: 27px; background: rgba(16,185,129,0.14); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
  .act-success-icon-wrap.error { background: rgba(239,68,68,0.14); }
`;

// Type metadata: icon background + foreground colour + label
const TYPE_META = {
  group_expense:            { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa",  label: "Group expense"    },
  group_expense_owed:       { bg: "rgba(239,68,68,0.10)",   color: "#f87171",  label: "You owe"          },
  personal_expense:         { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24",  label: "Personal"         },
  income:                   { bg: "rgba(16,185,129,0.12)",  color: "#34d399",  label: "Income"           },
  loan_given:                { bg: "rgba(99,102,241,0.12)",  color: "#818cf8",  label: "Loan given"       },
  loan_taken:                { bg: "rgba(236,72,153,0.12)",  color: "#f472b6",  label: "Loan taken"       },
  settlement_received:      { bg: "rgba(16,185,129,0.12)",  color: "#34d399",  label: "Received"         },
  settlement_sent:          { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa",  label: "Sent"             },
  loan_repayment_received:  { bg: "rgba(16,185,129,0.12)",  color: "#34d399",  label: "Repayment received" },
  loan_repayment_paid:      { bg: "rgba(239,68,68,0.10)",   color: "#f87171",  label: "Repayment paid"     },
};

const ICON_SVG = {
  expense:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  settlement: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  paymentSettled: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.76Z"/><circle cx="12" cy="12" r="5.5"/><polyline points="10 12 11.5 13.5 14.5 10.5"/></svg>,
  income:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="7"/><polyline points="7 12 12 7 17 12"/><path d="M4 20 Q12 23 20 20"/></svg>,
  loan:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20 Q4 14 12 14 Q20 14 20 20"/></svg>,
  search:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  empty:      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  receipt:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12a1 1 0 0 1 1 1v18l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L4 21V3a1 1 0 0 1 1-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>,
  close:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

function iconForType(type) {
  if (type.includes("expense"))    return ICON_SVG.expense;
  if (type.includes("settlement")) return ICON_SVG.paymentSettled;
  if (type.includes("repayment"))  return ICON_SVG.paymentSettled;
  if (type === "income")           return ICON_SVG.income;
  return ICON_SVG.loan;
}

const TABS = [
  { id: "all",      label: "All"        },
  { id: "group",    label: "Group"      },
  { id: "personal", label: "Personal"   },
  { id: "money",    label: "Money"      },
];

// Map tab id → which type strings it matches
function tabMatches(tab, type) {
  if (tab === "all")      return true;
  if (tab === "group")    return type === "group_expense" || type === "group_expense_owed" || type.startsWith("settlement");
  if (tab === "personal") return type === "personal_expense" || type === "income";
  if (tab === "money")    return type === "loan_given" || type === "loan_taken" ||
                                  type === "loan_repayment_received" || type === "loan_repayment_paid";
  return true;
}

function dateLabel(d) {
  const today = new Date().toISOString().split("T")[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yest)  return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ── Statement-period helpers (mirrors mobile ActivityScreen.jsx) ───────────
function isoToday() {
  return new Date().toISOString().split("T")[0];
}
function toIso(d) {
  return d.toISOString().split("T")[0];
}
function fmtStatementDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function rangeLabel(start, end) {
  return `${fmtStatementDate(start)} to ${fmtStatementDate(end)}`;
}
function daysAgoRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const s = toIso(start), e = toIso(end);
  return { start: s, end: e, label: `Last ${days} days`, statementLabel: rangeLabel(s, e), periodType: "range" };
}
function monthRangeFor(monthsAgo = 0) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const label = target.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { start: toIso(start), end: toIso(end), label, statementLabel: label, periodType: "month" };
}
// Indian financial year: Apr 1 -> Mar 31
function fyRangeFor(yearsAgo = 0) {
  const now = new Date();
  const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStartYear = currentFyStartYear - yearsAgo;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyStartYear + 1, 2, 31);
  const label = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const s = toIso(start), e = toIso(end);
  return { start: s, end: e, label, statementLabel: rangeLabel(s, e), periodType: "range" };
}

const PERIOD_TABS = [
  { id: "range",  label: "Range"  },
  { id: "month",  label: "Month"  },
  { id: "fy",     label: "FY"     },
  { id: "custom", label: "Custom" },
];

export default function Activity() {
  const navigate = useNavigate();
  const [feed,     setFeed]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("all");
  const [search,   setSearch]   = useState("");
  const [selMonth, setSelMonth] = useState("all");

  // ── Statement download state ──────────────────────────────────────────
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [periodTab, setPeriodTab] = useState("range");
  const [selectedRange, setSelectedRange] = useState(30);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedFy, setSelectedFy] = useState(0);
  const [customStart, setCustomStart] = useState(isoToday());
  const [customEnd, setCustomEnd] = useState(isoToday());
  const [downloading, setDownloading] = useState(false);
  const [resultInfo, setResultInfo] = useState(null); // { error?: true }

  useEffect(() => {
    // FIX #11: single API call instead of 2N+1 fan-out
    getTimeline()
      .then(r => setFeed(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runDownload = useCallback(async (startDate, endDate, statementLabel, periodType) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data } = await downloadStatement(startDate, endDate, statementLabel, periodType);
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "splitease-statement.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setShowPeriodPicker(false);
      setResultInfo({});
    } catch (err) {
      console.log("Statement download failed:", err?.response?.status, err?.message);
      setShowPeriodPicker(false);
      setResultInfo({ error: true });
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const handleDownloadPress = useCallback(() => {
    if (periodTab === "range") {
      const { start, end, statementLabel, periodType } = daysAgoRange(selectedRange);
      runDownload(start, end, statementLabel, periodType);
    } else if (periodTab === "month") {
      const { start, end, statementLabel, periodType } = monthRangeFor(selectedMonth);
      runDownload(start, end, statementLabel, periodType);
    } else if (periodTab === "fy") {
      const { start, end, statementLabel, periodType } = fyRangeFor(selectedFy);
      runDownload(start, end, statementLabel, periodType);
    } else {
      runDownload(customStart, customEnd, rangeLabel(customStart, customEnd), "range");
    }
  }, [periodTab, selectedRange, selectedMonth, selectedFy, customStart, customEnd, runDownload]);

  // Summary counts
  const groupSpend    = feed.filter(f => f.type === "group_expense").reduce((s, e) => s + Number(e.amount || 0), 0);
  const personalSpend = feed.filter(f => f.type === "personal_expense").reduce((s, e) => s + Number(e.amount || 0), 0);
  const settledCount  = feed.filter(f => f.type === "settlement_sent" || f.type === "settlement_received").length;

  // Available months
  const monthOptions = (() => {
    const seen = new Set();
    for (const e of feed) {
      if (e.date && e.date.length >= 7) seen.add(e.date.slice(0, 7));
    }
    return Array.from(seen).sort().reverse();
  })();

  // Filter
  const visible = feed.filter(item => {
    if (!tabMatches(tab, item.type)) return false;
    if (selMonth !== "all" && (!item.date || item.date.slice(0, 7) !== selMonth)) return false;
    if (search) {
      const q   = search.toLowerCase();
      const hay = `${item.label || ""} ${item.sub || ""} ${item.group_name || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Group by date
  const grouped = {};
  visible.forEach(item => {
    const d = item.date || "Unknown";
    (grouped[d] = grouped[d] || []).push(item);
  });
  const dateKeys = Object.keys(grouped).sort().reverse();

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <>
      <style>{STYLES}</style>
      <>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>Activity</h1>
            <p style={{ fontSize: 14, color: "var(--text3)" }}>Your complete financial timeline</p>
          </div>
          <button
            className="act-download-btn"
            onClick={() => setShowPeriodPicker(true)}
            disabled={downloading}
            title="Download statement"
          >
            {ICON_SVG.receipt}
          </button>
        </div>

        {!loading && feed.length > 0 && (
          <div className="act-chips">
            <div className="act-chip"><span className="act-chip-dot" style={{ background: "#3b82f6" }} />₹{fmt(groupSpend)} group spend</div>
            <div className="act-chip"><span className="act-chip-dot" style={{ background: "#f59e0b" }} />₹{fmt(personalSpend)} personal spend</div>
            <div className="act-chip"><span className="act-chip-dot" style={{ background: "#10b981" }} />{settledCount} settlement{settledCount !== 1 ? "s" : ""}</div>
          </div>
        )}

        <div className="act-toolbar">
          <div className="act-search-wrap" style={{ marginRight: "auto" }}>
            <span className="act-search-icon">{ICON_SVG.search}</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity…" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="act-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`act-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            <select className={`act-month-select ${selMonth !== "all" ? "active" : ""}`} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
              <option value="all">All time</option>
              {monthOptions.map(m => {
                const [yr, mo] = m.split("-");
                return <option key={m} value={m}>{new Date(+yr, +mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>;
              })}
            </select>
            <div style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>{visible.length} item{visible.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {loading ? (
          <div className="act-feed">
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span className="act-skel" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span className="act-skel" style={{ width: "55%", height: 13, marginBottom: 8 }} />
                  <span className="act-skel" style={{ width: "28%", height: 10 }} />
                </div>
                <span className="act-skel" style={{ width: 52, height: 15, borderRadius: 6, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="act-feed">
            <div className="act-empty">
              <div className="act-empty-icon">{ICON_SVG.empty}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 5 }}>
                {search ? `No results for "${search}"` : "No activity yet"}
              </div>
              <div style={{ fontSize: 13 }}>{!search && "Expenses, payments, and income will appear here."}</div>
            </div>
          </div>
        ) : (
          <div className="act-feed">
            {dateKeys.map(dateKey => (
              <div key={dateKey}>
                <div className="act-date-head">{dateLabel(dateKey)}</div>
                {grouped[dateKey].map((item, idx) => {
                  const meta      = TYPE_META[item.type] || TYPE_META.group_expense;
                  const canNav    = !!item.group_id;
                  const amount    = Number(item.amount || 0);
                  const isInflow = item.type === "income" || item.type === "settlement_received" ||
                 item.type === "loan_taken" || item.type === "loan_repayment_received";

                  return (
                    <div key={`${item.type}-${item.ref_id}-${idx}`}
                      className={`act-row${canNav ? "" : " no-link"}`}
                      style={{ animationDelay: `${idx * 0.02}s` }}
                      onClick={() => canNav && navigate(`/groups/${item.group_id}`)}
                    >
                      <div className="act-icon" style={{ background: meta.bg, color: meta.color }}>
                        {iconForType(item.type)}
                      </div>
                      <div className="act-body">
                        <div className="act-desc"><strong>{item.label}</strong></div>
                        <div className="act-meta">
                          <span className="act-tag">{meta.label}</span>
                          {item.sub && <span style={{ fontSize: 11, color: "var(--text3)" }}>{item.sub}</span>}
                          {item.group_name && <span style={{ fontSize: 11, color: "var(--primary-h)", fontWeight: 600 }}>{item.group_name}</span>}
                        </div>
                      </div>
                      <div className="act-amt" style={{ color: isInflow ? "var(--success)" : "var(--text)" }}>
                        {isInflow ? "+" : ""}₹{fmt(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Statement period picker */}
        {showPeriodPicker && (
          <div className="act-modal-overlay" onClick={() => setShowPeriodPicker(false)}>
            <div className="act-modal" onClick={e => e.stopPropagation()}>
              <div className="act-modal-title">Statement Period</div>
              <div className="act-modal-sub">Choose the range to include in your PDF</div>

              <div className="act-modal-tabs">
                {PERIOD_TABS.map(t => (
                  <button
                    key={t.id}
                    className={`act-modal-tab ${periodTab === t.id ? "active" : ""}`}
                    onClick={() => setPeriodTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {periodTab === "range" && (
                <div className="act-radio-list">
                  {[7, 30, 90, 180, 365].map(d => (
                    <div key={d} className="act-radio-row" onClick={() => setSelectedRange(d)}>
                      <span className="act-radio-label">Last {d} days</span>
                      <span className={`act-radio-outer ${selectedRange === d ? "active" : ""}`}>
                        {selectedRange === d && <span className="act-radio-inner" />}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {periodTab === "month" && (
                <div className="act-radio-list">
                  {[0, 1, 2, 3, 4, 5].map(m => (
                    <div key={m} className="act-radio-row" onClick={() => setSelectedMonth(m)}>
                      <span className="act-radio-label">{monthRangeFor(m).label}</span>
                      <span className={`act-radio-outer ${selectedMonth === m ? "active" : ""}`}>
                        {selectedMonth === m && <span className="act-radio-inner" />}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {periodTab === "fy" && (
                <div className="act-radio-list">
                  {[0, 1, 2, 3].map(y => (
                    <div key={y} className="act-radio-row" onClick={() => setSelectedFy(y)}>
                      <span className="act-radio-label">{fyRangeFor(y).label}{y === 0 ? " (Current)" : ""}</span>
                      <span className={`act-radio-outer ${selectedFy === y ? "active" : ""}`}>
                        {selectedFy === y && <span className="act-radio-inner" />}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {periodTab === "custom" && (
                <div className="act-custom-row">
                  <DateInput
                    label="From"
                    value={customStart}
                    onChange={setCustomStart}
                    maxDate={new Date(customEnd)}
                  />
                  <DateInput
                    label="To"
                    value={customEnd}
                    onChange={setCustomEnd}
                    maxDate={new Date()}
                  />
                </div>
              )}

              <button className="act-modal-primary-btn" onClick={handleDownloadPress} disabled={downloading}>
                {downloading ? "Generating…" : "Download Statement"}
              </button>
              <button className="act-modal-secondary-btn" onClick={() => setShowPeriodPicker(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Result feedback */}
        {resultInfo && (
          <div className="act-modal-overlay" onClick={() => setResultInfo(null)}>
            <div className="act-modal" onClick={e => e.stopPropagation()}>
              {resultInfo.error ? (
                <>
                  <div className="act-success-icon-wrap error">
                    <span style={{ color: "var(--danger, #f87171)" }}>{ICON_SVG.close}</span>
                  </div>
                  <div className="act-modal-title">Download failed</div>
                  <div className="act-modal-sub">Could not generate your statement. Please try again.</div>
                </>
              ) : (
                <>
                  <div className="act-success-icon-wrap">
                    <span style={{ color: "var(--success)" }}>{ICON_SVG.settlement}</span>
                  </div>
                  <div className="act-modal-title">Statement Ready</div>
                  <div className="act-modal-sub">splitease-statement.pdf has been downloaded.</div>
                </>
              )}
              <button className="act-modal-primary-btn" onClick={() => setResultInfo(null)}>Done</button>
            </div>
          </div>
        )}
      </>
    </>
  );
}