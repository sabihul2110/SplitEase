// --- web/src/components/layout/AppShell.jsx ---

import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, Outlet, useMatches } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { Icons as SharedIcons } from "../icons";

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
  people: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  expenses: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  loans: (
    <svg width="16" height="16" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="22" cy="14" r="8" />
      <path d="M8 35c0-7.7 6.3-14 14-14 7.7 0 14 6.3 14 14v2H8v-2z" />
      <circle cx="78" cy="62" r="8" />
      <path d="M64 83c0-7.7 6.3-14 14-14 7.7 0 14 6.3 14 14v2H64v-2z" />
      <circle cx="50" cy="50" r="16" />
      <path d="M44 44h12" />
      <path d="M44 49h10" />
      <path d="M46 44c6 0 6 5 0 5" />
      <path d="M46 49l8 9" />
      <path d="M68 18 Q82 18 82 32" />
      <polyline points="78,28 82,32 86,28" />
      <path d="M32 82 Q18 82 18 68" />
      <polyline points="22,72 18,68 14,72" />
    </svg>
  ),
  groups: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="8" r="2" />
      <path d="M1 19v-1a4 4 0 0 1 4-4h1" />
      <circle cx="19" cy="8" r="2" />
      <path d="M23 19v-1a4 4 0 0 0-4-4h-1" />
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
    </svg>
  ),
  settlements: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
      <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),
  activity: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  signout: <SharedIcons.logout size={15} />,
  user:    <SharedIcons.profile size={14} />,
  edit:    <SharedIcons.edit size={14} />,
  lock:    <SharedIcons.lock size={14} />,
  chevron: <SharedIcons.chevronDown size={11} />,
};

const NAV_ITEMS = [
  { to: "/dashboard",   label: "Dashboard",   icon: "dashboard"   },
  { to: "/groups",      label: "Groups",      icon: "groups"      },
  { to: "/expenses",    label: "Expenses",    icon: "expenses"    },
  { to: "/loans",       label: "Loans",       icon: "loans"       },
  { to: "/settlements", label: "Settlements", icon: "settlements" },
  { to: "/activity",    label: "Activity",    icon: "activity"    },
  { to: "/settings",    label: "Settings",    icon: "settings"    },
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

  const initials = (user?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const MENU = [
    { icon: "user", label: "View Profile",   route: "/profile" },
    { icon: "edit", label: "Edit Details",   route: "/profile" },
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
//  Tooltip
// ─────────────────────────────────────────────
function SidebarTooltip({ label, btnRef, side = "right" }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      if (side === "right") {
        setPos({ top: r.top + r.height / 2, left: r.right + 8 });
      } else if (side === "left") {
        setPos({ top: r.top + r.height / 2, left: r.left - 8 });
      } else if (side === "bottom") {
        setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
      }
    }
  }, [btnRef, side]);

  let transform = "translateY(-50%)";
  if (side === "left") transform = "translate(-100%, -50%)";
  if (side === "bottom") transform = "translateX(-50%)";

  return (
        <div style={{
          position: "fixed", top: pos.top, left: pos.left,
          transform, zIndex: 9999, pointerEvents: "none",
          display: "flex", flexDirection: side === "bottom" ? "column" : "row",
          alignItems: "center", gap: 0,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))"
        }}>
          {side === "bottom" && (
            <div style={{ width: 0, height: 0,
              borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
              borderBottom: "5px solid #e8eaed", flexShrink: 0, marginBottom: -1 }} />
          )}
          {side === "right" && (
            <div style={{ width: 0, height: 0,
              borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
              borderRight: "5px solid #e8eaed", flexShrink: 0, marginRight: -1 }} />
          )}
          <div style={{
            background: "#e8eaed", color: "#202124",
            fontSize: 12, fontWeight: 500, lineHeight: 1,
            padding: "6px 12px", borderRadius: 8,
            whiteSpace: "nowrap"
          }}>
            {label}
          </div>
          {side === "left" && (
            <div style={{ width: 0, height: 0,
              borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
              borderLeft: "5px solid #e8eaed", flexShrink: 0, marginLeft: -1 }} />
          )}
        </div>
      );
}

// ─────────────────────────────────────────────
//  Sidebar Icons
// ─────────────────────────────────────────────

// Sidebar panel icon with dynamic states (open/close/idle)
const IconSidebarPanel = ({ type }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="9" y1="3" x2="9" y2="21" />
    {/* Open Sidebar (Right Arrow) */}
    {type === "open" && <polyline points="14 9 16 12 14 15" />}
    {/* Close Sidebar (Left Arrow) */}
    {type === "close" && <polyline points="16 9 13 12 16 15" />}
  </svg>
);

// ─────────────────────────────────────────────
// Sidebar Toggle Button
// ─────────────────────────────────────────────
function SidebarToggleButton({ collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  const btnRef = useRef(null);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        ref={btnRef}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 40, height: 40, borderRadius: 20, // Perfectly circular hover state like Google apps
          border: "none",
          background: hover ? "var(--surface2)" : "transparent",
          color: hover ? "var(--text)" : "var(--text2)",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", transition: "all 0.15s", flexShrink: 0
        }}
      >
        {collapsed && !hover ? (
          <img src="/logo.svg" alt="SplitEase Logo" style={{ width: 26, height: 26, display: "block" }} />
        ) : (
          <IconSidebarPanel type={hover ? (collapsed ? "open" : "close") : "idle"} />
        )}
      </button>
      {hover && (
        <SidebarTooltip 
          label={collapsed ? "Expand menu" : "Collapse menu"} 
          btnRef={btnRef} 
          side={collapsed ? "right" : "bottom"} 
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main AppShell
// ─────────────────────────────────────────────
export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sb_collapsed") === "1");
  const [pageActions, setPageActions] = useState(null);

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem("sb_collapsed", next ? "1" : "0");
      return next;
    });
  }
  const matches = useMatches();
  const current = matches[matches.length - 1];
  const title = current?.handle?.title || "";
  const actions = pageActions;

  return (
    <div className="shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          className="mobile-overlay"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}
        style={{ width: collapsed ? 68 : undefined, transition: "width 0.16s ease", overflowX: "hidden" }}>
        
        {/* Gemini-Styled Sidebar Header */}
        <div className="sb-header" style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "12px 0" : "12px 16px 12px 20px",
          height: 64, boxSizing: "border-box", borderBottom: "none"
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
              <img 
            src="/logo.svg" 
            alt="SplitEase Logo" 
            style={{ width: 32, height: 32, display: "block" }} 
          />
              <span className="sb-logo-text">Split<em>Ease</em></span>
            </div>
          )}
          <SidebarToggleButton collapsed={collapsed} onClick={toggleCollapsed} />
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.label : undefined}
              style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}
            >
              <span className="sb-icon" style={{ display: "flex" }}>{Icons[item.icon]}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              {!collapsed && <span className="sb-label">System</span>}
              <NavLink to="/admin" className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? "Admin Panel" : undefined}
                style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}>
                <span className="sb-icon" style={{ display: "flex" }}>{Icons.admin}</span>
                {!collapsed && "Admin Panel"}
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sb-footer">
          <button className="sb-signout" onClick={() => { logout(); navigate("/login"); }}
            title={collapsed ? "Sign out" : undefined}
            style={collapsed ? { justifyContent: "center", paddingLeft: 0, paddingRight: 0 } : undefined}>
            <span style={{ display: "flex" }}>{Icons.signout}</span>
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar" style={{ borderBottom: "none" }}>
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
          <div className="page-inner fade-up">
            <Outlet context={{ setPageActions }} />
          </div>
        </main>
      </div>
    </div>
  );
}