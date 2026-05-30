// SplitEase/mobile/src/constants/icons.jsx

import React from "react";
import Svg, { Rect, Path, Circle, Polyline, Line, Ellipse, G, Defs, LinearGradient, Stop } from "react-native-svg";

const S = (color, w = "2") => ({
  fill: "none", stroke: color, strokeWidth: w,
  strokeLinecap: "round", strokeLinejoin: "round",
});

export const Icons = {
  // ── Navigation ──────────────────────────────────────────────────────────
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
  // Filled circle with check — for success states
  checkCircle: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  ),
  back: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  ),
  moon: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  ),
  logout: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  ),

  // ── Empty state illustrations ─────────────────────────────────────────────
  // Inbox zero — for empty ledger
  inboxZero: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <Path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Svg>
  ),
  // Sparkle / all-clear star
  sparkle: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </Svg>
  ),
  // Users with plus — empty groups
  usersPlus: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="8.5" cy="7" r="4" />
      <Line x1="20" y1="8" x2="20" y2="14" />
      <Line x1="23" y1="11" x2="17" y2="11" />
    </Svg>
  ),
  // Receipt — transactions
  receipt: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <Path d="M16 8h-8" />
      <Path d="M16 12h-8" />
      <Path d="M10 16H8" />
    </Svg>
  ),

  // ── Entry-type icons ──────────────────────────────────────────────────────
  personalExpense: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <Path d="M16 8h-8" />
      <Path d="M16 12h-8" />
      <Path d="M10 16H8" />
    </Svg>
  ),
  groupExpense: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  settlement: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <Path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </Svg>
  ),
  income: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M12 2v12" />
      <Path d="m8 10 4 4 4-4" />
      <Path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
    </Svg>
  ),
  lendMoney: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="12" cy="18" r="4" />
      <Path d="M12 14V2" />
      <Path d="M7 7l5-5 5 5" />
    </Svg>
  ),
  borrowMoney: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="12" cy="18" r="4" />
      <Path d="M12 2v12" />
      <Path d="M7 9l5 5 5-5" />
    </Svg>
  ),
  trash: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  ),
  search: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  ),
  chevronLeft: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color, "2.2")}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  ),
  chevronRight: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color, "2.2")}>
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  ),
  plus: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  ),
  refresh: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M23 4v6h-6" />
      <Path d="M1 20v-6h6" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  ),
  userPlus: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="8.5" cy="7" r="4" />
      <Line x1="20" y1="8" x2="20" y2="14" />
      <Line x1="23" y1="11" x2="17" y2="11" />
    </Svg>
  ),
  copy: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  ),
  externalLink: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <Polyline points="15 3 21 3 21 9" />
      <Line x1="10" y1="14" x2="21" y2="3" />
    </Svg>
  ),

  // ── Category icons ────────────────────────────────────────────────────────
  travel: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </Svg>
  ),
  accommodation: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  ),
  foodDining: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <Line x1="6" y1="1" x2="6" y2="4" />
      <Line x1="10" y1="1" x2="10" y2="4" />
      <Line x1="14" y1="1" x2="14" y2="4" />
    </Svg>
  ),
  activities: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
  utilities: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="9" y1="18" x2="15" y2="18" />
      <Line x1="10" y1="22" x2="14" y2="22" />
      <Path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </Svg>
  ),
  groceries: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>
  ),
  shopping: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <Line x1="7" y1="7" x2="7.01" y2="7" />
    </Svg>
  ),
  transport: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="1" y="3" width="15" height="13" rx="2" />
      <Path d="M16 8h4l3 3v5h-7V8z" />
      <Circle cx="5.5" cy="18.5" r="2.5" />
      <Circle cx="18.5" cy="18.5" r="2.5" />
    </Svg>
  ),
  entertainment: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <Line x1="7" y1="2" x2="7" y2="22" />
      <Line x1="17" y1="2" x2="17" y2="22" />
      <Line x1="2" y1="12" x2="22" y2="12" />
      <Line x1="2" y1="7" x2="7" y2="7" />
      <Line x1="2" y1="17" x2="7" y2="17" />
      <Line x1="17" y1="17" x2="22" y2="17" />
      <Line x1="17" y1="7" x2="22" y2="7" />
    </Svg>
  ),
  bellOff: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <Path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <Path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <Path d="M18 8a6 6 0 0 0-9.33-5" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  ),
  checkSquare: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="9 11 12 14 22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Svg>
  ),
  square: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </Svg>
  ),
  calendarDays: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  ),
  
  health: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  ),

  close: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  ),

  // sendMoney: ({ size = 24, color = "currentColor" }) => (
  //   <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
  //     {/* Outer card with gap at the top right */}
  //     <Path d="M12 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6" />
      
  //     {/* Upward outgoing arrow */}
  //     <Path d="M18 9V2" />
  //     <Polyline points="14 6 18 2 22 6" />
      
  //     {/* Indian Rupee Symbol */}
  //     <Path d="M7 8h6" />
  //     <Path d="M7 12h5" />
  //     <Path d="M9 8c3 0 3 5 0 5H7l4.5 4.5" />
  //   </Svg>
  // ),

  sendMoney: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      {/* Expanded box with top-right gap */}
      <Path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      
      {/* Outward/Upward Arrow (Detached) */}
      <Path d="M19 10V2" />
      <Polyline points="15 6 19 2 23 6" />
      
      {/* Centered Rupee with spacious padding */}
      <Path d="M8 8.5h6" />
      <Path d="M8 11.5h4.5" />
      <Path d="M9.5 8.5c3 0 3 3 0 3" />
      <Path d="M9.5 11.5l4 4.5" />
    </Svg>
  ),

  // receiveMoney: ({ size = 24, color = "currentColor" }) => (
  //   <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
  //     {/* Outer card with gap at the top right */}
  //     <Path d="M12 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6" />
      
  //     {/* Downward incoming arrow */}
  //     <Path d="M18 2v9" />
  //     <Polyline points="14 7 18 11 22 7" />
      
  //     {/* Indian Rupee Symbol */}
  //     <Path d="M7 8h6" />
  //     <Path d="M7 12h5" />
  //     <Path d="M9 8c3 0 3 5 0 5H7l4.5 4.5" />
  //   </Svg>
  // ),

  receiveMoney: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      {/* Expanded box with top-right gap */}
      <Path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      
      {/* Inward/Downward Arrow (Detached) */}
      <Path d="M19 2v8" />
      <Polyline points="15 6 19 10 23 6" />
      
      {/* Centered Rupee with spacious padding */}
      <Path d="M8 8.5h6" />
      <Path d="M8 11.5h4.5" />
      <Path d="M9.5 8.5c3 0 3 3 0 3" />
      <Path d="M9.5 11.5l4 4.5" />
    </Svg>
  ),

  paymentSettled: ({ size = 24, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      {/* Outer scalloped badge */}
      <Path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.76Z" />
      
      {/* Inner circle */}
      <Circle cx="12" cy="12" r="5.5" />
      
      {/* Checkmark */}
      <Polyline points="10 12 11.5 13.5 14.5 10.5" />
    </Svg>
  ),

  paymentSettledFilled: ({ size = 24, color = "currentColor", bgColor = "#0f172a" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Solid filled badge */}
      <Path 
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.76Z" 
        fill={color} 
      />
      
      {/* Inverted inner circle */}
      <Circle 
        cx="12" cy="12" r="5.8" 
        fill="none" stroke={bgColor} strokeWidth="2" 
      />
      
      {/* Inverted checkmark */}
      <Polyline 
        points="10 12 11.5 13.5 14.5 10.5" 
        fill="none" stroke={bgColor} strokeWidth="2" 
        strokeLinecap="round" strokeLinejoin="round" 
      />
    </Svg>
  ),

  sortNewest: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="3" y1="6" x2="13" y2="6" />
      <Line x1="3" y1="12" x2="11" y2="12" />
      <Line x1="3" y1="18" x2="9" y2="18" />
      <Path d="M17 3v18" />
      <Path d="M13 7l4-4 4 4" />
    </Svg>
  ),
  sortOldest: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Line x1="3" y1="6" x2="13" y2="6" />
      <Line x1="3" y1="12" x2="11" y2="12" />
      <Line x1="3" y1="18" x2="9" y2="18" />
      <Path d="M17 3v18" />
      <Path d="M13 17l4 4 4-4" />
    </Svg>
  ),

  info: ({ size = 20, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...S(color)}>
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="12" y1="12" x2="12" y2="16" />
    </Svg>
  ),

};

export const TYPE_ICONS = {
  personal_expense:    { Icon: Icons.personalExpense, bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  group_expense:       { Icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "#f87171" },
  group_expense_owed:  { Icon: Icons.groupExpense,    bg: "rgba(37,99,235,0.12)",   color: "#f87171" },
  settlement_sent:     { Icon: Icons.paymentSettled,      bg: "rgba(239,68,68,0.10)",   color: "#f87171" },
  income:              { Icon: Icons.income,          bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  settlement_received: { Icon: Icons.paymentSettled,      bg: "rgba(99,102,241,0.12)",  color: "#10b981" },
  loan_given:          { Icon: Icons.lendMoney,       bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  loan_taken:          { Icon: Icons.borrowMoney,     bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
};

export const CATEGORY_ICONS = {
  'Travel':        { Icon: Icons.travel,        color: "#60a5fa" },
  'Accommodation': { Icon: Icons.accommodation, color: "#a78bfa" },
  'Food & Dining': { Icon: Icons.foodDining,    color: "#fb923c" },
  'Activities':    { Icon: Icons.activities,    color: "#facc15" },
  'Utilities':     { Icon: Icons.utilities,     color: "#fde047" },
  'Groceries':     { Icon: Icons.groceries,     color: "#4ade80" },
  'Shopping':      { Icon: Icons.shopping,      color: "#f472b6" },
  'Transport':     { Icon: Icons.transport,     color: "#38bdf8" },
  'Entertainment': { Icon: Icons.entertainment, color: "#c084fc" },
  'Health':        { Icon: Icons.health,        color: "#f87171" },
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