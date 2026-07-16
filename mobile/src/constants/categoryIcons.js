// mobile/src/constants/categoryIcons.js
//
// Icon + color resolution for individual expense line items — used by
// GroupDetailScreen's ledger (CategoryIcon) and, for personal/group
// expense entries only, by ExpensesScreen/ActivityScreen's timeline
// rows. Two layers, most specific wins:
//
//   1. KEYWORD_MAP     — scans category/subcategory/description text
//      for specific merchants or bill types (e.g. "Spotify", "wifi",
//      "maid") and returns a closely-matching generic icon.
//   2. CATEGORY_ICONS  — exact match on the fixed category names the
//      backend assigns (Travel, Food & Dining, Utilities, ...), used
//      when nothing more specific is found.
//
// NOTE: lucide-react-native ships generic outline icons only, not
// trademarked brand logos. "Spotify"/"Apple Music" resolve to a music
// note, "Netflix"/"Prime Video" to a TV icon, "Amazon"/"Flipkart" to a
// shopping bag, etc. — recognizable without reproducing anyone's logo.

import {
  Plane, Building2, UtensilsCrossed, Ticket, Zap, ShoppingBasket,
  ShoppingBag, Car, Film, HeartPulse, Music, Tv, Wifi, Droplet,
  Sparkles, Bus, TrainFront, GraduationCap, Dumbbell, Receipt,
} from "lucide-react-native";

// ── Layer 2 (checked last): fixed category name → icon ───────────────────
export const CATEGORY_ICONS = {
  "Travel":        { Icon: Plane,           color: "#60a5fa" },
  "Accommodation": { Icon: Building2,       color: "#a78bfa" },
  "Food & Dining": { Icon: UtensilsCrossed, color: "#fb923c" },
  "Activities":    { Icon: Ticket,          color: "#facc15" },
  "Utilities":     { Icon: Zap,             color: "#fde047" },
  "Groceries":     { Icon: ShoppingBasket,  color: "#4ade80" },
  "Shopping":      { Icon: ShoppingBag,     color: "#f472b6" },
  "Transport":     { Icon: Car,             color: "#38bdf8" },
  "Entertainment": { Icon: Film,            color: "#c084fc" },
  "Health":        { Icon: HeartPulse,      color: "#f87171" },
};

// ── Layer 1 (checked first): keyword scan for finer-grained icons ────────
const KEYWORD_MAP = [
  { keywords: ["spotify", "apple music", "gaana", "jiosaavn", "wynk", "music subscription"], Icon: Music, color: "#4ade80" },
  { keywords: ["netflix", "prime video", "hotstar", "disney", "sonyliv", "zee5", "youtube premium", "streaming"], Icon: Tv, color: "#f87171" },
  { keywords: ["wifi", "broadband", "internet", "router"], Icon: Wifi, color: "#38bdf8" },
  { keywords: ["electricity", "power bill", "eb bill"], Icon: Zap, color: "#fde047" },
  { keywords: ["water bill", "water can", "water supply"], Icon: Droplet, color: "#38bdf8" },
  { keywords: ["maid", "cook", "cleaning", "housekeeping", "laundry", "ironing"], Icon: Sparkles, color: "#4ade80" },
  { keywords: ["zomato", "swiggy", "food", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "snack", "tiffin", "mess", "canteen", "pizza", "burger"], Icon: UtensilsCrossed, color: "#fb923c" },
  { keywords: ["metro", "local train", "bus"], Icon: Bus, color: "#38bdf8" },
  { keywords: ["train", "railway", "irctc"], Icon: TrainFront, color: "#60a5fa" },
  { keywords: ["flight", "airport", "airline", "travel", "trip", "vacation", "holiday"], Icon: Plane, color: "#60a5fa" },
  { keywords: ["cab", "taxi", "uber", "ola", "rapido", "auto", "fuel", "petrol", "diesel", "parking", "toll", "commute"], Icon: Car, color: "#38bdf8" },
  { keywords: ["amazon", "flipkart", "myntra", "shopping", "grocery", "groceries", "market", "bigbasket", "zepto", "blinkit"], Icon: ShoppingBag, color: "#f472b6" },
  { keywords: ["movie", "cinema", "concert", "event", "show"], Icon: Film, color: "#c084fc" },
  { keywords: ["doctor", "medical", "medicine", "pharmacy", "hospital", "clinic"], Icon: HeartPulse, color: "#f87171" },
  { keywords: ["college", "school", "course", "tuition", "coaching", "exam"], Icon: GraduationCap, color: "#818cf8" },
  { keywords: ["gym", "workout", "fitness", "yoga", "sport"], Icon: Dumbbell, color: "#f87171" },
];

/**
 * Personal/group expense timeline labels are formatted "Spent on
 * <Category>" by the backend. This pulls the category text back out
 * so callers (ExpensesScreen, ActivityScreen) can pass the real
 * category to getExpenseIcon instead of relying on the free-text
 * note alone. Returns "" if the label doesn't match that pattern.
 */
export function extractCategoryFromLabel(label = "") {
  const match = label.match(/^Spent on (.+)$/i);
  return match ? match[1] : "";
}

/**
 * Resolves the best icon/color for an expense line item.
 *
 *   1. category + subcategory text vs. KEYWORD_MAP  (authoritative)
 *   2. exact CATEGORY_ICONS[category] match          (authoritative)
 *   3. description text vs. KEYWORD_MAP              (best-effort)
 *   4. generic receipt icon                          (fallback)
 */
export function getExpenseIcon({ category, subcategory, description } = {}) {
  const categoryText = `${category || ""} ${subcategory || ""}`.toLowerCase().trim();
  const noteText = `${description || ""}`.toLowerCase().trim();

  if (categoryText) {
    for (const entry of KEYWORD_MAP) {
      if (entry.keywords.some((kw) => categoryText.includes(kw))) {
        return { Icon: entry.Icon, color: entry.color };
      }
    }
  }

  if (category && CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category];
  }

  if (noteText) {
    for (const entry of KEYWORD_MAP) {
      if (entry.keywords.some((kw) => noteText.includes(kw))) {
        return { Icon: entry.Icon, color: entry.color };
      }
    }
  }

  return { Icon: Receipt, color: "#8892b0" };
}