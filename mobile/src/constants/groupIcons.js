// mobile/src/constants/groupIcons.js
//
// USED IN:
//   - GroupsScreen.jsx     → GroupAvatar (group list cards)
//   - DashboardScreen.jsx  → GroupRow (recent groups on the dashboard)
//
// KEEP IN SYNC WITH: web/src/constants/groupIcons.js
// KEYWORD_MAP and DEFAULT must stay identical on both platforms — this
// isn't imported from a shared module (mobile's Metro / web's Vite aren't
// configured to resolve outside their own project root yet), so any
// change to keywords/icons/colors here needs the same edit made there.


import {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building2, Tent, Music, Users,
} from "lucide-react-native";
import { resolveGroupIcon } from "@splitease/shared";

// Icon *components* stay local — lucide-react-native is RN-only.
// Keyword-matching logic itself now lives in @splitease/shared
// (mobile's version was canonical — web's was missing `matched`).
const ICONS = {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building: Building2, Tent, Music, Users,
};

export function getGroupIcon(groupName = "") {
  const { icon, bg, color, matched } = resolveGroupIcon(groupName);
  return { IconComponent: ICONS[icon], bg, color, matched };
}