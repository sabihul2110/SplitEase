// web/src/components/common/Badge.jsx


const VARIANTS = ["primary", "success", "danger", "neutral", "amber"];

export default function Badge({ label, variant = "neutral", style, children }) {
  const safeVariant = VARIANTS.includes(variant) ? variant : "neutral";
  return (
    <span className={`badge badge-${safeVariant}`} style={style}>
      {label ?? children}
    </span>
  );
}