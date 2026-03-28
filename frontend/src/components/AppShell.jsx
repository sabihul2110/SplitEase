// --- frontend/src/components/AppShell.jsx ---

/**
 * AppShell.jsx — User app layout
 * - Sidebar nav uses proper SVG icons (stroke-based, Lucide style)
 * - Bell uses SVG icon (no emoji)
 * - Profile button in topbar opens a dropdown with menu items
 */

import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

// ─────────────────────────────────────────────
//  SVG Icon Set  (16px, stroke-based)
// ─────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  groups: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settlements: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  activity: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  signout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  // settings: (
  // <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  //   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  //   <circle cx="12" cy="12" r="3"/>
  //   <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  // </svg>
  // ),

  settings: (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    <path d="M7.068.727c.243-.97 1.62-.97 1.864 0l.071.286a.96.96 0 0 0 1.622.434l.205-.211c.695-.719 1.888-.03 1.613.931l-.08.284a.96.96 0 0 0 1.187 1.187l.283-.081c.96-.275 1.65.918.931 1.613l-.211.205a.96.96 0 0 0 .434 1.622l.286.071c.97.243.97 1.62 0 1.864l-.286.071a.96.96 0 0 0-.434 1.622l.211.205c.719.695.03 1.888-.931 1.613l-.284-.08a.96.96 0 0 0-1.187 1.187l.081.283c.275.96-.918 1.65-1.613.931l-.205-.211a.96.96 0 0 0-1.622.434l-.071.286c-.243.97-1.62.97-1.864 0l-.071-.286a.96.96 0 0 0-1.622-.434l-.205.211c-.695.719-1.888.03-1.613-.931l.08-.284a.96.96 0 0 0-1.186-1.187l-.284.081c-.96.275-1.65-.918-.931-1.613l.211-.205a.96.96 0 0 0-.434-1.622l-.286-.071c-.97-.243-.97-1.62 0-1.864l.286-.071a.96.96 0 0 0 .434-1.622l-.211-.205c-.719-.695-.30-1.888.931-1.613l.284.08a.96.96 0 0 0 1.187-1.186l-.081-.284c-.275-.96.918-1.65 1.613-.931l.205.211a.96.96 0 0 0 1.622-.434zM12.973 8.5H8.25l-2.834 3.779A4.998 4.998 0 0 0 12.973 8.5m0-1a4.998 4.998 0 0 0-7.557-3.779l2.834 3.78zM5.048 3.967l-.087.065zm-.431.355A4.98 4.98 0 0 0 3.002 8c0 1.455.622 2.765 1.615 3.678L7.375 8zm.344 7.646.087.065z"/>
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

// ─────────────────────────────────────────────
//  Profile dropdown component
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

  // Menu items — action is a placeholder for future /profile routes
  const MENU = [
    { icon: "user",  label: "View Profile",   route: "/profile" },
    { icon: "edit",  label: "Edit Details",    route: "/profile" },
    { icon: "lock",  label: "Change Password", route: "/profile" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => {
          console.log("clicked");
          setOpen(v => !v);
        }}
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
          fontSize: 11, fontWeight: 700, color: "#fff",
          letterSpacing: "0.02em", flexShrink: 0,
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

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 220, background: "var(--surface)",
          border: "1px solid var(--border2)", borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 500, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
          </div>

          {/* Items */}
          <div style={{ padding: "6px" }}>
            {MENU.map(item => (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.route);
                  setOpen(false);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 10px", borderRadius: 6,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text2)", fontSize: 13, fontWeight: 500,
                  fontFamily: "inherit", textAlign: "left", transition: "all 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text2)"; }}
              >
                <span style={{ color: "var(--text3)", display: "flex", flexShrink: 0 }}>{Icons[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Sign out */}
          <div style={{ padding: "6px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 10px", borderRadius: 6,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--danger)", fontSize: 13, fontWeight: 500,
                fontFamily: "inherit", textAlign: "left", transition: "background 0.1s",
              }}
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
export default function AppShell({ children, title, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark">S</div>
          <span className="sb-logo-text">Split<em>Ease</em></span>
        </div>

        <nav className="sb-nav">
          {[
            { to: "/dashboard",   label: "Dashboard",  icon: "dashboard"   },
            { to: "/groups",      label: "Groups",      icon: "groups"      },
            { to: "/settlements", label: "Settlements", icon: "settlements" },
            { to: "/activity", label: "Activity", icon: "activity" },
            { to: "/settings",    label: "Settings",    icon: "settings"    },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
            >
              <span className="sb-icon" style={{ display: "flex" }}>{Icons[item.icon]}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <span className="sb-label">System</span>
              <NavLink to="/admin" className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}>
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

      {/* Main */}
      <div className="shell-main">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {actions && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 4 }}>
                {actions}
              </div>
            )}
            <NotificationBell />
            <ProfileDropdown
              user={user}
              onLogout={() => { logout(); navigate("/login"); }}
            />
          </div>
        </header>

        <main className="page-area">
          <div className="page-inner fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}