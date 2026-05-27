// SplitEase/mobile/src/screens/more/MoreScreen.jsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { Icons } from '../../constants/icons';

const ITEMS = [
  {
    icon:   Icons.activity,
    label:  'Activity',
    sub:    'Your complete financial timeline',
    screen: 'Activity',
    color:  '#f59e0b',
  },
  {
    icon:   Icons.settlements,
    label:  'Settle Up',
    sub:    'View and clear outstanding balances',
    screen: 'Settlements',
    color:  '#8b5cf6',
  },
];

export default function MoreScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.list}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.row}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { borderColor: item.color + '30', backgroundColor: item.color + '12' }]}>
              <item.icon size={20} color={item.color} />
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
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  info:    { flex: 1 },
  label:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  sub:     { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 3 },
  chevron: { fontSize: FONT_SIZE.lg, color: COLORS.text3 },
});