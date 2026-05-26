/**
 * shared/constants.js
 *
 * Source of truth for constants shared between web and mobile.
 *
 * USAGE:
 *   Web:    import { COLORS, CATEGORIES } from '../../shared/constants'
 *   Mobile: import { COLORS, CATEGORIES } from '../../shared/constants'
 *
 * NOTE: COLORS here are the raw hex values — no CSS variable syntax.
 * Web: reference these in index.css as CSS vars (already done).
 * Mobile: import and use directly in StyleSheet.
 *
 * INDUSTRY STANDARD NOTE:
 * For a monorepo, shared logic lives in packages/shared or a shared/ folder
 * at the root. Both web and mobile import from it via relative paths or
 * a workspace alias (if using npm/yarn workspaces). This file follows that
 * pattern without requiring a build step.
 */

// ── Design tokens ─────────────────────────────────────────────────────────
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
  text:     '#f0f1f5',
  text2:    '#9095a8',
  text3:    '#4e5260',
  white:    '#ffffff',
  black:    '#000000',
  transparent: 'transparent',
};

// ── API ───────────────────────────────────────────────────────────────────
export const BASE_URL    = 'https://splitease-kfda.onrender.com';
export const STORAGE_KEY = 'splitease_user'; // AsyncStorage / localStorage key

// ── Expense categories (matches DB seed data) ─────────────────────────────
export const CATEGORIES = [
  { id: 1, name: 'Travel',        emoji: '✈️'  },
  { id: 2, name: 'Accommodation', emoji: '🏨'  },
  { id: 3, name: 'Food & Dining', emoji: '🍽️' },
  { id: 4, name: 'Activities',    emoji: '🎉'  },
  { id: 5, name: 'Utilities',     emoji: '💡'  },
  { id: 6, name: 'Groceries',     emoji: '🛒'  },
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