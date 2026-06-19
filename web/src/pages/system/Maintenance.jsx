// web/src/pages/system/Maintenance.jsx


import { Icons } from "../../components/icons";

export default function Maintenance({ reason = "down" }) {
  const copy = {
    down: {
      title: "We'll be right back",
      body: "SplitEase is temporarily unavailable. This usually resolves within a minute — try refreshing shortly.",
    },
    maintenance: {
      title: "Scheduled maintenance",
      body: "We're making some improvements behind the scenes. Thanks for your patience — check back soon.",
    },
    error: {
      title: "Something went wrong",
      body: "An unexpected error occurred. Try reloading — if this keeps happening, please let us know.",
    },
  }[reason] || {
    title: "We'll be right back",
    body: "Something went wrong on our end. Please try again shortly.",
  };

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }} className="fade-up">
        <img src="/logo.svg" alt="SplitEase" style={{ width: 56, height: 56, margin: "0 auto 20px", display: "block" }} />

        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
          background: "var(--surface2)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text3)",
        }}>
          <Icons.zap size={26} />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 24 }}>
          {copy.body}
        </p>

        <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
          <Icons.refresh size={13} /> Try again
        </button>
      </div>
    </div>
  );
}