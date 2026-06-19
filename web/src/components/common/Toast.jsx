// web/src/components/common/Toast.jsx


import { Icons } from "../icons";

export default function Toast({ toast }) {
  if (!toast) return null;
  const { msg, isErr } = toast;
  const Icon = isErr ? Icons.close : Icons.check;
  const color = isErr ? "var(--danger)" : "var(--success)";

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--surface)", border: `1px solid ${color}`,
      padding: "12px 20px", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      color: "var(--text)", fontWeight: 600, fontSize: 14,
    }}>
      <Icon size={15} color={color} />
      {msg}
    </div>
  );
}