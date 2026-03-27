// --- frontend/src/pages/Groups.jsx ---
// v3: 2-button system · SVG icon avatars · timestamp removed · clean summary bar

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import { getGroupIcon } from "../utils/GroupIcons";

// ─────────────────────────────────────────────
//  Global styles
// ─────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Summary cards — neutral bg, colored text only ── */
  .g-summary-card {
    border-radius: 12px;
    border: 1px solid var(--border);
    padding: 20px 22px 18px;
    background: var(--surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    animation: fadeSlideUp 0.25s ease both;
  }
  .g-summary-card:hover {
    border-color: var(--border2);
    box-shadow: 0 6px 28px rgba(0,0,0,0.28);
  }

  /* ── Group cards — equal height via grid ── */
  .g-group-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    /* Equal height: flex column, push buttons to bottom */
    display: flex;
    flex-direction: column;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
    animation: fadeSlideUp 0.22s ease both;
  }
  .g-group-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 36px rgba(0,0,0,0.36);
  }
  .g-group-card.owed:hover   { border-color: rgba(16,185,129,0.40); }
  .g-group-card.owe:hover    { border-color: rgba(239,68,68,0.40);  }
  .g-group-card.settled:hover { border-color: var(--border2); }

  /* Spacer pushes action row to bottom */
  .g-card-body   { flex: 1; }

  /* ── 2-button action row — always consistent ── */
  .g-action-row {
    padding: 0 14px 14px;
    display: flex;
    gap: 8px;
  }
  .g-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 36px;           /* Fixed height — consistent across ALL cards */
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    text-decoration: none;
    transition: all 0.12s;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
  .g-btn:active { transform: scale(0.96); }

  /* Ghost (View) */
  .g-btn.ghost {
    background: var(--surface2);
    color: var(--text2);
    border: 1px solid var(--border);
  }
  .g-btn.ghost:hover {
    background: var(--surface3);
    color: var(--text);
    border-color: var(--border2);
  }



  /* Success (Settle) */
  .g-btn.settle {
    background: #10b981;
    color: #fff;
    border: 1px solid #0d9e6e;
  }
  .g-btn.settle:hover {
    background: #0d9e6e;
    border-color: #0a8a60;
  }

  /* Warning (Remind) */
  .g-btn.remind {
    background: rgba(245,158,11,0.12);
    color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.32);
  }
  .g-btn.remind:hover {
    background: rgba(245,158,11,0.20);
    border-color: rgba(245,158,11,0.55);
  }

  /* Neutral disabled (Settled badge) */
  .g-btn.settled-badge {
    background: var(--surface2);
    color: var(--text2);
    border: 1px solid var(--border);
  }
  .g-btn.settled-badge:hover { transform: none; }

  /* ── Remind popover ── */
  .g-remind-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 250px;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.55);
    z-index: 200;
    overflow: hidden;
    animation: fadeIn 0.15s ease both;
  }
  .g-remind-head {
    padding: 10px 13px;
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
    padding: 9px 13px;
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
    white-space: nowrap;
    flex-shrink: 0;
  }
  .g-remind-btn-sm:hover { background: rgba(245,158,11,0.22); border-color: rgba(245,158,11,0.55); }
  .g-remind-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
  .g-remind-btn-sm.sent {
    background: rgba(16,185,129,0.10);
    color: #10b981;
    border-color: rgba(16,185,129,0.30);
  }

  /* Skeleton shimmer */
  .skel {
    animation: pulse 1.4s ease-in-out infinite;
    background: var(--surface3);
    border-radius: 5px;
  }
`;

// ─────────────────────────────────────────────
//  Small inline SVG icons for UI chrome
// ─────────────────────────────────────────────
const UI = {
  up:      (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  down:    (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  check:   (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  users:   (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  receipt: (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  pending: (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  search:  (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:    (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  groups:  (sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:    (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  eye:     (sz=13) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  x:       (sz=11) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  wallet:  (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
};

// ─────────────────────────────────────────────
//  SummaryBar — no gradient backgrounds
// ─────────────────────────────────────────────
function SummaryBar({ totalGroups, youOwe, owedToYou, loading }) {
  const net = owedToYou - youOwe;

  const cards = [
    {
      key: "groups", label: "Total Groups", sub: "you're a member of",
      value: String(totalGroups), prefix: "",
      iconEl: UI.groups(16),
      iconBg: "rgba(37,99,235,0.18)", iconColor: "#93c5fd",
      valueColor: "var(--text)", valueSz: 36,
    },
    {
      key: "net", label: "Net Balance",
      sub: net > 0 ? "overall surplus" : net < 0 ? "overall deficit" : "all settled up",
      value: net === 0 ? "0" : Math.abs(net).toLocaleString("en-IN"),
      prefix: net > 0 ? "+₹" : net < 0 ? "-₹" : "₹",
      iconEl: net >= 0 ? UI.down(16) : UI.up(16),
      iconBg: net > 0 ? "rgba(16,185,129,0.18)" : net < 0 ? "rgba(239,68,68,0.18)" : "rgba(100,116,139,0.18)",
      iconColor: net > 0 ? "#34d399" : net < 0 ? "#f87171" : "#94a3b8",
      valueColor: net > 0 ? "var(--success)" : net < 0 ? "var(--danger)" : "var(--text2)",
      valueSz: 28,
    },
    {
      key: "owe", label: "You Owe", sub: "across all groups",
      value: youOwe.toLocaleString("en-IN"), prefix: "₹",
      iconEl: UI.up(16),
      iconBg: youOwe > 0 ? "rgba(239,68,68,0.18)" : "rgba(100,116,139,0.18)",
      iconColor: youOwe > 0 ? "#f87171" : "#94a3b8",
      valueColor: youOwe > 0 ? "var(--danger)" : "var(--text2)",
      valueSz: 28,
    },
    {
      key: "owed", label: "You Are Owed", sub: "across all groups",
      value: owedToYou.toLocaleString("en-IN"), prefix: "₹",
      iconEl: UI.down(16),
      iconBg: owedToYou > 0 ? "rgba(16,185,129,0.18)" : "rgba(100,116,139,0.18)",
      iconColor: owedToYou > 0 ? "#34d399" : "#94a3b8",
      valueColor: owedToYou > 0 ? "var(--success)" : "var(--text2)",
      valueSz: 28,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
      {cards.map((c, i) => (
        <div key={c.key} className="g-summary-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text3)" }}>
              {c.label}
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: c.iconBg, color: c.iconColor,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {c.iconEl}
            </div>
          </div>
          <div>
            {loading ? (
              <div className="skel" style={{ width: 90, height: c.key === "groups" ? 34 : 26, marginBottom: 8 }} />
            ) : (
              <div style={{
                fontSize: c.valueSz, fontWeight: 800, letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums", color: c.valueColor,
                lineHeight: 1.05, marginBottom: 6,
              }}>
                {c.prefix}{c.value}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.4 }}>{c.sub}</div>
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
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    api.get(`/settlements/${groupId}/simplified`)
      .then(({ data }) => setDebtorList(data ?? []))
      .catch(() => setDebtorList([]));
  }, [groupId]);

  async function sendRemind(debtorName, amount) {
    setSending(p => ({ ...p, [debtorName]: true }));
    try {
      await api.post(`/groups/${groupId}/remind`, {
        debtor_name: debtorName,
        amount: Math.abs(amount),
      });
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
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}>
          {UI.x(11)}
        </button>
      </div>

      {debtorList === null ? (
        <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2].map(i => <div key={i} className="skel" style={{ height: 34, borderRadius: 6 }} />)}
        </div>
      ) : debtorList.length === 0 ? (
        <div style={{ padding: "18px 13px", fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
          No outstanding debtors found.
        </div>
      ) : (
        debtorList.map(row => (
          <div key={row.from} className="g-remind-row">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.from}
              </div>
              <div style={{ fontSize: 11, color: "var(--danger)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
                owes ₹{Number(row.amount).toLocaleString("en-IN")}
              </div>
            </div>
            <button
              className={`g-remind-btn-sm${sent[row.from] ? " sent" : ""}`}
              disabled={!!sending[row.from] || !!sent[row.from]}
              onClick={() => sendRemind(row.from, row.amount)}
            >
              {sent[row.from] ? "✓ Sent" : sending[row.from] ? "…" : "Remind"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  GroupCard
// ─────────────────────────────────────────────
function GroupCard({ group, enriched, idx }) {
  const navigate = useNavigate();
  const [showRemind, setShowRemind] = useState(false);

  const isLoading    = !enriched;
  const myNet        = enriched?.myNet            ?? null;
  const members      = enriched?.memberCount      ?? 0;
  const spent        = enriched?.totalExpenses    ?? 0;
  const pendingCount = enriched?.pendingSettlements ?? 0;

  // Balance state
  const state = myNet === null ? "loading" : myNet > 0 ? "owed" : myNet < 0 ? "owe" : "settled";

  // SVG icon avatar from group name
  const { IconComponent, bg: iconBg, color: iconColor } = getGroupIcon(group.group_name);

  // Balance pill
  const pillStyle =
    myNet > 0   ? { background: "rgba(16,185,129,0.08)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.22)" }
    : myNet < 0 ? { background: "rgba(239,68,68,0.08)",  color: "var(--danger)",  border: "1px solid rgba(239,68,68,0.20)"  }
    : myNet === 0 ? { background: "rgba(100,116,139,0.18)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.15)" }
    : { background: "var(--surface3)", color: "var(--text3)", border: "1px solid var(--border)" };

  const balanceLabel =
    myNet > 0  ? "Owed to you"
    : myNet < 0 ? "You owe"
    : "All settled up";

  const balanceValue =
    myNet !== null && myNet !== 0
      ? `${myNet > 0 ? "+" : "-"}₹${Math.abs(myNet).toLocaleString("en-IN")}`
      : null;

  const pendingTileStyle = pendingCount > 0
    ? { background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }
    : { background: "var(--surface2)", border: "1px solid var(--border)" };

  return (
    <div
      className={`g-group-card ${state !== "loading" ? state : ""}`}
      style={{ animationDelay: `${idx * 0.02}s` }}
      onClick={() => navigate(`/groups/${group.group_id}`)}
    >
      {/* ── HEADER: icon + name + member count ── */}
      {/* NOTE: timestamp removed — backend only stores DATE not DATETIME,
          making relative "X ago" values incorrect. Will reintroduce
          if backend adds a proper updated_at / last_activity_at column. */}
      <div style={{ padding: "18px 18px 14px" }} className="g-card-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>

          {/* SVG icon avatar — keyword-matched per group name */}
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: iconBg, color: iconColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${iconColor}35`,
            boxShadow: `0 0 0 3px ${iconColor}14`,
          }}>
            <IconComponent size={20} />
          </div>

          {/* Name + member count */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, letterSpacing: "-0.015em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: "var(--text)", marginBottom: 5,
            }}>
              {group.group_name}
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text3)" }}>
              {UI.users(12)}
              {isLoading
                ? <span className="skel" style={{ width: 50, height: 10, display: "inline-block" }} />
                : `${members} member${members !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* ── BALANCE PILL ── */}
        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...pillStyle,
        }}>
          {isLoading ? (
            <>
              <span className="skel" style={{ width: 100, height: 12, display: "block" }} />
              <span className="skel" style={{ width: 52, height: 12, display: "block" }} />
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                {myNet > 0 && UI.down(12)}
                {myNet < 0 && UI.up(12)}
                {myNet === 0 && UI.check(12)}
                {balanceLabel}
              </span>
              {balanceValue && (
                <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {balanceValue}
                </span>
              )}
            </>
          )}
        </div>

        {/* ── STAT TILES ── */}
        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          {/* Total Spent */}
          <div style={{
            flex: 1, background: "var(--surface2)", borderRadius: 9,
            border: "1px solid var(--border)", padding: "10px 13px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: "var(--text3)", display: "flex", flexShrink: 0 }}>{UI.receipt(13)}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 2 }}>
                Total spent
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                {isLoading
                  ? <span className="skel" style={{ width: 48, height: 12, display: "block" }} />
                  : `₹${spent.toLocaleString("en-IN")}`}
              </div>
            </div>
          </div>

          {/* Pending Settlements */}
          <div style={{
            flex: 1, borderRadius: 9, padding: "10px 13px",
            display: "flex", alignItems: "center", gap: 8,
            ...(isLoading
              ? { background: "var(--surface2)", border: "1px solid var(--border)" }
              : pendingTileStyle),
          }}>
            <span style={{ color: isLoading ? "var(--text3)" : (pendingCount > 0 ? "#f59e0b" : "var(--text3)"), display: "flex", flexShrink: 0 }}>
              {UI.pending(13)}
            </span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 2 }}>
                Pending
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: isLoading ? "var(--text)" : (pendingCount > 0 ? "#f59e0b" : "var(--text)") }}>
                {isLoading
                  ? <span className="skel" style={{ width: 28, height: 12, display: "block" }} />
                  : pendingCount === 0 ? "None" : `${pendingCount} pending`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION ROW — always 2 buttons, equal width, fixed height ── */}
      {/*
        LEFT:  "View"   — always ghost, navigates to group detail
        RIGHT: dynamic primary action based on myNet:
          myNet < 0  → "Settle"         (green)
          myNet > 0  → "Remind"         (amber, opens popover)
          myNet === 0 → "Settled ✓"     (disabled badge, green tint)
      */}
      <div
        className="g-action-row"
        style={{ position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        {/* LEFT: View */}
        <Link to={`/groups/${group.group_id}`} className="g-btn ghost">
          {UI.eye(12)} View
        </Link>

        {/* RIGHT: Dynamic primary */}
        {isLoading ? (
          <span className="skel" style={{ flex: 1, height: 36, borderRadius: 8 }} />
        ) : myNet < 0 ? (
          <Link to={`/groups/${group.group_id}/add-payment`} className="g-btn settle">
             Settle
          </Link>
        ) : myNet > 0 ? (
          <>
            <button
              className="g-btn remind"
              onClick={() => setShowRemind(v => !v)}
              aria-expanded={showRemind}
            >
              {UI.bell(12)} Remind
            </button>
            {showRemind && (
              <RemindPopover groupId={group.group_id} onClose={() => setShowRemind(false)} />
            )}
          </>
        ) : (
          /* Settled — non-interactive badge. User can still click the card
             or the View button to navigate. Adding an active CTA here would
             be misleading for a group with no outstanding balances. */
          <button className="g-btn settled-badge" disabled>
            {UI.check(12)} Settled
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  EmptyState
// ─────────────────────────────────────────────
function EmptyState({ onNewGroup }) {
  return (
    <div style={{ textAlign: "center", padding: "72px 24px", maxWidth: 420, margin: "0 auto" }}>
      <div style={{
        width: 68, height: 68, borderRadius: 18, margin: "0 auto 20px",
        background: "rgba(37,99,235,0.1)", color: "var(--primary-h)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(37,99,235,0.2)",
      }}>
        {UI.groups(26)}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>No groups yet</div>
      <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28, lineHeight: 1.65 }}>
        Create a group to start splitting expenses with friends, roommates, or travel buddies.
      </div>
      <button className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onNewGroup}>
        {UI.plus(14)} Create your first group
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Groups page
// ─────────────────────────────────────────────
export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups,         setGroups]         = useState([]);
  const [enrichedMap,    setEnrichedMap]    = useState({});
  const [loading,        setLoading]        = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary,        setSummary]        = useState({ youOwe: 0, owedToYou: 0 });

  const [modal,    setModal]    = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [name,     setName]     = useState("");
  const [picked,   setPicked]   = useState([]);
  const [err,      setErr]      = useState("");
  const [saving,   setSaving]   = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

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

  const enrichGroups = useCallback(async (groupList) => {
    setSummaryLoading(true);
    const totals = { youOwe: 0, owedToYou: 0 };

    await Promise.all(groupList.map(async g => {
      try {
        const [mR, eR, sR, pR] = await Promise.all([
          api.get(`/groups/${g.group_id}/members`),
          api.get(`/expenses/${g.group_id}`),
          api.get(`/settlements/${g.group_id}`),
          api.get(`/payments/${g.group_id}`),
        ]);

        const myRow = sR.data.find(s => s.user_name === user?.name);
        const myNet = myRow ? Number(myRow.net_balance) : 0;
        const totalExpenses = eR.data.reduce((s, e) => s + Number(e.total_amount), 0);
        const pendingSettlements = sR.data.filter(s => Number(s.net_balance) !== 0).length;

        if (myNet < 0) totals.youOwe    += Math.abs(myNet);
        if (myNet > 0) totals.owedToYou += myNet;

        setEnrichedMap(prev => ({
          ...prev,
          [g.group_id]: { memberCount: mR.data.length, totalExpenses, myNet, pendingSettlements },
        }));
      } catch {
        setEnrichedMap(prev => ({
          ...prev,
          [g.group_id]: { memberCount: 0, totalExpenses: 0, myNet: 0, pendingSettlements: 0 },
        }));
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

  const filtered = groups
    .filter(g => g.group_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ea = enrichedMap[a.group_id], eb = enrichedMap[b.group_id];
      if (sortBy === "name")    return a.group_name.localeCompare(b.group_name);
      if (sortBy === "balance") return Math.abs(eb?.myNet ?? 0) - Math.abs(ea?.myNet ?? 0);
      if (sortBy === "spent")   return (eb?.totalExpenses ?? 0) - (ea?.totalExpenses ?? 0);
      return 0;
    });

  const actions = (
    <button className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={openModal}>
      {UI.plus(13)} New Group
    </button>
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <AppShell title="Groups" actions={actions}>

        <SummaryBar
          totalGroups={groups.length}
          youOwe={summary.youOwe}
          owedToYou={summary.owedToYou}
          loading={summaryLoading}
        />

        {(groups.length > 0 || search) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", display: "flex", pointerEvents: "none" }}>
                {UI.search(14)}
              </span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search groups…"
                style={{ paddingLeft: 34, paddingTop: 8, paddingBottom: 8, fontSize: 14 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>Sort by</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ paddingTop: 7, paddingBottom: 7, fontSize: 13, paddingLeft: 12, paddingRight: 32 }}>
                <option value="name">Name</option>
                <option value="balance">Balance</option>
                <option value="spent">Total Spent</option>
              </select>
            </div>

            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}>
              {search
                ? `${filtered.length} of ${groups.length} group${groups.length !== 1 ? "s" : ""}`
                : `${groups.length} group${groups.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        )}

        {/* Card grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="g-group-card" style={{ padding: "18px 18px 14px", cursor: "default" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <span className="skel" style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: "block" }} />
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <span className="skel" style={{ width: "60%", height: 14, display: "block", marginBottom: 8 }} />
                    <span className="skel" style={{ width: "35%", height: 10, display: "block" }} />
                  </div>
                </div>
                <span className="skel" style={{ width: "100%", height: 38, display: "block", borderRadius: 9, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <span className="skel" style={{ flex: 1, height: 52, display: "block", borderRadius: 9 }} />
                  <span className="skel" style={{ flex: 1, height: 52, display: "block", borderRadius: 9 }} />
                </div>
                <div style={{ display: "flex", gap: 8, padding: "0 0 0" }}>
                  <span className="skel" style={{ flex: 1, height: 36, display: "block", borderRadius: 8 }} />
                  <span className="skel" style={{ flex: 1, height: 36, display: "block", borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onNewGroup={openModal} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px" }}>
            <div style={{ marginBottom: 12, opacity: 0.25, display: "flex", justifyContent: "center" }}>{UI.search(32)}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No groups match "{search}"</div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setSearch("")}>Clear search</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: 16 }}>
            {filtered.map((g, i) => (
              <GroupCard key={g.group_id} group={g} enriched={enrichedMap[g.group_id] ?? null} idx={i} />
            ))}
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
                  <input required autoFocus value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Goa Trip 2025, H-Block Hostel…" />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Add members</label>
                  <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>
                    You're included automatically. Pick others:
                  </div>
                  {others.length === 0 ? (
                    <div style={{ fontSize: 14, color: "var(--text3)", padding: "12px 0" }}>
                      No other users yet — ask friends to sign up first.
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