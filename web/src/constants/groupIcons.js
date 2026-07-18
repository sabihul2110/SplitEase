// web/src/constants/groupIcons.js
//
// Keyword → icon/color mapping for group cards (Groups.jsx, Dashboard.jsx).
// Ported from utils/GroupIcons.jsx: same keyword-matching logic, but icons
// now come from lucide-react instead of ~120 lines of hand-drawn SVG paths.
//
// KEEP IN SYNC WITH: mobile/src/constants/groupIcons.js
// KEYWORD_MAP and DEFAULT must stay identical on both platforms — this
// isn't imported from a shared module (mobile's Metro / web's Vite aren't
// configured to resolve outside their own project root yet), so any
// change to keywords/icons/colors here needs the same edit made there.

import {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building2, Tent, Music, Users,
} from "lucide-react";
import { resolveGroupIcon } from "@splitease/shared";

// Icon components stay local (lucide-react vs lucide-react-native).
// Matching logic now shared — this also fixes a real gap: web previously
// never returned `matched`, mobile always did. Both now return it.
const ICONS = {
  Plane, Utensils, Home, ShoppingBag, Zap, Car, Film,
  Dumbbell, GraduationCap, Heart, Building: Building2, Tent, Music, Users,
};

export function getGroupIcon(groupName = "") {
  const { icon, bg, color, matched } = resolveGroupIcon(groupName);
  return { IconComponent: ICONS[icon], bg, color, matched };
}