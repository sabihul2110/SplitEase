// --- frontend/src/pages/Groups.jsx ---

// --- frontend/src/pages/Groups.jsx ---
// REDESIGNED: Summary bar + enriched group cards + search/sort

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";

// ─────────────────────────────────────────────
//  Icons (inline SVG, stroke-based)
// ─────────────────────────────────────────────
const Icons = {
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  receipt: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  calendar: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  chevronDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  wallet: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  ),
  arrowUp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/>
      <polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  arrowDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  groups: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────
//  SummaryBar — 4 stat cards at top
// ─────────────────────────────────────────────
function SummaryBar({ totalGroups, youOwe, owedToYou, loading }) {
  const netBalance = owedToYou - youOwe;

  const cards = [
    {
      label: "Total Groups",
      value: loading ? "—" : totalGroups,
      sub: "you're a member of",
      color: "var(--primary-h)",
      prefix: "",
      isMoney: false,
    },
    {
      label: "Net Balance",
      value: loading ? "—" : Math.abs(netBalance).toLocaleString("en-IN"),
      sub: netBalance >= 0 ? "overall surplus" : "overall deficit",
      color: netBalance >= 0 ? "var(--success)" : "var(--danger)",
      prefix: netBalance >= 0 ? "+₹" : "-₹",
      isMoney: true,
    },
    {
      label: "You Owe",
      value: loading ? "—" : youOwe.toLocaleString("en-IN"),
      sub: "across all groups",
      color: youOwe > 0 ? "var(--danger)" : "var(--text2)",
      prefix: "₹",
      isMoney: true,
    },
    {
      label: "You Are Owed",
      value: loading ? "—" : owedToYou.toLocaleString("en-IN"),
      sub: "across all groups",
      color: owedToYou > 0 ? "var(--success)" : "var(--text2)",
      prefix: "₹",
      isMoney: true,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 28,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="card card-p"
          style={{ position: "relative", overflow: "hidden" }}
        >
          {/* Accent line at top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: c.color,
              opacity: 0.6,
              borderRadius: "12px 12px 0 0",
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text3)",
              marginBottom: 10,
            }}
          >
            {c.label}
          </div>
          <div
            style={{
              fontSize: c.isMoney ? 24 : 32,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              color: c.color,
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 80,
                  height: 28,
                  background: "var(--surface3)",
                  borderRadius: 6,
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
            ) : (
              <>
                {c.prefix}
                {c.value}
              </>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  GroupCard — enriched card with balance + actions
// ─────────────────────────────────────────────
function GroupCard({ group, enriched, onNavigate }) {
  const navigate = useNavigate();
  const isLoading = !enriched;
  const myNet = enriched?.myNet ?? null;
  const memberCount = enriched?.memberCount ?? 0;
  const totalExpenses = enriched?.totalExpenses ?? 0;
  const lastActivity = enriched?.lastActivity ?? null;

  const balanceColor =
    myNet === null ? "var(--text3)" : myNet > 0 ? "var(--success)" : myNet < 0 ? "var(--danger)" : "var(--text2)";

  const balanceLabel =
    myNet === null
      ? "Calculating…"
      : myNet > 0
      ? `+₹${Math.abs(myNet).toLocaleString("en-IN")} owed to you`
      : myNet < 0
      ? `₹${Math.abs(myNet).toLocaleString("en-IN")} you owe`
      : "Settled up ✓";

  const balanceBadgeStyle =
    myNet === null
      ? { background: "var(--surface3)", color: "var(--text3)" }
      : myNet > 0
      ? { background: "rgba(16,185,129,0.1)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.2)" }
      : myNet < 0
      ? { background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }
      : { background: "rgba(16,185,129,0.06)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.12)" };

  function formatLastActivity(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  // Generate a consistent color for the group avatar based on group_id
  const AVATAR_COLORS = [
    { bg: "rgba(37,99,235,0.15)", color: "var(--primary-h)" },
    { bg: "rgba(16,185,129,0.15)", color: "var(--success)" },
    { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
    { bg: "rgba(239,68,68,0.12)", color: "var(--danger)" },
    { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    { bg: "rgba(20,184,166,0.15)", color: "#2dd4bf" },
  ];
  const avatarStyle = AVATAR_COLORS[group.group_id % AVATAR_COLORS.length];

  const initials = group.group_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border2)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onClick={() => navigate(`/groups/${group.group_id}`)}
    >
      {/* ── TOP ZONE ── */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          {/* Group avatar */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: avatarStyle.bg,
              color: avatarStyle.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: "0.02em",
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                marginBottom: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {group.group_name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Member count */}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text3)" }}>
                <span style={{ display: "flex", opacity: 0.6 }}>{Icons.users}</span>
                {isLoading ? "—" : `${memberCount} members`}
              </span>
              {/* Last activity */}
              {(lastActivity || isLoading) && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text3)" }}>
                  <span style={{ display: "flex", opacity: 0.6 }}>{Icons.calendar}</span>
                  {isLoading ? "—" : formatLastActivity(lastActivity)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            ...balanceBadgeStyle,
          }}
        >
          {myNet !== null && myNet !== 0 && (
            <span style={{ display: "flex" }}>
              {myNet > 0 ? Icons.arrowDown : Icons.arrowUp}
            </span>
          )}
          {isLoading ? (
            <div
              style={{
                width: 80,
                height: 12,
                background: "var(--surface3)",
                borderRadius: 4,
              }}
            />
          ) : (
            balanceLabel
          )}
        </div>
      </div>

      {/* ── MIDDLE ZONE: stats ── */}
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 5 }}>
            Total Spent
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
            {isLoading ? (
              <div style={{ width: 60, height: 16, background: "var(--surface3)", borderRadius: 4, margin: "0 auto" }} />
            ) : (
              `₹${totalExpenses.toLocaleString("en-IN")}`
            )}
          </div>
        </div>
        <div style={{ width: 1, background: "var(--border)", flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 5 }}>
            Members
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {isLoading ? (
              <div style={{ width: 30, height: 16, background: "var(--surface3)", borderRadius: 4, margin: "0 auto" }} />
            ) : (
              memberCount
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ZONE: actions ── */}
      <div
        style={{ padding: "12px 14px", display: "flex", gap: 6 }}
        onClick={(e) => e.stopPropagation()} // prevent card click
      >
        <Link
          to={`/groups/${group.group_id}`}
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
        >
          View Details
        </Link>
        <Link
          to={`/groups/${group.group_id}/add-expense`}
          className="btn btn-primary btn-sm"
          style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
        >
          + Expense
        </Link>
        <Link
          to={`/groups/${group.group_id}/add-payment`}
          className="btn btn-success btn-sm"
          style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
        >
          Settle
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────
function EmptyState({ onNewGroup }) {
  return (
    <div
      className="card"
      style={{ padding: "64px 32px", textAlign: "center", maxWidth: 480, margin: "0 auto" }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "rgba(37,99,235,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--primary-h)",
          margin: "0 auto 20px",
        }}
      >
        {Icons.groups}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No groups yet</div>
      <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24, lineHeight: 1.6 }}>
        Create a group to start splitting expenses with friends, roommates, or travel buddies.
      </div>
      <button className="btn btn-primary" onClick={onNewGroup}>
        Create your first group
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

  // Core data
  const [groups, setGroups] = useState([]);
  const [enrichedMap, setEnrichedMap] = useState({}); // group_id → enriched data
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Create group modal
  const [modal, setModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Search + sort
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" | "balance" | "activity" | "spent"

  // Summary totals (computed from enrichedMap)
  const [summary, setSummary] = useState({ youOwe: 0, owedToYou: 0 });

  // ── Load groups list ──
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

  // ── Enrich each group in parallel ──
  const enrichGroups = useCallback(
    async (groupList) => {
      setSummaryLoading(true);
      const results = {};

      await Promise.all(
        groupList.map(async (g) => {
          try {
            const [membersRes, expensesRes, settlementsRes, paymentsRes] = await Promise.all([
              api.get(`/groups/${g.group_id}/members`),
              api.get(`/expenses/${g.group_id}`),
              api.get(`/settlements/${g.group_id}`),
              api.get(`/payments/${g.group_id}`),
            ]);

            const members = membersRes.data;
            const expenses = expensesRes.data;
            const settlements = settlementsRes.data;
            const payments = paymentsRes.data;

            // My net balance in this group
            const myRow = settlements.find((s) => s.user_name === user?.name);
            const myNet = myRow ? Number(myRow.net_balance) : 0;

            // Total spent
            const totalExpenses = expenses.reduce((s, e) => s + Number(e.total_amount), 0);

            // Last activity: most recent expense_date or payment_date
            const dates = [
              ...expenses.map((e) => e.expense_date),
              ...payments.map((p) => p.payment_date),
            ].filter(Boolean);
            const lastActivity = dates.length > 0 ? dates.sort().reverse()[0] : null;

            results[g.group_id] = {
              memberCount: members.length,
              totalExpenses,
              myNet,
              lastActivity,
            };

            // Update map progressively so cards appear as data arrives
            setEnrichedMap((prev) => ({ ...prev, [g.group_id]: results[g.group_id] }));
          } catch {
            // Graceful fallback if one group fails
            results[g.group_id] = { memberCount: 0, totalExpenses: 0, myNet: 0, lastActivity: null };
            setEnrichedMap((prev) => ({ ...prev, [g.group_id]: results[g.group_id] }));
          }
        })
      );

      // Compute summary totals
      let youOwe = 0;
      let owedToYou = 0;
      Object.values(results).forEach((r) => {
        if (r.myNet < 0) youOwe += Math.abs(r.myNet);
        else if (r.myNet > 0) owedToYou += r.myNet;
      });
      setSummary({ youOwe, owedToYou });
      setSummaryLoading(false);
    },
    [user]
  );

  useEffect(() => {
    loadGroups().then((data) => {
      if (data?.length) enrichGroups(data);
      else setSummaryLoading(false);
    });
  }, [loadGroups, enrichGroups]);

  // ── Open create modal ──
  async function openModal() {
    setName(""); setPicked([]); setErr("");
    const { data } = await api.get("/users/");
    setAllUsers(data);
    setModal(true);
  }

  // ── Create group ──
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
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  const others = allUsers.filter((u) => u.user_id !== user.user_id);
  const toggle = (uid) => setPicked((p) => p.includes(uid) ? p.filter((i) => i !== uid) : [...p, uid]);

  // ── Filter + sort ──
  const filteredGroups = groups
    .filter((g) => g.group_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ea = enrichedMap[a.group_id];
      const eb = enrichedMap[b.group_id];
      if (sortBy === "name") return a.group_name.localeCompare(b.group_name);
      if (sortBy === "balance") {
        const na = ea?.myNet ?? 0;
        const nb = eb?.myNet ?? 0;
        return Math.abs(nb) - Math.abs(na);
      }
      if (sortBy === "spent") {
        return (eb?.totalExpenses ?? 0) - (ea?.totalExpenses ?? 0);
      }
      if (sortBy === "activity") {
        const da = ea?.lastActivity ?? "";
        const db = eb?.lastActivity ?? "";
        return db.localeCompare(da);
      }
      return 0;
    });

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={openModal}>
      + New Group
    </button>
  );

  return (
    <>
      {/* Pulse animation for loading skeletons */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <AppShell title="Groups" actions={actions}>
        {/* ── SUMMARY BAR ── */}
        <SummaryBar
          totalGroups={groups.length}
          youOwe={summary.youOwe}
          owedToYou={summary.owedToYou}
          loading={summaryLoading}
        />

        {/* ── TOOLBAR ── */}
        {groups.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: "1", minWidth: 180, maxWidth: 320 }}>
              <span
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  display: "flex",
                  pointerEvents: "none",
                }}
              >
                {Icons.search}
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups…"
                style={{
                  paddingLeft: 34,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* Sort */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>Sort by</span>
              <div style={{ position: "relative" }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ paddingTop: 7, paddingBottom: 7, fontSize: 13, paddingLeft: 12, paddingRight: 32 }}
                >
                  <option value="name">Name</option>
                  <option value="balance">Balance</option>
                  <option value="spent">Total Spent</option>
                  <option value="activity">Last Activity</option>
                </select>
              </div>
            </div>

            {/* Result count */}
            {search && (
              <span style={{ fontSize: 13, color: "var(--text3)" }}>
                {filteredGroups.length} result{filteredGroups.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── GROUPS GRID ── */}
        {loading ? (
          /* Skeleton loading grid */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ padding: "18px 18px 14px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "var(--surface3)",
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: "70%", height: 14, background: "var(--surface3)", borderRadius: 4, marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />
                    <div style={{ width: "40%", height: 11, background: "var(--surface3)", borderRadius: 4, animation: "pulse 1.4s ease-in-out infinite" }} />
                  </div>
                </div>
                <div style={{ width: "55%", height: 24, background: "var(--surface3)", borderRadius: 20, animation: "pulse 1.4s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onNewGroup={openModal} />
        ) : filteredGroups.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ display: "flex" }}>{Icons.search}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No groups found</div>
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                No groups match "{search}"
              </div>
              <button
                className="btn btn-ghost btn-sm mt-4"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: 16,
            }}
          >
            {filteredGroups.map((g) => (
              <GroupCard
                key={g.group_id}
                group={g}
                enriched={enrichedMap[g.group_id] ?? null}
                onNavigate={() => navigate(`/groups/${g.group_id}`)}
              />
            ))}
          </div>
        )}
      </AppShell>

      {/* ── CREATE GROUP MODAL ── */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}
        >
          <div className="modal-box fade-up">
            <div className="modal-head">
              <span className="modal-title">Create New Group</span>
              <button
                className="btn btn-ghost btn-xs btn-icon"
                onClick={() => setModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={createGroup}>
                <div className="form-group">
                  <label className="form-label">Group name</label>
                  <input
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                      No other users yet — ask friends to sign up first.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {others.map((u) => (
                        <div
                          key={u.user_id}
                          className={`chip ${picked.includes(u.user_id) ? "on" : ""}`}
                          onClick={() => toggle(u.user_id)}
                        >
                          {picked.includes(u.user_id) ? "✓ " : ""}
                          {u.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? "Creating…" : "Create Group"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}