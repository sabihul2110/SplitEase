// SplitEase/mobile/src/components/common/CategoryPickerGrid.jsx
//
// Shared, structured category picker for expense forms (Personal, Group).
// Renders categories as a wrapping grid of icon+label cells — same visual
// language as QuickEntry's IconPickerGrid — instead of plain text pills
// (PersonalForm) or a single horizontal-scroll row that hides overflow
// categories off-screen (AddGroupExpenseScreen).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CATEGORY_ICONS } from '../../constants/categoryIcons';
import { Icons } from '../icons';
import { COLORS, FONT_WEIGHT, SPACING } from '../../constants/theme';

const DEFAULT_COLOR = COLORS.text2;

export default function CategoryPickerGrid({ categories, value, onChange }) {
  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const id = cat.category_id ?? cat.id;
        const name = cat.category_name ?? cat.name;
        const active = value === id;
        const cfg = CATEGORY_ICONS[name];
        const activeColor = cfg?.color || DEFAULT_COLOR;

        return (
          <TouchableOpacity
            key={id}
            style={styles.cell}
            onPress={() => onChange(id, name)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconCircle,
                active
                  ? { backgroundColor: activeColor + '22', borderColor: activeColor }
                  : { backgroundColor: COLORS.surface2, borderColor: COLORS.border },
              ]}
            >
              {cfg
                ? <cfg.Icon size={19} color={active ? activeColor : COLORS.text2} />
                : <Icons.expenses size={19} color={active ? activeColor : COLORS.text2} />}
            </View>
            <Text
              style={[styles.label, active && { color: activeColor, fontWeight: FONT_WEIGHT.semibold }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cell: { width: 70, alignItems: 'center', gap: 4 },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10.5, color: COLORS.text2, textAlign: 'center' },
});