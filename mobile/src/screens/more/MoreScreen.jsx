// SplitEase/mobile/src/screens/more/MoreScreen.jsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import ScreenHeader from '../../components/layout/ScreenHeader';

const ITEMS = [
  { icon: '✅', label: 'Settle Up',     sub: 'View and settle balances',        screen: 'Settlements'   },
  { icon: '🔔', label: 'Notifications', sub: 'Reminders and activity alerts',   screen: 'Notifications' },
  { icon: '⚙️', label: 'Settings',      sub: 'Preferences and account options', screen: 'Settings'      },
  { icon: '👤', label: 'Profile',       sub: 'Edit your profile and password',  screen: 'Profile'       },
];

export default function MoreScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.list}>
        {ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.row, i === ITEMS.length - 1 && styles.rowLast]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
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
  rowLast: {},
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  info:    { flex: 1 },
  label:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  sub:     { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 3 },
  chevron: { fontSize: FONT_SIZE.lg, color: COLORS.text3 },
});