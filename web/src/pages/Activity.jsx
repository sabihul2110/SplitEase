// --- web/src/pages/Activity.jsx ---
// FIX #11: Replaced the hand-rolled N+1 fan-out (GET /groups + N×GET /expenses
//          + N×GET /payments = 2N+1 calls) with a single GET /timeline/ call.
//          The backend already does this aggregation efficiently in Python
//          across 8 event types. The web (frontend) was re-doing a subset of that
//          work with far more round-trips.
//
// BEHAVIOUR CHANGES vs original:
//   • Feed now includes personal expenses, income, loans, borrows, and
//     settlement payments in addition to group expenses — richer timeline.
//   • Each item has a `type` field (group_expense, personal_expense, income,
//     loan_given, loan_taken, settlement_received, settlement_sent,
//     group_expense_owed) instead of just "expense" / "payment".
//   • Filter tabs updated: All / Group Expenses / Settlements / Personal.
//   • Clicking a row still navigates to the group when group_id is present.
//     Personal/income/loan rows are non-navigable (no group_id).
//   • Summary chips now show personal spend + group spend separately.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

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
`;

// Type metadata: icon background + foreground colour + label
const TYPE_META = {
  group_expense:       { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa",  label: "Group expense"   },
  group_expense_owed:  { bg: "rgba(239,68,68,0.10)",   color: "#f87171",  label: "You owe"         },
  personal_expense:    { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24",  label: "Personal"        },
  income:              { bg: "rgba(16,185,129,0.12)",  color: "#34d399",  label: "Income"          },
  loan_given:          { bg: "rgba(99,102,241,0.12)",  color: "#818cf8",  label: "Loan given"      },
  loan_taken:          { bg: "rgba(236,72,153,0.12)",  color: "#f472b6",  label: "Loan taken"      },
  settlement_received: { bg: "rgba(16,185,129,0.12)",  color: "#34d399",  label: "Received"        },
  settlement_sent:     { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa",  label: "Sent"            },
};

const ICON_SVG = {
  expense:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  settlement: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  income:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="7"/><polyline points="7 12 12 7 17 12"/><path d="M4 20 Q12 23 20 20"/></svg>,
  loan:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20 Q4 14 12 14 Q20 14 20 20"/></svg>,
  search:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  empty:      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

function iconForType(type) {
  if (type.includes("expense"))    return ICON_SVG.expense;
  if (type.includes("settlement")) return ICON_SVG.settlement;
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
  if (tab === "money")    return type === "loan_given" || type === "loan_taken";
  return true;
}

function dateLabel(d) {
  const today = new Date().toISOString().split("T")[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yest)  return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function Activity() {
  const navigate = useNavigate();
  const [feed,     setFeed]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("all");
  const [search,   setSearch]   = useState("");
  const [selMonth, setSelMonth] = useState("all");

  useEffect(() => {
    // FIX #11: single API call instead of 2N+1 fan-out
    api.get("/timeline/?limit=200")
      .then(r => setFeed(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      <AppShell title="Activity">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>Activity</h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>Your complete financial timeline</p>
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
                  const isInflow  = item.type === "income" || item.type === "settlement_received" || item.type === "loan_taken";

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
      </AppShell>
    </>
  );
}