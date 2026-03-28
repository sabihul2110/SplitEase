// --- frontend/src/components/AdminLayout.jsx ---

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const UI = {
  groups: (sz = 18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,

  groups2: (sz = 18) => (
  <svg
    width={sz}
    height={sz}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
),

  users: (sz = 18) => (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
    </svg>
  ),

}

const ADMIN_NAV = [
  { to: "/admin",              label: "Overview",     icon: "⊞", end: true },
  { to: "/admin/users",        label: "Users",        icon: UI.users(16), },
  { to: "/admin/groups",       label: "Groups",       icon: UI.groups(16), },
  { to: "/admin/transactions", label: "Transactions", icon: "⇄" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="shell">
      {/* Admin sidebar */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark" style={{ background: "#7c3aed" }}>A</div>
          <div>
            <span className="sb-logo-text">Admin <em style={{ color: "#a78bfa" }}>Panel</em></span>
          </div>
        </div>

        <nav className="sb-nav">
          <span className="sb-label">Control</span>
          {ADMIN_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
              style={({ isActive }) => isActive ? { background: "rgba(124,58,237,0.15)", color: "#a78bfa" } : {}}
            >
              <span className="sb-icon" style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div style={{ marginTop: 16 }}>
            <span className="sb-label">Navigation</span>
            <button
              className="sb-item"
              onClick={() => navigate("/dashboard")}
            >
              <span className="sb-icon">←</span>
              Back to App
            </button>
          </div>
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar" style={{ background: "#7c3aed" }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-user-name">{user?.name}</div>
              <div className="sb-user-sub" style={{ color: "#a78bfa" }}>admin</div>
            </div>
          </div>
          <button className="sb-signout" onClick={() => { logout(); navigate("/login"); }}>
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Admin content area — Outlet renders the matched child route */}
      <div className="shell-main">
        <main className="page-area">
          <div className="page-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}