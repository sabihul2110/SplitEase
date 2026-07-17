// SplitEase/mobile/src/screens/more/MoreScreen.jsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Activity, ArrowLeftRight, Settings as SettingsIcon, Zap, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';
import ScreenHeader from '../../components/layout/ScreenHeader';

const ITEMS = [
  {
    Icon:   Activity,
    label:  'Activity',
    sub:    'Your complete financial timeline',
    nav:    { screen: 'Activity' },
    color:  '#f59e0b',
  },
  {
    Icon:   ArrowLeftRight,
    label:  'Settle Up',
    sub:    'View and clear outstanding balances',
    nav:    { screen: 'Settlements' },
    color:  '#8b5cf6',
  },
  {
    Icon:   Zap,
    label:  'Quick Entry',
    sub:    'Templates, recurring bills, routines',
    nav:    { screen: 'Expenses', params: { screen: 'QuickEntry' } },
    color:  COLORS.primary,
  },
  {
    Icon:   SettingsIcon,
    label:  'Settings',
    sub:    'App preferences, theme, sign out',
    nav:    { screen: 'Settings' },
    color:  COLORS.text2,
  },
];

export default function MoreScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="More" />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + SPACING.base }]}
        showsVerticalScrollIndicator={false}
      >
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.row}
            onPress={() => {
              if (item.nav.params) navigation.navigate(item.nav.screen, item.nav.params);
              else navigation.navigate(item.nav.screen);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '14' }]}>
              <item.Icon size={20} color={item.color} strokeWidth={1.8} />
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            <ChevronRight size={16} color={COLORS.text3} />
          </TouchableOpacity>
        ))}

        <Text style={styles.version}>SplitEase v1.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: SPACING.base, gap: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  info:  { flex: 1 },
  label: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  sub:   { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 3 },
  version: {
    textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.text3,
    marginTop: SPACING.lg,
  },
});