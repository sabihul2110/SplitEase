// SplitEase/mobile/src/components/common/ui.jsx

/**
 * ui.jsx
 * Small atomic UI components:
 *   Card, Badge, Divider, EmptyState, LoadingState, Avatar, AmountText
 */

import React from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Icons } from '../../constants/icons';

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, padding = true }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, padding && styles.cardPadding, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {children}
    </Wrapper>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  primary: { bg: '#1d3a7a', text: COLORS.primaryH },
  success: { bg: '#0a3728', text: COLORS.success   },
  danger:  { bg: '#3b0f0f', text: COLORS.danger    },
  warning: { bg: '#3b2500', text: COLORS.warning   },
  neutral: { bg: COLORS.surface3, text: COLORS.text2 },
  amber:   { bg: '#3b2500', text: COLORS.warning   },
};

export function Badge({ label, variant = 'neutral', style }) {
  const c = BADGE_COLORS[variant] || BADGE_COLORS.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// ── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'inboxZero', title, subtitle, action }) {
  // Resolve the icon component from the dictionary, fallback to inboxZero
  const IconComponent = Icons[icon] || Icons.inboxZero;

  return (
    <View style={styles.empty}>
      <IconComponent size={48} color={COLORS.text3} />
      {title    && <Text style={styles.emptyTitle}>{title}</Text>}
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action}
    </View>
  );
}

// ── LoadingState ──────────────────────────────────────────────────────────
export function LoadingState({ label = 'Loading…' }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

// ── Avatar (initials) ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#2563eb','#7c3aed','#059669','#d97706','#dc2626',
  '#0891b2','#65a30d','#9333ea','#e11d48','#0369a1',
];

function colorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name = '?', size = 36, style }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
  const bg = colorForName(name);

  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      style,
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ── AmountText (money display) ────────────────────────────────────────────
export function AmountText({ amount, size = 'md', positive, style }) {
  const val = parseFloat(amount) || 0;
  const color = positive === undefined
    ? COLORS.text
    : val >= 0 ? COLORS.success : COLORS.danger;

  const sizes = { sm: FONT_SIZE.base, md: FONT_SIZE['2xl'], lg: FONT_SIZE['4xl'] };

  return (
    <Text style={[
      { color, fontSize: sizes[size] || sizes.md, fontWeight: FONT_WEIGHT.bold },
      style,
    ]}>
      ₹{Math.abs(val).toFixed(2)}
    </Text>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────
export function SectionHeader({ title, action }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  cardPadding: {
    padding: SPACING.base,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      RADIUS.full,
    alignSelf:         'flex-start',
  },
  badgeText: {
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.3,
  },
  divider: {
    height:          1,
    backgroundColor: COLORS.border,
    marginVertical:  SPACING.base,
  },
  empty: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: SPACING['4xl'],
    gap:            SPACING.sm,
  },
  emptyIcon: {
    fontSize:      42,
    marginBottom:  SPACING.sm,
  },
  emptyTitle: {
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color:      COLORS.text,
  },
  emptySub: {
    fontSize:  FONT_SIZE.base,
    color:     COLORS.text2,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
  },
  loading: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.md,
    paddingVertical: SPACING['4xl'],
  },
  loadingText: {
    fontSize: FONT_SIZE.base,
    color:    COLORS.text3,
  },
  avatar: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarText: {
    color:      COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  sectionHead: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.md,
  },
  sectionTitle: {
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color:      COLORS.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});