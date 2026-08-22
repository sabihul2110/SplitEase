// --- web/src/pages/dashboard/Dashboard.jsx ---


import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getGroups } from "../../api/groups";
import { getSettlementsBulk } from "../../api/settlements";
import { getFinancialSummary } from "../../api/expenses";
import { getPeople } from "../../api/people";
import { Icons } from "../../components/icons";
import { getGroupIcon } from "../../constants/groupIcons";
import { useAuth } from "../../context/AuthContext";

const STYLES = `
  @keyframes dbFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dbPulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  .db-wrap { display: grid; grid-template-columns: 1fr 320px; grid-template-rows: auto auto; gap: 18px; align-items: start; }
  @media (max-width: 900px) { .db-wrap { grid-template-columns: 1fr; } }
  .db-hero { grid-column: 1; grid-row: 1; border-radius: 16px; background: linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 60%, rgba(16,185,129,0.06) 100%); border: 1px solid rgba(37,99,235,0.22); padding: 28px 32px 24px; animation: dbFadeUp 0.3s ease both; position: relative; overflow: hidden; }
  .db-hero::before { content: ""; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%); pointer-events: none; }
  .db-hero-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(147,197,253,0.65); margin-bottom: 10px; }
  .db-hero-name  { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #93c5fd; line-height: 1.1; margin-bottom: 6px; }
  .db-hero-sub   { font-size: 14px; color: rgba(147,197,253,0.55); }
  .db-hero-stats { display: flex; gap: 28px; margin-top: 22px; padding-top: 20px; border-top: 1px solid rgba(37,99,235,0.2); flex-wrap: wrap; }
  .db-hero-stat-val { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .db-hero-stat-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); margin-top: 3px; }
  .db-right { grid-column: 2; grid-row: 1 / 3; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 900px) { .db-right { grid-column: 1; grid-row: auto; } }
  .db-mini { border-radius: 14px; border: 1px solid var(--border); background: var(--surface); padding: 20px 22px; animation: dbFadeUp 0.3s ease both; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; position: relative; overflow: hidden; }
  .db-mini:hover { border-color: var(--border2); box-shadow: 0 6px 24px rgba(0,0,0,0.25); transform: translateY(-2px); }
  .db-mini-icon  { position: absolute; top: 18px; right: 18px; width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .db-mini-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text3); margin-bottom: 10px; }
  .db-mini-val   { font-size: 26px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; line-height: 1.1; margin-bottom: 6px; }
  .db-mini-sub   { font-size: 12px; color: var(--text3); }
  .db-groups { grid-column: 1; grid-row: 2; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); overflow: hidden; animation: dbFadeUp 0.35s ease both; }
  .db-section-head  { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .db-section-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .db-view-all { font-size: 12px; font-weight: 600; color: var(--primary-h); background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; }
  .db-group-row { display: flex; align-items: center; gap: 13px; padding: 13px 20px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .db-group-row:last-child { border-bottom: none; }
  .db-group-row:hover { background: rgba(255,255,255,0.025); }
  .db-group-icon    { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); }
  .db-group-name    { font-size: 14px; font-weight: 600; color: var(--text); }
  .db-group-date    { font-size: 11.5px; color: var(--text3); margin-top: 2px; }
  .db-group-chevron { color: var(--text3); font-size: 16px; margin-left: auto; }
  .db-insights { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; margin-bottom: 20px; }
  .db-chip { display: flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); font-size: 12px; color: var(--text2); font-weight: 500; animation: dbFadeUp 0.3s ease both; }
  .db-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .db-skel { animation: dbPulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }
  .db-empty { padding: 36px 20px; text-align: center; color: var(--text3); font-size: 13px; }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function MiniCard({ label, value, color, sub, icon, iconBg, delay = 0, breakdown }) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = breakdown && breakdown.length > 0;
  return (
    <div className="db-mini" style={{ animationDelay: `${delay}s`, borderColor: `${color}22` }}>
      <div className="db-mini-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="db-mini-label">{label}</div>
      <div className="db-mini-val" style={{ color }}>{value}</div>
      <div className="db-mini-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span>{sub}</span>
        {hasBreakdown && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: 11, fontWeight: 700,
              padding: 0, display: "flex", alignItems: "center", gap: 4,
              fontFamily: "inherit",
            }}
          >
            {expanded ? "Hide" : "Breakdown"}
            <span style={{
              display: "inline-flex", transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}>▾</span>
          </button>
        )}
      </div>
      {hasBreakdown && (
        <div style={{
          maxHeight: expanded ? 240 : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.22s ease, opacity 0.18s ease, margin-top 0.22s ease",
          marginTop: expanded ? 12 : 0,
          paddingTop: expanded ? 10 : 0,
          borderTop: expanded ? "1px solid var(--border)" : "none",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {breakdown.map((b, i) => (
            <div
              key={i}
              onClick={b.onClick}
              style={{
                display: "flex", justifyContent: "space-between", fontSize: 12.5,
                cursor: b.onClick ? "pointer" : "default",
              }}
            >
              <span style={{ color: "var(--text2)" }}>{b.label}</span>
              <span style={{ color, fontWeight: 600, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 4 }}>
                ₹{fmt(b.value)}{b.onClick && "›"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


  export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [groups,         setGroups]         = useState([]);
  const [balances,       setBalances]       = useState({ youOwe: 0, owedToYou: 0 });
  const [accountBalance, setAccountBalance] = useState(0);
  const [owedBreakdown,  setOwedBreakdown]  = useState([]);
  const [oweBreakdown,   setOweBreakdown]   = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: groupList } = await getGroups();
        setGroups(groupList || []);

        let youOwe = 0, owedToYou = 0;
        const owedList = [], oweList = [];
        if (groupList?.length) {
          const groupIds = groupList.map(g => g.group_id);
          const { data: bulkResult } = await getSettlementsBulk(groupIds);

          // Object.entries(bulkResult).forEach(([gid, rows]) => {
          //   const myRow = rows.find(s => s.user_id === user?.user_id);
          //   if (!myRow) return;
          //   const net = Number(myRow.net_balance);
          //   if (net === 0) return;
          //   const g = groupList.find(x => String(x.group_id) === String(gid));
          //   const label = g?.group_name || `Group #${gid}`;
          //   if (net < 0) { youOwe    += Math.abs(net); oweList.push({ label, value: Math.abs(net) }); }
          //   if (net > 0) { owedToYou += net;            owedList.push({ label, value: net }); }
          // });

                    Object.entries(bulkResult).forEach(([gid, rows]) => {
            // 1. Fallback in case 'rows' isn't an array (prevents .find from crashing)
            if (!Array.isArray(rows)) return;

            // 2. Wrap in String() to fix int vs string mismatches, and check user.id as a fallback
            const myRow = rows.find(s => String(s.user_id) === String(user?.user_id || user?.id));
            
            if (!myRow) return;
            
            const net = Number(myRow.net_balance);
            if (net === 0) return;
            
            const g = groupList.find(x => String(x.group_id) === String(gid));
            const label = g?.group_name || `Group #${gid}`;
            const onClick = () => navigate(`/groups/${gid}`);
            
            if (net < 0) { 
              youOwe += Math.abs(net); 
              oweList.push({ label, value: Math.abs(net), onClick }); 
            }
            if (net > 0) { 
              owedToYou += net;            
              owedList.push({ label, value: net, onClick }); 
            }
          });
        }

        try {
          const { data: summary } = await getFinancialSummary();
          setAccountBalance(Number(summary?.account_balance || 0));
          owedToYou += Number(summary?.loans_receivable || 0);
          youOwe    += Number(summary?.borrows_payable  || 0);
        } catch {
          setAccountBalance(0);
        }

        try {
          const { data: people } = await getPeople();
          (people || [])
            .filter(p => Number(p.net_balance) !== 0)
            .forEach(p => {
              const net = Number(p.net_balance);
              const onClick = () => navigate("/loans", { state: { initialTab: "people", personId: p.person_id } });
              if (net > 0) owedList.push({ label: `Owed by ${p.display_name}`, value: net, onClick });
              else         oweList.push({ label: `Owed to ${p.display_name}`, value: Math.abs(net), onClick });
            });
        } catch (err) {
          console.error("Dashboard: getPeople() failed, loan/borrow breakdown rows omitted:", err);
        }

        setBalances({ youOwe, owedToYou });
        setOwedBreakdown(owedList);
        setOweBreakdown(oweList);
      } finally { setLoading(false); }
    }
    load();
  }, [user]);

  const { setPageActions } = useOutletContext();
  useEffect(() => {
    setPageActions(<button className="btn btn-primary btn-sm" onClick={() => navigate("/groups")}>+ New Group</button>);
    return () => setPageActions(null);
  }, []);

  const isPositive = accountBalance >= 0;

  return (
    <>
      <style>{STYLES}</style>

        <div className="db-wrap">
          <div className="db-hero">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="db-hero-label">Your Account</div>
                <div className="db-hero-name"> {user?.name?.split(" ")[0]}'s SplitEase</div>
                <div className="db-hero-sub">{user?.email}</div>
              </div>
              <div style={{
                padding: "6px 13px", borderRadius: 20,
                background: "rgba(37,99,235,0.14)", border: "1px solid rgba(37,99,235,0.3)",
                fontSize: 12, fontWeight: 700, color: "#93c5fd", whiteSpace: "nowrap",
              }}>
                {groups.length} group{groups.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="db-hero-stats" style={{ gap: 0 }}>
              <div>
                <div className="db-hero-stat-lbl" style={{ marginTop: 0, marginBottom: 4 }}>Account Balance</div>
                <div className="db-hero-stat-val" style={{ fontSize: 34, color: isPositive ? "#34d399" : "#f87171" }}>
                  {isPositive ? "+" : "−"}₹{fmt(Math.abs(accountBalance))}
                </div>
              </div>
            </div>
          </div>

          <div className="db-right">
            <MiniCard label="You Are Owed" value={`₹${fmt(balances.owedToYou)}`} color="#34d399" iconBg="rgba(16,185,129,0.12)" sub={balances.owedToYou > 0 ? "Pending settlements" : "All clear"} delay={0.1} breakdown={owedBreakdown}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m0 0-7 7m7-7 7 7"/></svg>} />
            <MiniCard label="You Owe" value={`₹${fmt(balances.youOwe)}`} color={balances.youOwe > 0 ? "#f87171" : "var(--text2)"} iconBg="rgba(239,68,68,0.12)" sub={balances.youOwe > 0 ? "Pending payments" : "All clear"} delay={0.15} breakdown={oweBreakdown}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m0 0 7-7m-7 7-7-7"/></svg>} />
            <div className="db-mini" style={{ animationDelay: "0.2s" }}>
              <div className="db-mini-label">Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {[
                  { label: "View Groups",  route: "/groups",      color: "#3b82f6" },
                  { label: "My Expenses",  route: "/expenses",    color: "#10b981" },
                  { label: "Settlements",  route: "/settlements", color: "#8b5cf6" },
                ].map(a => (
                  <button key={a.label} onClick={() => navigate(a.route)}
                    style={{ width: "100%", padding: "9px 14px", borderRadius: 8, background: `${a.color}14`, border: `1px solid ${a.color}30`, color: a.color, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${a.color}22`; e.currentTarget.style.borderColor = `${a.color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${a.color}14`; e.currentTarget.style.borderColor = `${a.color}30`; }}
                  >→ {a.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="db-groups">
            <div className="db-section-head">
              <span className="db-section-title">Recent Groups</span>
              <button className="db-view-all" onClick={() => navigate("/groups")}>View all</button>
            </div>
            {loading ? (
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <span className="db-skel" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><span className="db-skel" style={{ width: "55%", height: 13, marginBottom: 7 }} /><span className="db-skel" style={{ width: "30%", height: 10 }} /></div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="db-empty">No groups yet. Create one to start splitting.</div>
            ) : (
              groups.slice(0, 6).map((g, i) => {
                const { IconComponent, bg, color } = getGroupIcon(g.group_name);
                return (
                  <div key={g.group_id} className="db-group-row" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => navigate(`/groups/${g.group_id}`)}>
                    <div className="db-group-icon" style={{ background: bg }}><IconComponent size={18} style={{ color }} /></div>
                    <div style={{ minWidth: 0 }}><div className="db-group-name">{g.group_name}</div><div className="db-group-date">{fmtShort(g.created_at)}</div></div>
                    <span className="db-group-chevron">›</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
    </>
  );
}