// --- frontend/src/pages/Groups.jsx ---
// v4: Matches reference screenshot — status badges, large balance text,
//     no stat tiles, no action buttons on card, filter tabs, dashed "New Group" card

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import { getGroupIcon } from "../utils/GroupIcons";

// ─────────────────────────────────────────────
//  Global styles
// ─────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.3); }
  }

  /* ─── Summary cards ─── */
  .gs-card {
    border-radius: 14px;
    border: 1px solid var(--border);
    padding: 22px 24px 20px;
    background: var(--surface);
    cursor: default;
    transition: border-color 0.18s, box-shadow 0.18s;
    animation: fadeUp 0.3s ease both;
  }
  .gs-card:hover {
    border-color: var(--border2);
    box-shadow: 0 4px 24px rgba(0,0,0,0.22);
  }

  /* ─── Group card grid ─── */
  .gc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
  }

  /* ─── Group card ─── */
  .gc {
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 24px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    min-height: 220px;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    animation: fadeUp 0.3s ease both;
    position: relative;
    overflow: hidden;
  }
  .gc:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  }
  .gc.owed:hover  { border-color: rgba(16,185,129,0.4); }
  .gc.owe:hover   { border-color: rgba(239,68,68,0.4); }
  .gc.settled:hover { border-color: rgba(100,116,139,0.5); }

  /* Dashed new group card */
  .gc-new {
    border-radius: 16px;
    border: 2px dashed var(--border2);
    background: transparent;
    padding: 24px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    gap: 12px;
    transition: border-color 0.18s, background 0.18s;
    animation: fadeUp 0.3s ease both;
  }
  .gc-new:hover {
    border-color: var(--primary-h);
    background: rgba(37,99,235,0.04);
  }
  .gc-new-plus {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--border2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text2);
    transition: background 0.15s, color 0.15s;
  }
  .gc-new:hover .gc-new-plus {
    background: rgba(37,99,235,0.12);
    color: var(--primary-h);
    border-color: rgba(37,99,235,0.3);
  }

  /* ─── Status badge ─── */
  .gc-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 20px;
  }
  .gc-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .gc-status.settled  { background: rgba(100,116,139,0.12); color: #94a3b8; }
  .gc-status.settled .gc-status-dot { background: #94a3b8; }
  .gc-status.owe      { background: rgba(239,68,68,0.10); color: #f87171; }
  .gc-status.owe .gc-status-dot { background: #ef4444; animation: dotPulse 2s ease-in-out infinite; }
  .gc-status.owed     { background: rgba(16,185,129,0.10); color: #34d399; }
  .gc-status.owed .gc-status-dot { background: #10b981; }
  .gc-status.loading  { background: var(--surface3); color: var(--text3); }
  .gc-status.loading .gc-status-dot { background: var(--text3); }

  /* ─── Filter tabs ─── */
  .gf-tabs {
    display: flex;
    gap: 4px;
    background: var(--surface2);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid var(--border);
  }
  .gf-tab {
    padding: 6px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    background: transparent;
    color: var(--text2);
  }
  .gf-tab:hover { color: var(--text); background: rgba(255,255,255,0.04); }
  .gf-tab.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 6px rgba(0,0,0,0.3);
  }

  /* ─── Search input ─── */
  .gf-search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 340px;
  }
  .gf-search-wrap input {
    width: 100%;
    padding: 9px 14px 9px 38px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  .gf-search-wrap input:focus { border-color: var(--border2); }
  .gf-search-wrap input::placeholder { color: var(--text3); }
  .gf-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text3);
    display: flex;
    pointer-events: none;
  }

  /* ─── Sort dropdown ─── */
  .gf-sort {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface2);
    font-size: 13px;
    font-weight: 500;
    color: var(--text2);
    cursor: pointer;
    gap: 6px;
    white-space: nowrap;
  }
  .gf-sort select {
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
  }

  /* ─── Member avatars ─── */
  .gc-avatars {
    display: flex;
    align-items: center;
  }
  .gc-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    margin-left: -6px;
    flex-shrink: 0;
  }
  .gc-avatar:first-child { margin-left: 0; }
  .gc-avatar-more {
    background: var(--surface3);
    color: var(--text2);
    border-color: var(--surface);
    font-size: 9px;
    font-weight: 700;
  }

  /* ─── Remind popover ─── */
  .g-remind-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 260px;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    z-index: 300;
    overflow: hidden;
    animation: fadeIn 0.15s ease both;
  }
  .g-remind-head {
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    font-weight: 700;
    color: var(--text3);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .g-remind-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  .g-remind-row:last-child { border-bottom: none; }
  .g-remind-row:hover { background: var(--surface2); }
  .g-remind-btn-sm {
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(245,158,11,0.35);
    background: rgba(245,158,11,0.10);
    color: #f59e0b;
    cursor: pointer;
    transition: all 0.12s;
    flex-shrink: 0;
  }
  .g-remind-btn-sm:hover { background: rgba(245,158,11,0.22); }
  .g-remind-btn-sm:disabled { opacity: 0.45; cursor: not-allowed; }
  .g-remind-btn-sm.sent {
    background: rgba(16,185,129,0.10);
    color: #10b981;
    border-color: rgba(16,185,129,0.3);
  }

  /* ─── Action footer (shown on hover) ─── */
  .gc-footer {
    margin-top: auto;
    padding-top: 18px;
    display: flex;
    gap: 8px;
  }
  .gc-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 34px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    text-decoration: none;
    transition: all 0.12s;
    white-space: nowrap;
  }
  .gc-btn:active { transform: scale(0.96); }
  .gc-btn.ghost {
    background: var(--surface2);
    color: var(--text2);
    border: 1px solid var(--border);
  }
  .gc-btn.ghost:hover { background: var(--surface3); color: var(--text); border-color: var(--border2); }
  .gc-btn.settle {
    background: #10b981; color: #fff; border: 1px solid #0d9e6e;
  }
  .gc-btn.settle:hover { background: #0d9e6e; }
  .gc-btn.remind-btn {
    background: rgba(245,158,11,0.12); color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.30);
  }
  .gc-btn.remind-btn:hover { background: rgba(245,158,11,0.22); }
  .gc-btn.settled-badge {
    background: var(--surface2); color: var(--text3);
    border: 1px solid var(--border); cursor: default;
  }

  /* Skeleton */
  .skel {
    animation: pulse 1.4s ease-in-out infinite;
    background: var(--surface3);
    border-radius: 5px;
    display: block;
  }
`;

// ─────────────────────────────────────────────
//  SVG icon set (UI chrome only)
// ─────────────────────────────────────────────
const UI = {
  up:     (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  down:   (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  check:  (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  plus:   (sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  users:  (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:   (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  eye:    (sz=12) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  trend:  (sz=12) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  info:   (sz=12) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  x:      (sz=11) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  sort:   (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  chevDown: (sz=12) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
};

// Avatar color palette (consistent per char code)
const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f472b6", "#6366f1",
];
function avatarColor(name = "") {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────
//  SummaryBar — matches reference screenshot style
// ─────────────────────────────────────────────
function SummaryBar({ totalGroups, youOwe, owedToYou, loading }) {
  const net = owedToYou - youOwe;

  const cards = [
    {
      key: "groups",
      label: "TOTAL GROUPS",
      value: String(totalGroups),
      prefix: "",
      valueColor: "var(--text)",
      valueSz: 36,
      sub: "+2 this month",           // decorative for now
      subColor: "var(--success)",
      subIcon: UI.trend(12),
    },
    {
      key: "net",
      label: "NET BALANCE",
      value: net === 0 ? "0.00" : Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      prefix: net > 0 ? "+₹" : net < 0 ? "-₹" : "₹",
      valueColor: net > 0 ? "var(--success)" : net < 0 ? "var(--danger)" : "var(--text2)",
      valueSz: 32,
      sub: "Updates in real-time",
      subColor: "var(--text3)",
      subIcon: UI.info(12),
    },
    {
      key: "owe",
      label: "YOU OWE",
      value: youOwe.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      prefix: "₹",
      valueColor: youOwe > 0 ? "var(--danger)" : "var(--text2)",
      valueSz: 32,
      sub: youOwe > 0 ? `${Math.ceil(youOwe / 100)} pending settlements` : "All clear",
      subColor: "var(--text3)",
      subIcon: null,
    },
    {
      key: "owed",
      label: "YOU ARE OWED",
      value: owedToYou.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      prefix: "₹",
      valueColor: owedToYou > 0 ? "var(--success)" : "var(--text2)",
      valueSz: 32,
      sub: owedToYou > 0 ? `Across ${Math.ceil(owedToYou / 50)} groups` : "All settled",
      subColor: "var(--text3)",
      subIcon: null,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
      {cards.map((c, i) => (
        <div key={c.key} className="gs-card" style={{ animationDelay: `${i * 0.06}s` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 14 }}>
            {c.label}
          </div>

          {loading ? (
            <div className="skel" style={{ width: "70%", height: c.key === "groups" ? 38 : 30, marginBottom: 12 }} />
          ) : (
            <div style={{
              fontSize: c.valueSz,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              color: c.valueColor,
              lineHeight: 1.05,
              marginBottom: 10,
            }}>
              {c.prefix}{c.value}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: c.subColor }}>
            {c.subIcon && <span style={{ color: c.key === "groups" ? "var(--success)" : "inherit" }}>{c.subIcon}</span>}
            {loading ? <span className="skel" style={{ width: 120, height: 10 }} /> : c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  RemindPopover
// ─────────────────────────────────────────────
function RemindPopover({ groupId, onClose }) {
  const [debtorList, setDebtorList] = useState(null);
  const [sent,       setSent]       = useState({});
  const [sending,    setSending]    = useState({});
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    api.get(`/settlements/${groupId}/simplified`)
      .then(({ data }) => setDebtorList(data ?? []))
      .catch(() => setDebtorList([]));
  }, [groupId]);

  async function sendRemind(debtorName, amount) {
    setSending(p => ({ ...p, [debtorName]: true }));
    try {
      await api.post(`/groups/${groupId}/remind`, { debtor_name: debtorName, amount: Math.abs(amount) });
      setSent(p => ({ ...p, [debtorName]: true }));
    } catch (err) {
      console.error("Remind failed:", err?.response?.data);
    } finally {
      setSending(p => ({ ...p, [debtorName]: false }));
    }
  }

  return (
    <div className="g-remind-popover" ref={ref}>
      <div className="g-remind-head">
        <span>Send Reminder</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
          {UI.x(11)}
        </button>
      </div>
      {debtorList === null ? (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2].map(i => <span key={i} className="skel" style={{ height: 36, borderRadius: 6 }} />)}
        </div>
      ) : debtorList.length === 0 ? (
        <div style={{ padding: "18px 14px", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>No outstanding debtors.</div>
      ) : debtorList.map(row => (
        <div key={row.from} className="g-remind-row">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.from}</div>
            <div style={{ fontSize: 11, color: "var(--danger)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>owes ₹{Number(row.amount).toLocaleString("en-IN")}</div>
          </div>
          <button
            className={`g-remind-btn-sm${sent[row.from] ? " sent" : ""}`}
            disabled={!!sending[row.from] || !!sent[row.from]}
            onClick={() => sendRemind(row.from, row.amount)}
          >
            {sent[row.from] ? "✓ Sent" : sending[row.from] ? "…" : "Remind"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Member Avatars (stacked)
// ─────────────────────────────────────────────
function MemberAvatars({ members, max = 3 }) {
  const visible = members.slice(0, max);
  const extra   = members.length - max;
  return (
    <div className="gc-avatars">
      {visible.map((m, i) => (
        <div
          key={i}
          className="gc-avatar"
          title={m.name}
          style={{ background: avatarColor(m.name || String(i)), zIndex: max - i }}
        >
          {(m.name || "?")[0].toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="gc-avatar gc-avatar-more" style={{ zIndex: 0 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  GroupCard — matches reference design
// ─────────────────────────────────────────────
function GroupCard({ group, enriched, idx, memberDetails }) {
  const navigate     = useNavigate();
  const [showRemind, setShowRemind] = useState(false);

  const isLoading    = !enriched;
  const myNet        = enriched?.myNet            ?? null;
  const spent        = enriched?.totalExpenses    ?? 0;
  const pendingCount = enriched?.pendingSettlements ?? 0;

  const state =
    myNet === null ? "loading"
    : myNet > 0    ? "owed"
    : myNet < 0    ? "owe"
    : "settled";

  // Status badge config
  const STATUS = {
    owed:    { label: "Active",      cls: "owed"    },
    owe:     { label: "Payment Due", cls: "owe"     },
    settled: { label: "Settled",     cls: "settled" },
    loading: { label: "Loading…",    cls: "loading" },
  };
  const { label: statusLabel, cls: statusCls } = STATUS[state];

  // Balance display
  const balanceDisplay =
    myNet === null ? null
    : myNet === 0  ? null
    : `${myNet > 0 ? "+" : "-"}₹${Math.abs(myNet).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Sub-line below balance
  const balanceSub =
    myNet === null   ? ""
    : myNet > 0      ? `Across ${pendingCount || 1} group${pendingCount !== 1 ? "s" : ""}`
    : myNet < 0      ? `Next settlement pending`
    : "All clear! No pending items.";

  // Icon avatar
  const { IconComponent, bg: iconBg, color: iconColor } = getGroupIcon(group.group_name);

  return (
    <div
      className={`gc ${state !== "loading" ? state : ""}`}
      style={{ animationDelay: `${idx * 0.04}s` }}
      onClick={() => navigate(`/groups/${group.group_id}`)}
    >
      {/* ── TOP ROW: status badge + member avatars ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className={`gc-status ${statusCls}`}>
          <span className="gc-status-dot" />
          {statusLabel}
        </div>

        {/* Member avatars or skeleton */}
        {isLoading ? (
          <span className="skel" style={{ width: 64, height: 20, borderRadius: 10 }} />
        ) : (
          <MemberAvatars members={memberDetails || []} max={3} />
        )}
      </div>

      {/* ── GROUP NAME + ICON ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${iconColor}30`,
        }}>
          <IconComponent size={19} />
        </div>
        <div style={{
          fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em",
          color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {group.group_name}
        </div>
      </div>

      {/* ── BALANCE SECTION ── */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
          Your Balance
        </div>

        {isLoading ? (
          <span className="skel" style={{ width: "55%", height: 34, borderRadius: 6 }} />
        ) : myNet === 0 ? (
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text3)", letterSpacing: "-0.01em" }}>
            Settled
          </div>
        ) : (
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums",
            color: myNet > 0 ? "var(--success)" : "var(--danger)",
          }}>
            {balanceDisplay}
          </div>
        )}
      </div>

      {/* ── SUB-LINE ── */}
      <div style={{ fontSize: 13, color: "var(--text3)", minHeight: 18, marginBottom: 4 }}>
        {isLoading
          ? <span className="skel" style={{ width: "70%", height: 11 }} />
          : balanceSub}
      </div>

      {/* ── ACTION FOOTER ── */}
      <div
        className="gc-footer"
        style={{ position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        {/* View button — always present */}
        <a
          href={`/groups/${group.group_id}`}
          className="gc-btn ghost"
          onClick={e => { e.preventDefault(); navigate(`/groups/${group.group_id}`); }}
        >
          {UI.eye(12)} View
        </a>

        {/* Dynamic primary */}
        {isLoading ? (
          <span className="skel" style={{ flex: 1, height: 34, borderRadius: 8 }} />
        ) : myNet < 0 ? (
          <a
            href={`/groups/${group.group_id}/add-payment`}
            className="gc-btn settle"
            onClick={e => { e.preventDefault(); navigate(`/groups/${group.group_id}/add-payment`); }}
          >
            {UI.check(12)} Settle Up
          </a>
        ) : myNet > 0 ? (
          <>
            <button className="gc-btn remind-btn" onClick={() => setShowRemind(v => !v)}>
              {UI.bell(12)} Remind
            </button>
            {showRemind && (
              <RemindPopover groupId={group.group_id} onClose={() => setShowRemind(false)} />
            )}
          </>
        ) : (
          <button className="gc-btn settled-badge" disabled>
            {UI.check(12)} Settled
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  "Start a New Group" dashed card
// ─────────────────────────────────────────────
function NewGroupCard({ onClick }) {
  return (
    <div className="gc-new" onClick={onClick}>
      <div className="gc-new-plus">
        {UI.plus(20)}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text2)", marginBottom: 4 }}>
          Start a New Group
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Organize trips, bills, or events
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Groups page
// ─────────────────────────────────────────────
export default function Groups() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [groups,         setGroups]         = useState([]);
  const [enrichedMap,    setEnrichedMap]    = useState({});
  const [memberMap,      setMemberMap]      = useState({});   // { group_id: [{name}] }
  const [loading,        setLoading]        = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary,        setSummary]        = useState({ youOwe: 0, owedToYou: 0 });

  const [modal,    setModal]    = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [name,     setName]     = useState("");
  const [picked,   setPicked]   = useState([]);
  const [err,      setErr]      = useState("");
  const [saving,   setSaving]   = useState(false);

  const [search,    setSearch]    = useState("");
  const [filterTab, setFilterTab] = useState("all");  // all | owed | owe
  const [sortBy,    setSortBy]    = useState("name");

  // ── Load groups ──
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/groups/");
      setGroups(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Enrich groups progressively ──
  const enrichGroups = useCallback(async (groupList) => {
    setSummaryLoading(true);
    const totals = { youOwe: 0, owedToYou: 0 };

    await Promise.all(groupList.map(async g => {
      try {
        const [mR, eR, sR] = await Promise.all([
          api.get(`/groups/${g.group_id}/members`),
          api.get(`/expenses/${g.group_id}`),
          api.get(`/settlements/${g.group_id}`),
        ]);

        const myRow          = sR.data.find(s => s.user_name === user?.name);
        const myNet          = myRow ? Number(myRow.net_balance) : 0;
        const totalExpenses  = eR.data.reduce((s, e) => s + Number(e.total_amount), 0);
        const pendingSettlements = sR.data.filter(s => Number(s.net_balance) !== 0).length;

        if (myNet < 0) totals.youOwe    += Math.abs(myNet);
        if (myNet > 0) totals.owedToYou += myNet;

        setEnrichedMap(prev => ({
          ...prev,
          [g.group_id]: { totalExpenses, myNet, pendingSettlements, memberCount: mR.data.length },
        }));
        // Store member list for avatars
        setMemberMap(prev => ({
          ...prev,
          [g.group_id]: mR.data,
        }));
      } catch {
        setEnrichedMap(prev => ({ ...prev, [g.group_id]: { totalExpenses: 0, myNet: 0, pendingSettlements: 0, memberCount: 0 } }));
        setMemberMap(prev => ({ ...prev, [g.group_id]: [] }));
      }
    }));

    setSummary({ ...totals });
    setSummaryLoading(false);
  }, [user]);

  useEffect(() => {
    loadGroups().then(data => {
      if (data?.length) enrichGroups(data);
      else setSummaryLoading(false);
    });
  }, [loadGroups, enrichGroups]);

  // ── Modal ──
  async function openModal() {
    setName(""); setPicked([]); setErr("");
    const { data } = await api.get("/users/");
    setAllUsers(data);
    setModal(true);
  }

  async function createGroup(e) {
    e.preventDefault(); setErr("");
    const ids = [...new Set([user.user_id, ...picked])];
    if (ids.length < 2) { setErr("Select at least one other member."); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/groups/", { group_name: name.trim(), user_ids: ids });
      setModal(false);
      const refreshed = await loadGroups();
      if (refreshed?.length) enrichGroups(refreshed);
      navigate(`/groups/${data.group_id}`);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  const others = allUsers.filter(u => u.user_id !== user.user_id);
  const toggle = uid => setPicked(p => p.includes(uid) ? p.filter(i => i !== uid) : [...p, uid]);

  // ── Filter + sort ──
  const filtered = groups
    .filter(g => {
      const name = g.group_name.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
      const e = enrichedMap[g.group_id];
      if (!e) return true;
      if (filterTab === "owed") return e.myNet > 0;
      if (filterTab === "owe")  return e.myNet < 0;
      return true;
    })
    .sort((a, b) => {
      const ea = enrichedMap[a.group_id], eb = enrichedMap[b.group_id];
      if (sortBy === "name")    return a.group_name.localeCompare(b.group_name);
      if (sortBy === "balance") return Math.abs(eb?.myNet ?? 0) - Math.abs(ea?.myNet ?? 0);
      if (sortBy === "spent")   return (eb?.totalExpenses ?? 0) - (ea?.totalExpenses ?? 0);
      return 0;
    });

  // Page header section
  const pageHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        className="btn btn-primary btn-sm"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
        onClick={openModal}
      >
        {UI.users(13)} Create New Group
      </button>
    </div>
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <AppShell title="Groups" actions={pageHeader}>

        {/* ── Page title section — matches reference ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>
            Your Groups
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>
            Manage shared expenses across {groups.length} active space{groups.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Summary bar ── */}
        <SummaryBar
          totalGroups={groups.length}
          youOwe={summary.youOwe}
          owedToYou={summary.owedToYou}
          loading={summaryLoading}
        />

{/* ── Toolbar: search + filter tabs + sort ── */}
{(groups.length > 0 || search) && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
      flexWrap: "wrap",
    }}
  >
    {/* Search (LEFT) */}
    <div className="gf-search-wrap" style={{ marginRight: "auto" }}>
      <span className="gf-search-icon">{UI.search(14)}</span>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search groups..."
      />
    </div>

    {/* RIGHT SIDE */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      
      {/* Tabs */}
      <div className="gf-tabs">
        {[
          { id: "all", label: "All" },
          { id: "owed", label: "Owed" },
          { id: "owe", label: "Debt" },
        ].map(t => (
          <button
            key={t.id}
            className={`gf-tab ${filterTab === t.id ? "active" : ""}`}
            onClick={() => setFilterTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="gf-sort">
        {UI.sort(13)}
        <span style={{ color: "var(--text3)", fontSize: 13 }}>
          Sort by:
        </span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Name</option>
          <option value="balance">Balance</option>
          <option value="spent">Total Spent</option>
        </select>
        {UI.chevDown(12)}
      </div>

    </div>
  </div>
)}

        {/* ── Card grid ── */}
        {loading ? (
          <div className="gc-grid">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="gc" style={{ cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                  <span className="skel" style={{ width: 80, height: 20, borderRadius: 20 }} />
                  <span className="skel" style={{ width: 64, height: 20, borderRadius: 10 }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <span className="skel" style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0 }} />
                  <span className="skel" style={{ flex: 1, height: 22, borderRadius: 6, alignSelf: "center" }} />
                </div>
                <span className="skel" style={{ width: 60, height: 12, marginBottom: 10 }} />
                <span className="skel" style={{ width: "50%", height: 30, marginBottom: 8 }} />
                <span className="skel" style={{ width: "65%", height: 11, marginBottom: 20 }} />
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <span className="skel" style={{ flex: 1, height: 34, borderRadius: 8 }} />
                  <span className="skel" style={{ flex: 1, height: 34, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="gc-grid">
            <NewGroupCard onClick={openModal} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px" }}>
            <div style={{ marginBottom: 12, opacity: 0.2, display: "flex", justifyContent: "center" }}>{UI.search(36)}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              No groups match {search ? `"${search}"` : `this filter`}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => { setSearch(""); setFilterTab("all"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="gc-grid">
            {filtered.map((g, i) => (
              <GroupCard
                key={g.group_id}
                group={g}
                enriched={enrichedMap[g.group_id] ?? null}
                memberDetails={memberMap[g.group_id] ?? []}
                idx={i}
              />
            ))}
            {/* Dashed "new group" card always last in grid */}
            <NewGroupCard onClick={openModal} />
          </div>
        )}

      </AppShell>

      {/* ── CREATE GROUP MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal-box fade-up">
            <div className="modal-head">
              <span className="modal-title">Create New Group</span>
              <button className="btn btn-ghost btn-xs btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={createGroup}>
                <div className="form-group">
                  <label className="form-label">Group name</label>
                  <input
                    required autoFocus
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Goa Trip 2025, H-Block Hostel…"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Add members</label>
                  <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>
                    You're included automatically. Pick others:
                  </div>
                  {others.length === 0 ? (
                    <div style={{ fontSize: 14, color: "var(--text3)", padding: "12px 0" }}>
                      No other users yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {others.map(u => (
                        <div key={u.user_id} className={`chip ${picked.includes(u.user_id) ? "on" : ""}`} onClick={() => toggle(u.user_id)}>
                          {picked.includes(u.user_id) ? "✓ " : ""}{u.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Creating…" : "Create Group"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}