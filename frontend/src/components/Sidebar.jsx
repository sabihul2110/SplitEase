// --- frontend/src/components/Sidebar.jsx ---

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard",   label: "Dashboard",   icon: "⊞" },
  { to: "/groups",      label: "Groups",       icon: "◫" },
  { to: "/settlements", label: "Settlements",  icon: "⇄" },
  { to: "/activity",    label: "Activity",     icon: "◷" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-mark">S</div>
        <span className="sb-logo-text">Split<em>Ease</em></span>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        <div className="sb-section">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
            >
              <span className="sb-icon" style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="sb-section" style={{ marginTop: 12 }}>
            <span className="sb-label">Admin</span>
            <NavLink
              to="/admin"
              className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
            >
              <span className="sb-icon" style={{ fontSize: 15 }}>⚙</span>
              Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-user-name">{user?.name}</div>
            <div className="sb-user-sub">{user?.role}</div>
          </div>
        </div>
        <button className="sb-signout" onClick={() => { logout(); navigate("/login"); }}>
          <span style={{ fontSize: 13 }}>↪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}