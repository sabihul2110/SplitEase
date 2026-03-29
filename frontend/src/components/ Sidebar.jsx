// --- frontend/src/components/Sidebar.jsx ---

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Icons = {
  // Dashboard — 4 squares grid
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),

  // My Expenses — receipt / list with rupee
  Expenses: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),

  // Loans — two people with a money arrow between them (distinct: only 2 people)
  Loans: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="7" r="3"/>
      <circle cx="19" cy="7" r="3"/>
      <path d="M5 10v2a2 2 0 0 0 2 2h3"/>
      <path d="M19 10v2a2 2 0 0 1-2 2h-3"/>
      <polyline points="9 17 12 14 15 17"/>
      <line x1="12" y1="14" x2="12" y2="20"/>
    </svg>
  ),

  // Groups — three people (distinct: 3 heads visible)
  Groups: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="3"/>
      <path d="M1 20v-1a7 7 0 0 1 7-7h2"/>
      <circle cx="17" cy="6" r="3"/>
      <path d="M23 20v-1a7 7 0 0 0-7-7h-2a7 7 0 0 0-7 7v1"/>
    </svg>
  ),

  // Settlements — two arrows going opposite directions (pay/receive)
  Settlements: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
      <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),

  // Activity — pulse / waveform
  Activity: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),

  // Settings — gear
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),

  // Admin Panel — shield with checkmark
  Admin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),

  // Sign out
  SignOut: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { to: "/dashboard",   label: "Dashboard",   Icon: Icons.Dashboard   },
  { to: "/my-expenses", label: "My Expenses",  Icon: Icons.Expenses    },
  { to: "/loans",       label: "Loans",        Icon: Icons.Loans       },
  { to: "/groups",      label: "Groups",       Icon: Icons.Groups      },
  { to: "/settlements", label: "Settlements",  Icon: Icons.Settlements },
  { to: "/activity",    label: "Activity",     Icon: Icons.Activity    },
  { to: "/settings",    label: "Settings",     Icon: Icons.Settings    },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-icon">S</div>
        <span className="sb-logo-text">SplitEase</span>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sb-item${isActive ? " active" : ""}`}
          >
            <span className="sb-item-icon"><Icon /></span>
            <span className="sb-item-label">{label}</span>
          </NavLink>
        ))}

        {/* Admin — only for admin users */}
        {user?.role === "admin" && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
              textTransform: "uppercase", color: "var(--text3)",
              padding: "16px 16px 6px", marginTop: 8,
            }}>
              System
            </div>
            <NavLink to="/admin" className={({ isActive }) => `sb-item${isActive ? " active" : ""}`}>
              <span className="sb-item-icon"><Icons.Admin /></span>
              <span className="sb-item-label">Admin Panel</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 9, overflow: "hidden" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(37,99,235,0.2)", color: "#93c5fd",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", display: "flex", padding: 4, borderRadius: 6,
            transition: "color 0.12s", flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
        >
          <Icons.SignOut />
        </button>
      </div>
    </aside>
  );
}