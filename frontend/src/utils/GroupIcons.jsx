// frontend/src/utils/GroupIcons.jsx
// Unchanged from previous version — keyword-based SVG icon mapping.
// Re-exported here for completeness alongside the updated Groups.jsx.
// Place at: frontend/src/utils/GroupIcons.jsx

export const Icons = {
  Plane: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-2 0-4 1-4 1l-8.8-2.2L4 4.8 11 8 8 11l-3 1 2 3 3-1 3 7z"/>
    </svg>
  ),
  Utensils: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </svg>
  ),
  Home: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  ShoppingBag: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Zap: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Car: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17H5v2H3v-6l2.38-6.34A2 2 0 0 1 7.26 5h9.48a2 2 0 0 1 1.88 1.34L21 13v6h-2v-2z"/>
      <circle cx="7" cy="17" r="2"/>
      <circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  Film: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
      <line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/>
    </svg>
  ),
  Dumbbell: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M3 8h3m12 0h3M3 16h3m12 0h3M9 4h6M9 20h6"/>
    </svg>
  ),
  GraduationCap: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  Heart: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Users: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Building: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
    </svg>
  ),
  Tent: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/>
      <path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>
    </svg>
  ),
  Music: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  ),
};

const KEYWORD_MAP = [
  { keywords: ["trip", "travel", "tour", "flight", "vacation", "holiday", "goa", "mumbai", "delhi", "bangalore", "trek", "road", "train"], icon: "Plane", bg: "rgba(59,130,246,0.18)", color: "#60a5fa" },
  { keywords: ["food", "eat", "lunch", "dinner", "breakfast", "restaurant", "cafe", "coffee", "mess", "canteen", "snack", "meal", "dining", "tiffin"], icon: "Utensils", bg: "rgba(245,158,11,0.18)", color: "#fbbf24" },
  { keywords: ["home", "house", "flat", "hostel", "pg", "room", "rent", "apartment", "block", "dorm", "accommodation", "accomodation", "wing"], icon: "Home", bg: "rgba(16,185,129,0.18)", color: "#34d399" },
  { keywords: ["shop", "shopping", "grocery", "groceries", "market", "store", "kirana", "bigbasket", "zepto", "blinkit"], icon: "ShoppingBag", bg: "rgba(139,92,246,0.18)", color: "#a78bfa" },
  { keywords: ["electricity", "wifi", "internet", "utility", "utilities", "bill", "water", "gas", "phone", "recharge", "broadband"], icon: "Zap", bg: "rgba(234,179,8,0.18)", color: "#facc15" },
  { keywords: ["cab", "car", "uber", "ola", "fuel", "petrol", "auto", "taxi", "transport", "commute", "bike", "rapido"], icon: "Car", bg: "rgba(20,184,166,0.18)", color: "#2dd4bf" },
  { keywords: ["movie", "film", "cinema", "show", "concert", "event", "party", "club", "night", "outing", "fest", "festival"], icon: "Film", bg: "rgba(236,72,153,0.18)", color: "#f472b6" },
  { keywords: ["gym", "sport", "sports", "fitness", "workout", "yoga", "game", "cricket", "football", "badminton", "tennis", "ipl"], icon: "Dumbbell", bg: "rgba(239,68,68,0.18)", color: "#f87171" },
  { keywords: ["college", "school", "study", "course", "education", "class", "project", "assignment", "tuition", "coaching", "sem", "semester"], icon: "GraduationCap", bg: "rgba(99,102,241,0.18)", color: "#818cf8" },
  { keywords: ["wedding", "birthday", "anniversary", "gift", "celebration", "surprise"], icon: "Heart", bg: "rgba(244,63,94,0.18)", color: "#fb7185" },
  { keywords: ["office", "work", "business", "company", "corporate", "meeting", "conference", "internship"], icon: "Building", bg: "rgba(71,85,105,0.22)", color: "#94a3b8" },
  { keywords: ["camp", "camping", "hiking", "hike", "outdoor", "nature", "forest", "mountain"], icon: "Tent", bg: "rgba(34,197,94,0.18)", color: "#4ade80" },
  { keywords: ["music", "band", "playlist", "concert", "festival"], icon: "Music", bg: "rgba(168,85,247,0.18)", color: "#c084fc" },
];

const DEFAULT = { icon: "Users", bg: "rgba(37,99,235,0.18)", color: "#60a5fa" };

export function getGroupIcon(groupName = "") {
  const lower = groupName.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { IconComponent: Icons[entry.icon], bg: entry.bg, color: entry.color };
    }
  }
  return { IconComponent: Icons[DEFAULT.icon], bg: DEFAULT.bg, color: DEFAULT.color };
}