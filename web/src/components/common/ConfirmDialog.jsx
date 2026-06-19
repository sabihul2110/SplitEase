// web/src/components/common/ConfirmDialog.jsx


import { Icons } from "../icons";

export default function ConfirmDialog({ open, title, message, danger = false, confirmLabel = "Confirm", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box fade-up" style={{ maxWidth: 400 }}>
        <div className="modal-body" style={{ paddingTop: 22 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: danger ? "rgba(239,68,68,0.12)" : "rgba(37,99,235,0.12)",
              color: danger ? "var(--danger)" : "var(--primary-h)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icons.alertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{title}</div>
              {message && <div style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.5 }}>{message}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            <button className={danger ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}