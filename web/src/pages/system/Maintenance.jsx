// web/src/pages/system/Maintenance.jsx


import { Icons } from "../../components/icons";

const SUPPORT_EMAIL = "app.splitease@gmail.com";

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
        <img
          src="/logo.svg"
          alt="SplitEase"
          style={{ width: 48, height: 48, margin: "0 auto 28px", display: "block", opacity: 0.55 }}
        />

        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em", marginBottom: 10, color: "var(--text)" }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, marginBottom: 28, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
          {copy.body}
        </p>

        <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()} style={{ marginBottom: 24 }}>
          <Icons.refresh size={13} /> Try again
        </button>

        <div style={{ paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
            Still seeing this?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--text2)", fontWeight: 500 }}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}