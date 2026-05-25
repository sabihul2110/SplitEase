// --- web/src/components/AppShell.jsx ---

import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

// ─────────────────────────────────────────────
//  SVG Icons — every item DISTINCT
// ─────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  // Expenses — receipt / document with lines
  expenses: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  // Loans — two people with arrow between (money flow between 2)
  loans: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="8" r="3"/>
      <circle cx="19" cy="8" r="3"/>
      <path d="M9 20H5a2 2 0 0 1-2-2v-1a4 4 0 0 1 4-4h1"/>
      <path d="M15 20h4a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-1"/>
      <path d="M12 12v6m-2-2 2 2 2-2"/>
    </svg>
  ),
  // Groups — three people (distinct from Loans which is 2)
  groups: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <path d="M3 20v-1a6 6 0 0 1 6-6"/>
      <circle cx="17" cy="7" r="3"/>
      <path d="M21 20v-1a6 6 0 0 0-6-6H9a6 6 0 0 0-6 6v1"/>
    </svg>
  ),
  // Settlements — two arrows opposite directions
  settlements: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
      <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),
  // Activity — pulse waveform
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  // Settings — gear
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  // Admin — shield with checkmark
  admin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  signout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  lock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  chevron: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { to: "/dashboard",   label: "Dashboard",   icon: "dashboard"   },
  { to: "/expenses",    label: "Expenses",     icon: "expenses"    },
  { to: "/loans",       label: "Loans",        icon: "loans"       },
  { to: "/groups",      label: "Groups",       icon: "groups"      },
  { to: "/settlements", label: "Settlements",  icon: "settlements" },
  { to: "/activity",    label: "Activity",     icon: "activity"    },
  { to: "/settings",    label: "Settings",     icon: "settings"    },
];

// ─────────────────────────────────────────────
//  Profile dropdown
// ─────────────────────────────────────────────
function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const initials = (user?.name || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const MENU = [
    { icon: "user", label: "View Profile",   route: "/profile" },
    { icon: "edit", label: "Edit Details",    route: "/profile" },
    { icon: "lock", label: "Change Password", route: "/profile?action=password" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: open ? "var(--surface2)" : "transparent",
          border: `1px solid ${open ? "var(--border2)" : "transparent"}`,
          borderRadius: 8, padding: "4px 8px 4px 4px",
          cursor: "pointer", transition: "all 0.12s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "var(--surface2)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--primary)", border: "2px solid rgba(37,99,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name?.split(" ")[0]}
          </span>
          <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {user?.role}
          </span>
        </div>
        <span style={{ color: "var(--text3)", display: "flex", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          {Icons.chevron}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 220, background: "var(--surface)",
          border: "1px solid var(--border2)", borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 500, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
          </div>
          <div style={{ padding: "6px" }}>
            {MENU.map(item => (
              <button key={item.label} onClick={() => { navigate(item.route); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", textAlign: "left", transition: "all 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text2)"; }}
              >
                <span style={{ color: "var(--text3)", display: "flex", flexShrink: 0 }}>{Icons[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "6px", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => { onLogout(); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", textAlign: "left", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ display: "flex", flexShrink: 0 }}>{Icons.signout}</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  AppShell
// ─────────────────────────────────────────────
// export default function AppShell({ children, title, actions }) {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   return (
//     <div className="shell">
//       <aside className="sidebar">
//         <div className="sb-logo">
//           <div className="sb-logo-mark">S</div>
//           <span className="sb-logo-text">Split<em>Ease</em></span>
//         </div>

//         <nav className="sb-nav">
//           {NAV_ITEMS.map(item => (
//             <NavLink
//               key={item.to}
//               to={item.to}
//               className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
//             >
//               <span className="sb-icon" style={{ display: "flex" }}>{Icons[item.icon]}</span>
//               {item.label}
//             </NavLink>
//           ))}

//           {user?.role === "admin" && (
//             <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
//               <span className="sb-label">System</span>
//               <NavLink to="/admin" className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
//                 <span className="sb-icon" style={{ display: "flex" }}>{Icons.admin}</span>
//                 Admin Panel
//               </NavLink>
//             </div>
//           )}
//         </nav>

//         <div className="sb-footer">
//           <button className="sb-signout" onClick={() => { logout(); navigate("/login"); }}>
//             <span style={{ display: "flex" }}>{Icons.signout}</span>
//             Sign out
//           </button>
//         </div>
//       </aside>

//       <div className="shell-main">
//         <header className="topbar">
//           <span className="topbar-title">{title}</span>
//           <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
//             {actions && (
//               <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 4 }}>
//                 {actions}
//               </div>
//             )}
//             <NotificationBell />
//             <ProfileDropdown user={user} onLogout={() => { logout(); navigate("/login"); }} />
//           </div>
//         </header>

//         <main className="page-area">
//           <div className="page-inner fade-up">{children}</div>
//         </main>
//       </div>
//     </div>
//   );
// }






export default function AppShell({ children, title, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          className="mobile-overlay"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sb-logo">
          <div className="sb-logo-mark">S</div>
          <span className="sb-logo-text">Split<em>Ease</em></span>
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sb-icon" style={{ display: "flex" }}>{Icons[item.icon]}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <span className="sb-label">System</span>
              <NavLink to="/admin" className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}>
                <span className="sb-icon" style={{ display: "flex" }}>{Icons.admin}</span>
                Admin Panel
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sb-footer">
          <button className="sb-signout" onClick={() => { logout(); navigate("/login"); }}>
            <span style={{ display: "flex" }}>{Icons.signout}</span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="topbar-title">{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {actions && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 4 }}>
                {actions}
              </div>
            )}
            <NotificationBell />
            <ProfileDropdown user={user} onLogout={() => { logout(); navigate("/login"); }} />
          </div>
        </header>

        <main className="page-area">
          <div className="page-inner fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}