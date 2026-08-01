/**
 * shared/constants.js
 *
 * Source of truth for constants shared between web and mobile.
 *
 * USAGE:
 *   Web:    import { COLORS, CATEGORIES } from '../../shared/constants'
 *   Mobile: import { COLORS, CATEGORIES } from '../../shared/constants'

 */

// ── Design tokens ─────────────────────────────────────────────────────────
// Canonical theme — mirrors mobile/src/constants/theme.js exactly
// (the more complete of the two prior versions). Both platforms now
// import from here; mobile adds TAB_BAR_HEIGHT locally (RN-only, not
// shareable), web has no platform-only additions.
export const COLORS = {
  bg:       '#0d0e14',
  surface:  '#13141c',
  surface2: '#1a1c26',
  surface3: '#21232f',
  border:   '#252730',
  border2:  '#31333f',
  primary:  '#2563eb',
  primaryH: '#3b82f6',
  success:  '#10b981',
  danger:   '#ef4444',
  warning:  '#f59e0b',
  moneyOut: '#f87171',
  moneyIn:  '#34d399',
  text:     '#f0f1f5',
  text2:    '#9095a8',
  text3:    '#4e5260',
  white:    '#ffffff',
  black:    '#000000',
  transparent: 'transparent',
};

export const FONT_SIZE = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   16,
  xl:   18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
};

export const FONT_WEIGHT = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold:'800',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 4,
  },
};

// Avatar palette — web's original comment noted this should replace
// copy-pasted AVATAR_COLORS/AVATAR_PALETTE arrays in Ui.jsx (mobile),
// Groups.jsx, Loans.jsx, People.jsx. Not verified whether that
// consolidation happened — out of scope for this pass, flagging only.
export const AVATAR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f43f5e', '#14b8a6',
];

// ── Group icon matching (canonical, mirrors mobile's version) ────────────
// Icon *components* stay platform-local (lucide-react-native vs
// lucide-react are different packages) — only the keyword-matching
// logic and data are shared. Each platform maps the returned icon-name
// string to its own local component via a small ICONS lookup object.
export const GROUP_ICON_KEYWORD_MAP = [
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

export const GROUP_ICON_DEFAULT = { icon: "Users", bg: "rgba(37,99,235,0.18)", color: "#60a5fa" };

/**
 * Pure keyword-matching logic, platform-agnostic. Returns an icon *name*
 * (string key into each platform's local ICONS map), not a component.
 * Includes `matched` — mobile's version already returned this; web's
 * did not, which was a real inconsistency now fixed by sharing one
 * implementation.
 */
export function resolveGroupIcon(groupName = "") {
  const lower = groupName.toLowerCase();
  for (const entry of GROUP_ICON_KEYWORD_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { icon: entry.icon, bg: entry.bg, color: entry.color, matched: true };
    }
  }
  return { icon: GROUP_ICON_DEFAULT.icon, bg: GROUP_ICON_DEFAULT.bg, color: GROUP_ICON_DEFAULT.color, matched: false };
}

// ── API ───────────────────────────────────────────────────────────────────
export const BASE_URL    = 'https://splitease-kfda.onrender.com';
export const STORAGE_KEY = 'splitease_user'; // AsyncStorage / localStorage key

// ── Expense categories (matches DB seed data, sql/schema.sql) ─────────────

export const CATEGORIES = [
  { id: 1,  name: 'Travel' },
  { id: 2,  name: 'Accommodation' },
  { id: 3,  name: 'Food & Dining' },
  { id: 4,  name: 'Activities' },
  { id: 5,  name: 'Utilities' },
  { id: 6,  name: 'Groceries' },
  { id: 7,  name: 'Shopping' },
  { id: 8,  name: 'Entertainment' },
  { id: 9,  name: 'Health & Medical' },
  { id: 10, name: 'Education' },
  { id: 11, name: 'Miscellaneous' },
];

// ── Roles ─────────────────────────────────────────────────────────────────
export const ROLES = {
  USER:  'user',
  ADMIN: 'admin',
};

// ── Split types ───────────────────────────────────────────────────────────
export const SPLIT_TYPES = {
  EQUAL:  'equal',
  CUSTOM: 'custom',
};

// ── Notification types ────────────────────────────────────────────────────
export const NOTIF_TYPES = {
  REMINDER: 'reminder',
  PAYMENT:  'payment',
  EXPENSE:  'expense',
  GENERAL:  'general',
};

// ── Formatting helpers (pure functions, no platform dependencies) ─────────
export function formatAmount(amount, decimals = 2) {
  return `₹${Math.abs(parseFloat(amount) || 0).toFixed(decimals)}`;
}

export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  const defaults = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-IN', { ...defaults, ...options });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'Just now';
}

export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

// ── Validation helpers ────────────────────────────────────────────────────
export function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

export function isValidAmount(value) {
  const n = parseFloat(value);
  return !isNaN(n) && n > 0;
}

// endpoints.js is a separate file for organization, but shared/package.json's
// "main" field points only at this file (constants.js) — so anything in
// endpoints.js needs to be re-exported here to actually be reachable via
// `import { ... } from '@splitease/shared'`.
export * from './endpoints.js';


// ── Brand icons (Simple Icons CDN — cdn.simpleicons.org) ──────────────────
// Pure data only. Rendering differs per platform: mobile uses SvgUri
// (react-native-svg), web uses a plain <img> tag — see each platform's
// components/icons/BrandIcon.jsx.
export const BRAND_SLUGS = {
  spotify:    'spotify',
  applemusic: 'applemusic',
  netflix:    'netflix',
  youtube:    'youtube',
  amazon:     'amazon',
  zomato:     'zomato',
  swiggy:     'swiggy',
  uber:       'uber',
  blinkit:    'blinkit', // unverified Simple Icons slug — BrandIcon's
                         // onError already falls back to a letter badge,
                         // so worst case it just shows a "B" badge instead
                         // of the real logo. Test it once and swap/remove
                         // if the CDN doesn't have it.
};

// Approximate brand tints for background chips only — not the logo itself
// (the CDN always serves real official colors).
export const BRAND_TINTS = {
  spotify:    '#1DB954',
  applemusic: '#FA243C',
  netflix:    '#E50914',
  youtube:    '#FF0000',
  amazon:     '#FF9900',
  zomato:     '#E23744',
  swiggy:     '#FC8019',
  uber:       '#000000',
  blinkit:    '#F8CB46',
};

export function isBrandSupported(key) {
  return !!BRAND_SLUGS[key];
}

// ── Expense/category icon resolution (canonical, mirrors mobile's
// categoryIcons.js — the only platform with this feature until now) ───────
// Returns icon *names* (strings), never components — each platform maps
// the name to its own local lucide component. This is the same split
// used for group icons: matching logic shared, rendering local.

export const EXPENSE_CATEGORY_ICON_MAP = {
  "Travel":        { icon: "Plane",           color: "#60a5fa" },
  "Accommodation": { icon: "Building2",       color: "#a78bfa" },
  "Food & Dining": { icon: "UtensilsCrossed", color: "#fb923c" },
  "Activities":    { icon: "Ticket",          color: "#facc15" },
  "Utilities":     { icon: "Zap",             color: "#fde047" },
  "Groceries":     { icon: "ShoppingBasket",  color: "#4ade80" },
  "Shopping":      { icon: "ShoppingBag",     color: "#f472b6" },
  "Transport":       { icon: "Car",             color: "#38bdf8" },
  "Entertainment":   { icon: "Film",            color: "#c084fc" },
  "Health & Medical":{ icon: "HeartPulse",      color: "#f87171" },
};

// Tier 0: brand keywords, matched against note OR category text.
// NOTE: "jiosaavn" has never actually matched anything — mobile's
// BRAND_SLUGS/BRAND_TINTS never included a "jiosaavn" entry, so
// isBrandSupported("jiosaavn") is always false and this keyword silently
// falls through to keyword/category matching instead. Pre-existing
// behavior on mobile, preserved as-is here — not something introduced
// by this port, just carried over faithfully.
export const EXPENSE_BRAND_KEYWORDS = [
  { keywords: ["spotify"], brand: "spotify" },
  { keywords: ["apple music"], brand: "applemusic" },
  { keywords: ["jiosaavn"], brand: "jiosaavn" },
  { keywords: ["netflix"], brand: "netflix" },
  { keywords: ["youtube"], brand: "youtube" },
  { keywords: ["amazon"], brand: "amazon" },
  { keywords: ["zomato"], brand: "zomato" },
  { keywords: ["swiggy"], brand: "swiggy" },
  { keywords: ["blinkit"], brand: "blinkit" },
  { keywords: ["uber"], brand: "uber" },
];

// Tier 1: safe to match against free-text note.
export const EXPENSE_SPECIFIC_KEYWORDS = [
  { keywords: ["flat", "hostel", "pg", "room rent"], icon: "Home", color: "#a78bfa" },
  { keywords: ["wifi", "broadband", "internet", "router"], icon: "Wifi", color: "#38bdf8" },
  { keywords: ["electricity", "power bill", "eb bill"], icon: "Zap", color: "#fde047" },
  { keywords: ["water bill", "water can", "water supply"], icon: "Droplet", color: "#38bdf8" },
  { keywords: ["maid", "cook", "cleaning", "housekeeping", "laundry", "ironing"], icon: "Sparkles", color: "#4ade80" },
  { keywords: ["zomato", "swiggy", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "snack", "tiffin", "mess", "canteen", "pizza", "burger", "biryani"], icon: "UtensilsCrossed", color: "#fb923c" },
  { keywords: ["metro", "tram", "subway"], icon: "TrainFront", color: "#a78bfa" },
  { keywords: ["bus", "local bus"], icon: "Bus", color: "#38bdf8" },
  { keywords: ["train", "railway", "irctc"], icon: "TrainFront", color: "#60a5fa" },
  { keywords: ["flight", "airport", "airline"], icon: "Plane", color: "#60a5fa" },
  { keywords: ["ship", "ferry", "cruise", "boat"], icon: "Ship", color: "#38bdf8" },
  { keywords: ["cab", "taxi", "uber", "ola", "rapido", "auto", "fuel", "petrol", "diesel", "parking", "toll"], icon: "Car", color: "#38bdf8" },
  { keywords: ["amazon", "flipkart", "myntra", "bigbasket", "zepto"], icon: "ShoppingBag", color: "#f472b6" },
  { keywords: ["doctor", "clinic", "checkup", "consultation"], icon: "Stethoscope", color: "#f87171" },
  { keywords: ["medicine", "tablet", "tablets", "syrup", "syringe", "injection", "pharmacy", "chemist", "medical store"], icon: "Pill", color: "#fb7185" },
  { keywords: ["hospital", "admission", "surgery", "nursing home"], icon: "Hospital", color: "#ef4444" },
  { keywords: ["gym", "workout", "fitness", "yoga"], icon: "Dumbbell", color: "#f87171" },
];

// Tier 2: category-text only — never matched against the free note.
export const EXPENSE_BROAD_KEYWORDS = [
  { keywords: ["travel", "trip", "vacation", "holiday"], icon: "Plane", color: "#60a5fa" },
  { keywords: ["college", "school", "course", "tuition", "coaching", "sem", "semester", "exam"], icon: "GraduationCap", color: "#818cf8" },
  { keywords: ["movie", "cinema", "concert", "event", "show"], icon: "Film", color: "#c084fc" },
  { keywords: ["shopping", "grocery", "groceries", "market"], icon: "ShoppingBag", color: "#f472b6" },
];

function matchKeywordEntry(text, list) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const entry of list) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry;
  }
  return null;
}

function matchBrandEntry(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const entry of EXPENSE_BRAND_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw)) && isBrandSupported(entry.brand)) {
      return { brand: entry.brand, color: BRAND_TINTS[entry.brand] || "#8892b0" };
    }
  }
  return null;
}

/**
 * Personal/group expense timeline labels are formatted "Spent on
 * <Category>" by the backend. Pulls the category text back out.
 */
export function extractCategoryFromLabel(label = "") {
  const match = label.match(/^Spent on (.+)$/i);
  return match ? match[1] : "";
}

/**
 * Resolves the best icon for an expense line item. Returns an icon
 * *name* (string), not a component — each platform maps it locally.
 * Return shape: { kind: 'brand', brand, color } | { kind: 'icon', icon, color }
 *
 *   1. NOTE text     vs SPECIFIC_KEYWORDS only
 *   2. CATEGORY text vs SPECIFIC + BROAD (authoritative classification)
 *   3. Exact EXPENSE_CATEGORY_ICON_MAP[category] match
 *   4. Generic receipt icon fallback
 */
export function resolveExpenseIcon({ category, subcategory, description } = {}) {
  const categoryText = `${category || ""} ${subcategory || ""}`.trim();
  const noteText = `${description || ""}`.trim();

  const brandHit = matchBrandEntry(noteText) || matchBrandEntry(categoryText);
  if (brandHit) return { kind: "brand", brand: brandHit.brand, color: brandHit.color };

  let hit = matchKeywordEntry(noteText, EXPENSE_SPECIFIC_KEYWORDS);
  if (hit) return { kind: "icon", icon: hit.icon, color: hit.color };

  hit = matchKeywordEntry(categoryText, [...EXPENSE_SPECIFIC_KEYWORDS, ...EXPENSE_BROAD_KEYWORDS]);
  if (hit) return { kind: "icon", icon: hit.icon, color: hit.color };

  if (category && EXPENSE_CATEGORY_ICON_MAP[category]) {
    return { kind: "icon", icon: EXPENSE_CATEGORY_ICON_MAP[category].icon, color: EXPENSE_CATEGORY_ICON_MAP[category].color };
  }

  return { kind: "icon", icon: "Receipt", color: "#8892b0" };
}