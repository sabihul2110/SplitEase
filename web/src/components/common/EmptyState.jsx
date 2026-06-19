// web/src/components/common/EmptyState.jsx


export default function EmptyState({ icon: Icon, title, subtitle, action, size = 40 }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      padding: "56px 24px", gap: 10,
    }}>
      {Icon && (
        <div style={{ opacity: 0.3, marginBottom: 6 }}>
          <Icon size={size} />
        </div>
      )}
      {title && <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)" }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 13, color: "var(--text3)", maxWidth: 320 }}>{subtitle}</div>}
      {action}
    </div>
  );
}