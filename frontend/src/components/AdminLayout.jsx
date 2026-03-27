// --- frontend/src/components/AdminLayout.jsx ---

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_NAV = [
  { to: "/admin",              label: "Overview",     icon: "⊞", end: true },
  { to: "/admin/users",        label: "Users",        icon: "👤" },
  { to: "/admin/groups",       label: "Groups",       icon: "◫" },
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