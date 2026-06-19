// web/src/components/common/Toast.jsx
//
// Extracted from the near-identical toast implementations hand-rolled in
// Loans.jsx (PeopleLedger) and People.jsx. Pairs with the useToast hook
// in hooks/useToast.js (next batch) — call site becomes:
//
//   const { toast, notify } = useToast();
//   ...
//   <Toast toast={toast} />
//   notify("Entry added");
//   notify("Failed to delete", true);

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