// web/src/components/ui/PasswordInput.jsx
// Reusable password input with show/hide eye toggle.
// Matches the app's existing <input> styling exactly — drop-in replacement.
// Usage:
//   <PasswordInput
//     value={form.password}
//     onChange={e => setForm(f => ({...f, password: e.target.value}))}
//     placeholder="Min. 8 characters"
//     required
//     autoFocus
//   />

import { useState } from "react";

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function PasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", ...style }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={{ width: "100%", paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute", right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text3)", display: "flex", alignItems: "center",
          padding: 4, borderRadius: 4,
          transition: "color 0.12s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}