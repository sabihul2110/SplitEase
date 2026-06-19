// web/src/components/common/Avatar.jsx
//
// Replaces the initials-circle block duplicated across GroupDetail.jsx,
// Loans.jsx, People.jsx, AddEntryModal.jsx, ProfileDropdown (AppShell.jsx).
// Same visual output everywhere, one source of truth for the color hash.

import { AVATAR_PALETTE } from "../../constants/theme";

function colorForName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsForName(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

export default function Avatar({ name = "?", size = 36, style, ringColor }) {
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: colorForName(name),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: "#fff",
        flexShrink: 0,
        border: ringColor ? `2px solid ${ringColor}` : "none",
        ...style,
      }}
    >
      {initialsForName(name)}
    </div>
  );
}