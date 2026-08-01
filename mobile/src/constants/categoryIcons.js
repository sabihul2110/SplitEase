// mobile/src/constants/categoryIcons.js
//
// USED IN:
//   - GroupDetailScreen.jsx  → CategoryIcon (per-expense icon in a group's ledger)
//   - ExpensesScreen.jsx     → EntryRow (personal_expense / group_expense rows)
//   - ActivityScreen.jsx     → ActivityRow (personal_expense / group_expense rows)
//
// Resolves an icon + color for a single expense line item, using the
// category the user picked (authoritative) plus an optional free-text
// note/description (a hint, not authoritative).
//
// Two-tier keyword system — this split exists to fix a real bug:
//   SPECIFIC_KEYWORDS  — safe to match against the free-text NOTE.
//                        Brand names and precise transit/service words
//                        ("Metro", "Netflix", "Spotify") are specific
//                        enough that matching them in a casual note is
//                        very unlikely to be a false positive.
//   BROAD_KEYWORDS     — only matched against the CATEGORY text, never
//                        the note. Words like "college" or "shopping"
//                        are common enough that they could appear in
//                        an unrelated note (e.g. a "Travel" expense
//                        noted "College" was previously mis-matching
//                        to a graduation cap icon). Restricting these
//                        to category-only matching fixes that while
//                        still letting a genuinely-categorized
//                        "College" expense show the right icon.

import {
  Plane, Building2, UtensilsCrossed, Ticket, Zap, ShoppingBasket,
  ShoppingBag, Car, Film, HeartPulse, Wifi, Droplet, Home,
  Sparkles, Bus, TrainFront, GraduationCap, Dumbbell, Receipt, Ship,
  Stethoscope, Pill, Hospital,
} from "lucide-react-native";
import { resolveExpenseIcon, extractCategoryFromLabel } from "@splitease/shared";

// Icon *components* stay local (lucide-react-native). Matching logic
// (keywords, categories, brand detection) now lives in @splitease/shared.
const ICON_COMPONENTS = {
  Plane, Building2, UtensilsCrossed, Ticket, Zap, ShoppingBasket,
  ShoppingBag, Car, Film, HeartPulse, Wifi, Droplet, Home,
  Sparkles, Bus, TrainFront, GraduationCap, Dumbbell, Receipt, Ship,
  Stethoscope, Pill, Hospital,
};

export { extractCategoryFromLabel };

// Used by AddGroupExpenseScreen.jsx / AddExpenseScreen.jsx for the
// category-picker chips (icon + color per category name), independent
// of the per-line-item resolveExpenseIcon() logic above.
export const CATEGORY_ICONS = {
  "Travel":          { Icon: Plane,           color: "#3b82f6" },
  "Accommodation":   { Icon: Building2,       color: "#8b5cf6" },
  "Food & Dining":   { Icon: UtensilsCrossed, color: "#f59e0b" },
  "Activities":      { Icon: Ticket,          color: "#ec4899" },
  "Utilities":       { Icon: Zap,             color: "#eab308" },
  "Groceries":       { Icon: ShoppingBasket,  color: "#10b981" },
  "Shopping":        { Icon: ShoppingBag,     color: "#f97316" },
  "Transport":       { Icon: Car,             color: "#06b6d4" },
  "Entertainment":   { Icon: Film,            color: "#c084fc" },
  "Health & Medical":{ Icon: HeartPulse,      color: "#f87171" },
  "Education":       { Icon: GraduationCap,   color: "#818cf8" },
  "Miscellaneous":   { Icon: Receipt,         color: "#9ca3af" },
};

/**
 * Resolves the best icon/color for an expense line item. Same public
 * shape as before this refactor: { brand, color } for brand hits,
 * { Icon, color } for keyword/category hits.
 */
export function getExpenseIcon({ category, subcategory, description } = {}) {
  const result = resolveExpenseIcon({ category, subcategory, description });
  if (result.kind === "brand") {
    return { brand: result.brand, color: result.color };
  }
  return { Icon: ICON_COMPONENTS[result.icon] || Receipt, color: result.color };
}