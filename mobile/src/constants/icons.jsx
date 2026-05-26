// SplitEase/mobile/src/constants/icons.jsx
// Full icon set — mirrors web Icons util, adapted for react-native-svg

import React from "react";
import Svg, {
  Rect, Path, Circle, Polyline, Line, Ellipse, G,
} from "react-native-svg";

/* ─────────────────────────────────────────────────────────
   Shared stroke props for cleaner JSX below
───────────────────────────────────────────────────────── */
const S = (color, w = "2") => ({
  fill: "none",
  stroke: color,
  strokeWidth: w,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const Icons = {
  /* ── Navigation ── */
  dashboard: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="3" y="3" width="7" height="7" rx="1" />
      <Rect x="14" y="3" width="7" height="7" rx="1" />
      <Rect x="3" y="14" width="7" height="7" rx="1" />
      <Rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
  ),

  expenses: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1="9" y1="13" x2="15" y2="13" />
      <Line x1="9" y1="17" x2="13" y2="17" />
    </Svg>
  ),

  loans: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="5" cy="8" r="3" />
      <Circle cx="19" cy="8" r="3" />
      <Path d="M9 20H5a2 2 0 0 1-2-2v-1a4 4 0 0 1 4-4h1" />
      <Path d="M15 20h4a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-1" />
      <Path d="M12 12v6m-2-2 2 2 2-2" />
    </Svg>
  ),

  groups: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="9" cy="7" r="3" />
      <Path d="M3 20v-1a6 6 0 0 1 6-6" />
      <Circle cx="17" cy="7" r="3" />
      <Path d="M21 20v-1a6 6 0 0 0-6-6H9a6 6 0 0 0-6 6v1" />
    </Svg>
  ),

  settlements: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <Path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </Svg>
  ),

  activity: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  ),

  settings: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  ),

  more: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="12" cy="6" r="1.5" />
      <Circle cx="12" cy="12" r="1.5" />
      <Circle cx="12" cy="18" r="1.5" />
    </Svg>
  ),

  bell: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  ),

  edit: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  ),

  lock: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  ),

  upi: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <Path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </Svg>
  ),

  mail: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Polyline points="22,6 12,13 2,6" />
    </Svg>
  ),

  wallet: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <Path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </Svg>
  ),

  users: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),

  eye: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  ),

  eyeOff: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  ),

  check: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color, "2.5")}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  ),

  back: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  ),

  /* ── Entry-type icons (matches web TYPE_ICONS keys) ── */

  /** personal_expense — receipt/tag icon */
  personalExpense: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M20 12V22H4V12" />
      <Path d="M22 7H2v5h20V7z" />
      <Path d="M12 22V7" />
      <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Svg>
  ),

  /** group_expense — users with rupee */
  groupExpense: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),

  /** settlement — arrows up/down */
  settlement: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <Path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </Svg>
  ),

  /** income — arrow into wallet */
  income: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M12 2v12" />
      <Path d="m8 10 4 4 4-4" />
      <Path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
    </Svg>
  ),

  /** loan_given — hand giving money */
  lendMoney: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <Path d="M12 8v4" />
      <Path d="M10 10h4" />
    </Svg>
  ),

  /** loan_taken — hand receiving money */
  borrowMoney: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  ),

  /** generic trash / delete */
  trash: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  ),

  /** search */
  search: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  ),

  /** chevron left */
  chevronLeft: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color, "2.2")}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  ),

  /** chevron right */
  chevronRight: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color, "2.2")}>
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  ),

  /** plus */
  plus: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  ),

  /** refresh */
  refresh: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M23 4v6h-6" />
      <Path d="M1 20v-6h6" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  ),

  /** invite / user-plus */
  userPlus: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="8.5" cy="7" r="4" />
      <Line x1="20" y1="8" x2="20" y2="14" />
      <Line x1="23" y1="11" x2="17" y2="11" />
    </Svg>
  ),

  /** copy */
  copy: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  ),

  /** external link */
  externalLink: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <Polyline points="15 3 21 3 21 9" />
      <Line x1="10" y1="14" x2="21" y2="3" />
    </Svg>
  ),
};

/* ── Convenience: TYPE_ICONS map matching web app ── */
export const TYPE_ICONS = {
  personal_expense:    { Icon: Icons.personalExpense, bg: "rgba(239,68,68,0.12)",   color: "#f87171"  },
  group_expense:       { Icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "#f87171"  },
  group_expense_owed:  { Icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "#f87171"  },
  settlement_sent:     { Icon: Icons.settlement,      bg: "rgba(239,68,68,0.10)",   color: "#f87171"  },
  income:              { Icon: Icons.income,          bg: "rgba(16,185,129,0.12)",  color: "#10b981"  },
  settlement_received: { Icon: Icons.settlement,      bg: "rgba(99,102,241,0.12)",  color: "#10b981"  },
  loan_given:          { Icon: Icons.lendMoney,       bg: "rgba(245,158,11,0.12)",  color: "#f59e0b"  },
  loan_taken:          { Icon: Icons.borrowMoney,     bg: "rgba(99,102,241,0.12)",  color: "#818cf8"  },
};

export const TYPE_CFG = {
  personal_expense:    { sign: "-", bucket: "spent"    },
  group_expense:       { sign: "-", bucket: "spent"    },
  group_expense_owed:  { sign: "-", bucket: "spent"    },
  settlement_sent:     { sign: "-", bucket: "spent"    },
  income:              { sign: "+", bucket: "received" },
  settlement_received: { sign: "+", bucket: "received" },
  loan_given:          { sign: "-", bucket: "loans"    },
  loan_taken:          { sign: "+", bucket: "loans"    },
};