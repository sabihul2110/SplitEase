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
  ShoppingBag, Car, Film, HeartPulse, Music, Tv, Wifi, Droplet,
  Sparkles, Bus, TramFront, TrainFront, Ship, GraduationCap, Dumbbell, Receipt,
} from "lucide-react-native";

// ── Fixed-category fallback (checked after keyword matching) ─────────────
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

// ── Tier 1: safe to match against the user's free-text note ──────────────
const SPECIFIC_KEYWORDS = [
  { keywords: ["spotify", "apple music", "gaana", "jiosaavn", "wynk"], Icon: Music, color: "#4ade80" },
  { keywords: ["netflix", "prime video", "hotstar", "disney", "sonyliv", "zee5", "youtube premium"], Icon: Tv, color: "#f87171" },
  { keywords: ["wifi", "broadband", "internet", "router"], Icon: Wifi, color: "#38bdf8" },
  { keywords: ["electricity", "power bill", "eb bill"], Icon: Zap, color: "#fde047" },
  { keywords: ["water bill", "water can", "water supply"], Icon: Droplet, color: "#38bdf8" },
  { keywords: ["maid", "cook", "cleaning", "housekeeping", "laundry", "ironing"], Icon: Sparkles, color: "#4ade80" },
  { keywords: ["zomato", "swiggy", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "snack", "tiffin", "mess", "canteen", "pizza", "burger", "biryani"], Icon: UtensilsCrossed, color: "#fb923c" },
  { keywords: ["metro", "tram", "subway"], Icon: TramFront, color: "#a78bfa" },
  { keywords: ["bus", "local bus"], Icon: Bus, color: "#38bdf8" },
  { keywords: ["train", "railway", "irctc"], Icon: TrainFront, color: "#60a5fa" },
  { keywords: ["flight", "airport", "airline"], Icon: Plane, color: "#60a5fa" },
  { keywords: ["ship", "ferry", "cruise", "boat"], Icon: Ship, color: "#38bdf8" },
  { keywords: ["cab", "taxi", "uber", "ola", "rapido", "auto", "fuel", "petrol", "diesel", "parking", "toll"], Icon: Car, color: "#38bdf8" },
  { keywords: ["amazon", "flipkart", "myntra", "bigbasket", "zepto", "blinkit"], Icon: ShoppingBag, color: "#f472b6" },
  { keywords: ["doctor", "medical", "medicine", "pharmacy", "hospital", "clinic"], Icon: HeartPulse, color: "#f87171" },
  { keywords: ["gym", "workout", "fitness", "yoga"], Icon: Dumbbell, color: "#f87171" },
];

// ── Tier 2: category-text only — never matched against the free note ─────
const BROAD_KEYWORDS = [
  { keywords: ["travel", "trip", "vacation", "holiday"], Icon: Plane, color: "#60a5fa" },
  { keywords: ["college", "school", "course", "tuition", "coaching", "sem", "semester", "exam"], Icon: GraduationCap, color: "#818cf8" },
  { keywords: ["movie", "cinema", "concert", "event", "show"], Icon: Film, color: "#c084fc" },
  { keywords: ["shopping", "grocery", "groceries", "market"], Icon: ShoppingBag, color: "#f472b6" },
];

function matchKeywords(text, list) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const entry of list) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry;
  }
  return null;
}

/**
 * Personal/group expense timeline labels are formatted "Spent on
 * <Category>" by the backend. Pulls the category text back out so
 * callers can pass the real category to getExpenseIcon.
 */
export function extractCategoryFromLabel(label = "") {
  const match = label.match(/^Spent on (.+)$/i);
  return match ? match[1] : "";
}

/**
 * Resolves the best icon/color for an expense line item.
 *
 *   1. NOTE text     vs SPECIFIC_KEYWORDS only  (e.g. "Metro" → Bus,
 *      refining a broad "Travel" category down to the actual mode)
 *   2. CATEGORY text vs SPECIFIC + BROAD        (the authoritative
 *      classification the user picked)
 *   3. Exact CATEGORY_ICONS[category] match
 *   4. Generic receipt icon
 *
 * Step 1 deliberately excludes BROAD_KEYWORDS — a note like "College"
 * under a "Travel" category must never hijack the icon; only the
 * category itself can trigger a broad-keyword match.
 */
export function getExpenseIcon({ category, subcategory, description } = {}) {
  const categoryText = `${category || ""} ${subcategory || ""}`.trim();
  const noteText = `${description || ""}`.trim();

  let hit = matchKeywords(noteText, SPECIFIC_KEYWORDS);
  if (hit) return { Icon: hit.Icon, color: hit.color };

  hit = matchKeywords(categoryText, [...SPECIFIC_KEYWORDS, ...BROAD_KEYWORDS]);
  if (hit) return { Icon: hit.Icon, color: hit.color };

  if (category && CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category];
  }

  return { Icon: Receipt, color: "#8892b0" };
}