// SplitEase/mobile/src/constants/theme.js

/**
 * theme.js
 * Single source of truth for all design tokens.
 * Mirrors the web app's CSS variables exactly.
 */

export const COLORS = {
  // Backgrounds
  bg:       '#0d0e14',
  surface:  '#13141c',
  surface2: '#1a1c26',
  surface3: '#21232f',

  // Borders
  border:   '#252730',
  border2:  '#31333f',

  // Brand
  primary:  '#2563eb',
  primaryH: '#3b82f6',

  // Semantic
  success:  '#10b981',
  danger:   '#ef4444',
  warning:  '#f59e0b',

  // Text
  text:     '#f0f1f5',
  text2:    '#9095a8',
  text3:    '#4e5260',

  // Misc
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