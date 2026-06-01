// --- web/src/pages/Settings.jsx ---
/**
 * Settings page — /settings
 *
 * Sections:
 *  1. Appearance — dark/light/system theme (stored in localStorage)
 *  2. Notifications — placeholder for future
 *  3. Account — quick links to Profile actions
 *  4. About — version info
 *
 * Theme implementation:
 *  - Stores "theme" key in localStorage: "dark" | "light" | "system"
 *  - Applies data-theme="dark"|"light" to <html>
 *  - Your index.css already uses CSS vars that work in dark mode.
 *    For light mode add: [data-theme="light"] { --bg: #f8f9fc; --surface: #fff; ... }
 *  - "system" reads prefers-color-scheme and follows OS.
 *
 * No new backend endpoints needed.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link }   from "react-router-dom";
import { useAuth }             from "../context/AuthContext";
import AppShell                from "../components/AppShell";
import api from "../api/axios";

// ─────────────────────────────────────────────
//  Theme utilities
// ─────────────────────────────────────────────
function getStoredTheme() {
  return localStorage.getItem("splitease_theme") || "dark";
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", theme);
  }
  localStorage.setItem("splitease_theme", theme);
}

// ─────────────────────────────────────────────
//  Inline icons
// ─────────────────────────────────────────────
const Icon = {
  moon:    (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  sun:     (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  monitor: (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  check:   (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  user:    (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  lock:    (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  logout:  (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  info:    (sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  chevron: (sz=14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  back:    (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

// ─────────────────────────────────────────────
//  SettingRow — reusable row component
// ─────────────────────────────────────────────
function SettingRow({ icon, label, sub, children, onClick, danger = false, last = false }) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: last ? "none" : "1px solid var(--border)",
        cursor: isClickable ? "pointer" : "default",
        transition: "background 0.1s",
        gap: 12,
      }}
      onMouseEnter={e => { if (isClickable) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={e => { if (isClickable) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: danger ? "rgba(239,68,68,0.1)" : "var(--surface2)",
            color: danger ? "var(--danger)" : "var(--text3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: danger ? "var(--danger)" : "var(--text)" }}>
            {label}
          </div>
          {sub && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {children}
        {isClickable && !children && (
          <span style={{ color: "var(--text3)", display: "flex" }}>{Icon.chevron(14)}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SectionHeader
// ─────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
      color: "var(--text3)", padding: "20px 0 8px",
    }}>
      {title}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Theme selector buttons
// ─────────────────────────────────────────────
function ThemeSelector({ current, onChange }) {
  const options = [
    { key: "dark",   label: "Dark",   iconFn: Icon.moon   },
    { key: "light",  label: "Light",  iconFn: Icon.sun    },
    { key: "system", label: "System", iconFn: Icon.monitor },
  ];

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(o => {
        const active = current === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "10px 14px", borderRadius: 9, cursor: "pointer",
              border: active ? "1.5px solid var(--primary)" : "1px solid var(--border)",
              background: active ? "rgba(37,99,235,0.1)" : "var(--surface2)",
              color: active ? "var(--primary-h)" : "var(--text2)",
              fontFamily: "inherit", transition: "all 0.12s",
              minWidth: 72,
            }}
          >
            <span style={{ display: "flex" }}>{o.iconFn(18)}</span>
            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400 }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DangerZone() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("idle"); // idle | checking | pending | confirm | force_confirm | done | error
  const [pending, setPending] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReset() {
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/users/reset-my-data");
      if (r.data.status === "pending_settlements") {
        setPending(r.data.pending);
        setStep("pending");
      } else {
        setResult(r.data.deleted);
        setStep("done");
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceReset() {
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/users/reset-my-data/force");
      setResult(r.data.deleted);
      setStep("done");
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  const TrashIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );

  if (step === "done") return (
    <div className="card card-p" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--success)", marginBottom: 6 }}>✓ Data reset complete</div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>
        Deleted: {result?.personal_expenses} personal expenses, {result?.income} income entries,
        {result?.loans} loans, {result?.borrows} borrows, {result?.group_expenses} group expenses.
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate("/login"); }}>
        Sign out now
      </button>
    </div>
  );

  if (step === "pending") return (
    <div className="card card-p" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warning)", marginBottom: 6 }}>
        ⚠ You have unsettled balances
      </div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
        Resetting will remove your data from these groups:
      </div>
      {pending.map(g => (
        <div key={g.group_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span>{g.group_name}</span>
          <span style={{ color: g.net_balance > 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
            {g.net_balance > 0 ? "+" : ""}₹{Math.abs(g.net_balance).toFixed(2)}
          </span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setStep("idle")}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={() => setStep("force_confirm")} disabled={loading}>
          Reset anyway
        </button>
      </div>
    </div>
  );

  if (step === "force_confirm") return (
    <div className="card card-p" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", marginBottom: 8 }}>
        This cannot be undone. Are you sure?
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setStep("idle")}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={handleForceReset} disabled={loading}>
          {loading ? "Resetting…" : "Yes, wipe my data"}
        </button>
      </div>
    </div>
  );

  if (step === "confirm") return (
    <div className="card card-p" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", marginBottom: 6 }}>
        Reset all your data?
      </div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>
        This will permanently delete all your expenses, income, loans, borrows, and remove you from all groups. Your account stays active.
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setStep("idle")}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={handleReset} disabled={loading}>
          {loading ? "Checking…" : <><TrashIcon /> Reset my data</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 4, borderColor: "rgba(239,68,68,0.15)" }}>
      <SettingRow
        icon={<TrashIcon />}
        label="Reset My Data"
        sub="Delete all your expenses, income, loans and group data"
        onClick={() => setStep("confirm")}
        danger
        last
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Settings page
// ─────────────────────────────────────────────
export default function Settings() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Apply theme whenever it changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  function handleThemeChange(t) {
    setTheme(t);
    applyTheme(t);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (user?.name || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AppShell title="Settings">
      <button className="back-btn mb-4" onClick={() => navigate(-1)}>
        {Icon.back(14)} Back
      </button>

      {/* ── PROFILE SUMMARY ── */}
      <div
        className="card card-p"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            flexShrink: 0,
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.02em",
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              marginBottom: 3,
            }}
          >
            {user?.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            {user?.email}
          </div>
        </div>
        <Link
          to="/profile"
          className="btn btn-ghost btn-sm"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          {Icon.user(13)} View Profile
        </Link>
      </div>

      {/* ── APPEARANCE ── */}
      <SectionHeader title="Appearance" />
      <div className="card" style={{ marginBottom: 4 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            Theme
          </div>
          <div
            style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}
          >
            Choose how SplitEase looks. Stored locally on your device.
          </div>
          <ThemeSelector current={theme} onChange={handleThemeChange} />

          {/* Note about light mode */}
          {theme === "light" && (
            <div
              className="alert"
              style={{
                marginTop: 14,
                marginBottom: 0,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "var(--warning)",
                fontSize: 13,
              }}
            >
              Light mode requires light-mode CSS variables in index.css. See
              integration notes.
            </div>
          )}
        </div>
      </div>

      {/* ── ACCOUNT ── */}
      <SectionHeader title="Account" />
      <div className="card" style={{ marginBottom: 4 }}>
        <SettingRow
          icon={Icon.user(15)}
          label="Profile & Password"
          sub="Edit name, email, UPI ID, change password"
          onClick={() => navigate("/profile")}
          last
        />
      </div>

      {/* ── DANGER ZONE ── */}
      <SectionHeader title="Session" />
      <div className="card" style={{ marginBottom: 24 }}>
        {!logoutConfirm ? (
          <SettingRow
            icon={Icon.logout(15)}
            label="Sign Out"
            sub="Sign out of this device"
            onClick={() => setLogoutConfirm(true)}
            danger
            last
          />
        ) : (
          <div style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--danger)",
                marginBottom: 8,
              }}
            >
              Confirm sign out?
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}
            >
              You'll need to log in again to access your account.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                {Icon.logout(13)} Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DANGER ZONE ── */}
      <SectionHeader title="Danger Zone" />
      <DangerZone />

      {/* ── ABOUT ── */}
      <SectionHeader title="About" />
      <div className="card card-p" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "App", value: "SplitEase" },
            { label: "Version", value: "2.1.0" },
            { label: "Stack", value: "React + FastAPI + MySQL" },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--text3)" }}>{row.label}</span>
              <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}