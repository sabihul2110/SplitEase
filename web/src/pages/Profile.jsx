// --- web/src/pages/Profile.jsx ---
/**
 * Profile page — /profile 
 *
 * FIX #15: loadStats() now uses POST /settlements/bulk instead of
 *          N individual GET /settlements/{id} calls.
 *          For a user in 10 groups this drops from 11 API calls to 2.
 *
 * FIX #9:  Balance row matched by user_id (integer), not user_name (string).
 *
 * All other logic and UI is identical to the original.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api          from "../api/axios";
import { useAuth }  from "../context/AuthContext";
import AppShell     from "../components/AppShell";

// ─────────────────────────────────────────────
//  Inline icons
// ─────────────────────────────────────────────
const Icon = {
  edit:   (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  lock:   (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  upi:    (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  mail:   (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  groups: (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  wallet: (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  eye:    (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  check:  (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  back:   (sz=15) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

// ─────────────────────────────────────────────
//  Password input with show/hide toggle
// ─────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: 40 }}
        required
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text3)", display: "flex", padding: 3, transition: "color 0.1s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text2)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
      >
        {show ? Icon.eyeOff(14) : Icon.eye(14)}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Edit Profile Modal
// ─────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSave }) {
  const [form,    setForm]    = useState({ name: user.name || "", email: user.email || "", upi_id: user.upi_id || "" });
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", {
        name:   form.name.trim(),
        email:  form.email.trim(),
        upi_id: form.upi_id.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => { onSave(data); onClose(); }, 800);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box fade-up">
        <div className="modal-head">
          <span className="modal-title">Edit Profile</span>
          <button className="btn btn-ghost btn-xs btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {Icon.check(14)} Saved successfully!
            </div>
          )}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input required autoFocus value={form.name}
                onChange={e => set("name", e.target.value)} placeholder="Your display name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" required value={form.email}
                onChange={e => set("email", e.target.value)} placeholder="you@college.edu" />
              <div className="form-hint">Changing email requires your password to stay valid.</div>
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label">
                UPI ID <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text3)" }}>— optional</span>
              </label>
              <input value={form.upi_id} onChange={e => set("upi_id", e.target.value)} placeholder="name@upi" />
              <div className="form-hint">Used for "Pay via UPI" links in settlements.</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving || success}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Change Password Modal
// ─────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form,    setForm]    = useState({ current: "", newPwd: "", confirm: "" });
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    if (!form.current)                return "Current password is required.";
    if (form.newPwd.length < 6)       return "New password must be at least 6 characters.";
    if (form.newPwd !== form.confirm)  return "Passwords don't match.";
    if (form.current === form.newPwd)  return "New password must differ from the current one.";
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: form.current,
        new_password:     form.newPwd,
        confirm_password: form.confirm,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  const strengthColor =
    form.newPwd.length === 0 ? "var(--border2)" :
    form.newPwd.length < 6   ? "var(--danger)"  :
    form.newPwd.length < 10  ? "var(--warning)" :
    "var(--success)";

  const strengthLabel =
    form.newPwd.length === 0 ? "" :
    form.newPwd.length < 6   ? "Too short" :
    form.newPwd.length < 10  ? "Fair"      :
    "Strong";

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box fade-up">
        <div className="modal-head">
          <span className="modal-title">Change Password</span>
          <button className="btn btn-ghost btn-xs btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {Icon.check(14)} Password changed successfully!
            </div>
          )}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Current password</label>
              <PasswordInput id="current-pwd" value={form.current}
                onChange={e => set("current", e.target.value)} placeholder="Your current password" />
            </div>
            <div className="form-group">
              <label className="form-label">New password</label>
              <PasswordInput id="new-pwd" value={form.newPwd}
                onChange={e => set("newPwd", e.target.value)} placeholder="Min. 6 characters" />
              {form.newPwd.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--border2)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: strengthColor,
                      width: form.newPwd.length < 6 ? "30%" : form.newPwd.length < 10 ? "65%" : "100%",
                      transition: "width 0.2s, background 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600, minWidth: 48 }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label className="form-label">Confirm new password</label>
              <PasswordInput id="confirm-pwd" value={form.confirm}
                onChange={e => set("confirm", e.target.value)} placeholder="Repeat new password" />
              {form.confirm.length > 0 && (
                <div style={{ marginTop: 5, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                  {form.newPwd === form.confirm ? (
                    <><span style={{ color: "var(--success)", display: "flex" }}>{Icon.check(12)}</span>
                      <span style={{ color: "var(--success)" }}>Passwords match</span></>
                  ) : (
                    <span style={{ color: "var(--danger)" }}>Passwords don't match</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving || success}>
                {saving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Profile page
// ─────────────────────────────────────────────
export default function Profile() {
  const { user, login } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();

  const [groups,       setGroups]       = useState([]);
  const [netBalance,   setNetBalance]   = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);

  // Deep-link: /profile?action=password or ?action=edit
  useEffect(() => {
    const action = new URLSearchParams(location.search).get("action");
    if (action === "password") setShowPwd(true);
    if (action === "edit")     setShowEdit(true);
  }, [location]);

  const initials = (user?.name || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // ── FIX #15 + #9: bulk settlements, match by user_id ──────────────────────
  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const { data: groupList } = await api.get("/groups/");
        setGroups(groupList);

        if (!groupList.length) {
          setNetBalance(0);
          return;
        }

        // FIX #15: one POST replaces N individual GET /settlements/{id} calls
        const { data: bulkResult } = await api.post("/settlements/bulk", {
          group_ids: groupList.map(g => g.group_id),
        });

        let owe = 0, owed = 0;
        Object.values(bulkResult).forEach(rows => {
          // FIX #9: match by user_id (integer), not user_name (string)
          const myRow = rows.find(s => s.user_id === user?.user_id);
          if (!myRow) return;
          const net = Number(myRow.net_balance);
          if (net < 0) owe  += Math.abs(net);
          if (net > 0) owed += net;
        });
        setNetBalance(owed - owe);

      } catch {
        setNetBalance(null);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, [user]);

  // After save: merge fresh data into AuthContext + localStorage
  function handleProfileSave(freshUser) {
    const stored  = JSON.parse(localStorage.getItem("expense_user") || "{}");
    const updated = { ...stored, ...freshUser };
    localStorage.setItem("expense_user", JSON.stringify(updated));
    login(updated);
  }

  const netColor =
    netBalance === null ? "var(--text2)"  :
    netBalance > 0      ? "var(--success)" :
    netBalance < 0      ? "var(--danger)"  :
    "var(--text2)";

  const netLabel =
    netBalance === null ? "—"                                              :
    netBalance > 0      ? `+₹${netBalance.toLocaleString("en-IN")}`        :
    netBalance < 0      ? `-₹${Math.abs(netBalance).toLocaleString("en-IN")}` :
    "₹0";

  return (
    <>
      <AppShell title="Profile">
        <button className="back-btn mb-4" onClick={() => navigate(-1)}>
          {Icon.back(14)} Back
        </button>

        {/* ── HERO CARD ── */}
        <div className="card card-p" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: 20, flexShrink: 0,
              background: "var(--primary)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 26, fontWeight: 800,
              color: "#fff", letterSpacing: "0.02em",
              boxShadow: "0 0 0 4px rgba(37,99,235,0.18)",
            }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>{user?.name}</div>
                <span className={`badge ${user?.role === "admin" ? "badge-primary" : "badge-neutral"}`}>
                  {user?.role}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text2)" }}>
                  <span style={{ color: "var(--text3)", display: "flex" }}>{Icon.mail(14)}</span>
                  {user?.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: user?.upi_id ? "var(--text2)" : "var(--text3)" }}>
                  <span style={{ color: "var(--text3)", display: "flex" }}>{Icon.upi(14)}</span>
                  {user?.upi_id || <em style={{ fontStyle: "normal", color: "var(--text3)", fontSize: 13 }}>No UPI ID set</em>}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setShowEdit(true)}>
                {Icon.edit(13)} Edit Profile
              </button>
              <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setShowPwd(true)}>
                {Icon.lock(13)} Change Password
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          {/* Total Groups */}
          <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(37,99,235,0.12)", color: "var(--primary-h)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Icon.groups(18)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
                Total Groups
              </div>
              {statsLoading
                ? <div style={{ width: 40, height: 20, background: "var(--surface3)", borderRadius: 4 }} />
                : <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-h)", letterSpacing: "-0.02em" }}>{groups.length}</div>
              }
            </div>
          </div>

          {/* Net Balance */}
          <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: netBalance > 0 ? "rgba(16,185,129,0.12)" : netBalance < 0 ? "rgba(239,68,68,0.1)" : "var(--surface2)", color: netColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Icon.wallet(18)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
                Net Balance
              </div>
              {statsLoading
                ? <div style={{ width: 80, height: 20, background: "var(--surface3)", borderRadius: 4 }} />
                : <div style={{ fontSize: 22, fontWeight: 800, color: netColor, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{netLabel}</div>
              }
              {!statsLoading && netBalance !== null && (
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  {netBalance > 0 ? "owed to you" : netBalance < 0 ? "you owe" : "all settled up"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ACCOUNT INFO CARD ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>
            Account Details
          </div>
          {[
            { label: "Display Name", value: user?.name,              icon: Icon.edit  },
            { label: "Email",        value: user?.email,             icon: Icon.mail  },
            { label: "UPI ID",       value: user?.upi_id || "Not set", icon: Icon.upi },
            { label: "Account Role", value: user?.role,              icon: Icon.check },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--text3)", display: "flex" }}>{row.icon(13)}</span>
                <span style={{ fontSize: 13, color: "var(--text3)", fontWeight: 500 }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 14, color: row.value === "Not set" ? "var(--text3)" : "var(--text)", fontWeight: 500 }}>
                {row.value === "Not set"
                  ? <em style={{ fontStyle: "normal", fontSize: 13 }}>Not set</em>
                  : row.value}
              </span>
            </div>
          ))}
          <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowEdit(true)}>
              {Icon.edit(12)} Edit Profile
            </button>
            <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowPwd(true)}>
              {Icon.lock(12)} Change Password
            </button>
          </div>
        </div>
      </AppShell>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={handleProfileSave}
        />
      )}
      {showPwd && (
        <ChangePasswordModal onClose={() => setShowPwd(false)} />
      )}
    </>
  );
}