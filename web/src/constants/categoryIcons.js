// web/src/constants/categoryIcons.js
//
// USED IN: wherever expense rows render on web (Expenses.jsx, Activity.jsx,
// GroupDetail.jsx) — mirrors mobile/src/constants/categoryIcons.js exactly.
// This is a NEW feature for web; matching logic is shared via
// @splitease/shared, only the icon components differ (lucide-react here).

import {
  Plane, Building2, UtensilsCrossed, Ticket, Zap, ShoppingBasket,
  ShoppingBag, Car, Film, HeartPulse, Wifi, Droplet, Home,
  Sparkles, Bus, TrainFront, GraduationCap, Dumbbell, Receipt, Ship
} from "lucide-react";
import { resolveExpenseIcon, extractCategoryFromLabel } from "@splitease/shared";

const ICON_COMPONENTS = {
  Plane, Building2, UtensilsCrossed, Ticket, Zap, ShoppingBasket,
  ShoppingBag, Car, Film, HeartPulse, Wifi, Droplet, Home,
  Sparkles, Bus, TrainFront, GraduationCap, Dumbbell, Receipt, Ship,
};

export { extractCategoryFromLabel };

export function getExpenseIcon({ category, subcategory, description } = {}) {
  const result = resolveExpenseIcon({ category, subcategory, description });
  if (result.kind === "brand") {
    return { brand: result.brand, color: result.color };
  }
  return { Icon: ICON_COMPONENTS[result.icon] || Receipt, color: result.color };
}