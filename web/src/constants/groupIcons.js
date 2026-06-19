// web/src/constants/groupIcons.js
//
// Keyword → icon/color mapping for group cards (Groups.jsx, Dashboard.jsx).
// Ported from utils/GroupIcons.jsx: same keyword-matching logic, but icons
// now come from lucide-react instead of ~120 lines of hand-drawn SVG paths.

import {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building2, Tent, Music, Users,
} from "lucide-react";

const ICONS = {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building: Building2, Tent, Music, Users,
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
      return { IconComponent: ICONS[entry.icon], bg: entry.bg, color: entry.color };
    }
  }
  return { IconComponent: ICONS[DEFAULT.icon], bg: DEFAULT.bg, color: DEFAULT.color };
}