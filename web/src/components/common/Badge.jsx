// web/src/components/common/Badge.jsx
//
// Thin wrapper around the existing .badge / .badge-* CSS classes
// (already defined in index.css). Use this instead of writing
// <span className="badge badge-success">label</span> inline everywhere —
// keeps variant names typo-proof and centralizes future style changes.

const VARIANTS = ["primary", "success", "danger", "neutral", "amber"];

export default function Badge({ label, variant = "neutral", style, children }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : "neutral";
  return (
    <span className={`badge badge-${safeVariant}`} style={style}>
      {label ?? children}
    </span>
  );
}