// --- frontend/src/pages/Activity.jsx ---

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

const STYLES = `
  @keyframes actFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes actPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* ── Summary chips row ── */
  .act-chips {
    display: flex; gap: 10px; flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .act-chip {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 13px; border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--surface); font-size: 12px;
    color: var(--text2); font-weight: 500;
    animation: actFadeUp 0.3s ease both;
    transition: border-color 0.13s;
  }
  .act-chip:hover { border-color: var(--border2); }
  .act-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  /* ── Toolbar ── */
  .act-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .act-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
  .act-search-wrap input {
    width: 100%; padding: 9px 14px 9px 38px;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface2); color: var(--text);
    font-size: 13.5px; font-family: inherit; outline: none;
    box-sizing: border-box; transition: border-color 0.14s;
  }
  .act-search-wrap input:focus { border-color: var(--border2); }
  .act-search-wrap input::placeholder { color: var(--text3); }
  .act-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: var(--text3);
    display: flex; pointer-events: none;
  }
  .act-tabs {
    display: flex; gap: 4px;
    background: var(--surface2); padding: 4px;
    border-radius: 10px; border: 1px solid var(--border);
  }
  .act-tab {
    padding: 5px 14px; border-radius: 7px;
    font-size: 12.5px; font-weight: 600; font-family: inherit;
    cursor: pointer; border: none; background: transparent;
    color: var(--text2); transition: all 0.13s;
  }
  .act-tab:hover { color: var(--text); }
  .act-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.3); }

  .act-month-select {
    padding: 5px 28px 5px 11px; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); font-size: 12.5px; font-family: inherit;
    font-weight: 600; outline: none; cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    transition: border-color 0.13s; height: 34px;
  }
  .act-month-select:focus { border-color: var(--border2); }
  .act-month-select.active { border-color: rgba(37,99,235,0.45); background: rgba(37,99,235,0.1); color: var(--primary-h); }

  /* ── Feed card ── */
  .act-feed {
    border-radius: 14px; border: 1px solid var(--border);
    background: var(--surface); overflow: hidden;
    animation: actFadeUp 0.3s ease both;
  }

  /* ── Date section header ── */
  .act-date-head {
    padding: 10px 20px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text3);
  }

  /* ── Feed row ── */
  .act-row {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.1s;
    animation: actFadeUp 0.2s ease both;
  }
  .act-row:last-child { border-bottom: none; }
  .act-row:hover { background: rgba(255,255,255,0.022); }

  /* ── Icon circle ── */
  .act-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Text body ── */
  .act-body { flex: 1; min-width: 0; }
  .act-desc {
    font-size: 13.5px; line-height: 1.5; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .act-desc strong { font-weight: 700; color: var(--text); }
  .act-desc span   { color: var(--text3); }
  .act-meta {
    display: flex; align-items: center; gap: 8px; margin-top: 4px;
  }
  .act-tag {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 20px;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text3);
  }
  .act-group-link {
    font-size: 11px; color: var(--primary-h);
    font-weight: 600;
  }

  /* ── Amount ── */
  .act-amt {
    font-size: 14px; font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em; flex-shrink: 0;
    text-align: right;
  }

  /* ── Skeleton ── */
  .act-skel {
    animation: actPulse 1.4s ease-in-out infinite;
    background: var(--surface3); border-radius: 5px; display: block;
  }

  /* ── Empty ── */
  .act-empty {
    text-align: center; padding: 64px 24px;
    color: var(--text3);
  }
  .act-empty-icon {
    margin-bottom: 14px; opacity: 0.2;
    display: flex; justify-content: center;
  }
`;

// ─────────────────────────────────────────────
//  SVGs
// ─────────────────────────────────────────────
const SVG = {
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  expense: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  payment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  empty: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
};

const TABS = [
  { id: "all",      label: "All"          },
  { id: "expense",  label: "Expenses"     },
  { id: "payment",  label: "Settlements"  },
];

function dateLabel(d) {
  const today = new Date().toISOString().split("T")[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yest)  return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function Activity() {
  const navigate = useNavigate();
  const [feed,    setFeed]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,      setTab]     = useState("all");
  const [search,   setSearch]  = useState("");
  const [selMonth, setSelMonth] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const { data: groups } = await api.get("/groups/");
        const allItems = [];
        await Promise.all(groups.map(async g => {
          try {
            const [eR, pR] = await Promise.all([
              api.get(`/expenses/${g.group_id}`),
              api.get(`/payments/${g.group_id}`),
            ]);
            eR.data.forEach(x => allItems.push({ type: "expense", date: x.expense_date, key: `e-${x.expense_id}`, group_name: g.group_name, group_id: g.group_id, ...x }));
            pR.data.forEach(x => allItems.push({ type: "payment", date: x.payment_date, key: `p-${x.payment_id}`, group_name: g.group_name, group_id: g.group_id, ...x }));
          } catch {}
        }));
        allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        setFeed(allItems);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Summary counts
  const expenseCount = feed.filter(f => f.type === "expense").length;
  const paymentCount = feed.filter(f => f.type === "payment").length;
  const totalSpend   = feed.filter(f => f.type === "expense").reduce((s, e) => s + Number(e.total_amount || 0), 0);

  // Available months from feed
  const monthOptions = (() => {
    const seen = new Set();
    for (const e of feed) {
      if (e.date && e.date.length >= 7) seen.add(e.date.slice(0, 7));
    }
    return Array.from(seen).sort().reverse();
  })();

  // Filter
  const visible = feed.filter(item => {
    if (tab !== "all" && item.type !== tab) return false;
    if (selMonth !== "all" && (!item.date || item.date.slice(0, 7) !== selMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${item.description || ""} ${item.payer_name || ""} ${item.payee_name || ""} ${item.group_name || ""} ${item.category_name || ""}`.toLowerCase();
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

  return (
    <>
      <style>{STYLES}</style>
      <AppShell title="Activity">

        {/* Page heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>
            Activity
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>All expenses and payments across your groups</p>
        </div>

        {/* Insight chips */}
        {!loading && feed.length > 0 && (
          <div className="act-chips">
            <div className="act-chip" style={{ animationDelay: "0s" }}>
              <span className="act-chip-dot" style={{ background: "#3b82f6" }} />
              {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
            </div>
            <div className="act-chip" style={{ animationDelay: "0.05s" }}>
              <span className="act-chip-dot" style={{ background: "#10b981" }} />
              {paymentCount} payment{paymentCount !== 1 ? "s" : ""}
            </div>
            <div className="act-chip" style={{ animationDelay: "0.1s" }}>
              <span className="act-chip-dot" style={{ background: "#f59e0b" }} />
              ₹{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })} total across groups
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="act-toolbar">
          {/* Search — left */}
          <div className="act-search-wrap" style={{ marginRight: "auto" }}>
            <span className="act-search-icon">{SVG.search}</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activity…"
            />
          </div>

          {/* Tabs + month + count — right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="act-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`act-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <select
              className={`act-month-select ${selMonth !== "all" ? "active" : ""}`}
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
              {visible.length} item{visible.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Feed */}
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
              <div className="act-empty-icon">{SVG.empty}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 5 }}>
                {search ? `No results for "${search}"` : "No activity yet"}
              </div>
              <div style={{ fontSize: 13 }}>
                {!search && "Expenses and payments will appear here."}
              </div>
            </div>
          </div>
        ) : (
          <div className="act-feed">
            {dateKeys.map(dateKey => (
              <div key={dateKey}>
                <div className="act-date-head">{dateLabel(dateKey)}</div>
                {grouped[dateKey].map((item, idx) => {
                  const isExpense = item.type === "expense";
                  const amount = Number(item.total_amount || item.amount || 0);

                  return (
                    <div
                      key={item.key}
                      className="act-row"
                      style={{ animationDelay: `${idx * 0.02}s` }}
                      onClick={() => navigate(`/groups/${item.group_id}`)}
                    >
                      {/* Icon */}
                      <div className="act-icon" style={{
                        background: isExpense ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                        color:      isExpense ? "#60a5fa"               : "#34d399",
                      }}>
                        {isExpense ? SVG.expense : SVG.payment}
                      </div>

                      {/* Body */}
                      <div className="act-body">
                        <div className="act-desc">
                          {isExpense ? (
                            <>
                              <strong>{item.payer_name}</strong>
                              <span> paid for </span>
                              <strong>{item.description}</strong>
                              <span> in </span>
                              <strong>{item.group_name}</strong>
                            </>
                          ) : (
                            <>
                              <strong>{item.payer_name}</strong>
                              <span> settled with </span>
                              <strong>{item.payee_name}</strong>
                              <span> in </span>
                              <strong>{item.group_name}</strong>
                            </>
                          )}
                        </div>
                        <div className="act-meta">
                          {isExpense && item.category_name && (
                            <span className="act-tag">{item.category_name}</span>
                          )}
                          {isExpense && item.split_type && (
                            <span className="act-tag" style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8", borderColor: "rgba(99,102,241,0.2)" }}>
                              {item.split_type}
                            </span>
                          )}
                          {item.note && (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{item.note}</span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="act-amt" style={{ color: isExpense ? "var(--text)" : "#34d399" }}>
                        {isExpense ? "" : "+"} ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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