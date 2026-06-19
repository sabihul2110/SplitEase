// web/src/constants/theme.js


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
};

export const FONT_SIZE = {
  xs: 11, sm: 12, base: 14, md: 15, lg: 16, xl: 18,
  '2xl': 20, '3xl': 24, '4xl': 28, '5xl': 32,
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48,
};

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 18, full: 9999,
};

// Avatar palette — used by Avatar.jsx and any page generating per-person colors.
// Centralizing this removes the duplicated AVATAR_COLORS / AVATAR_PALETTE arrays
// currently copy-pasted in Ui.jsx (mobile), Groups.jsx, Loans.jsx, and People.jsx.
export const AVATAR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f43f5e', '#14b8a6',
];