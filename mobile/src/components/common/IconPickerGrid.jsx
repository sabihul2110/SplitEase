// SplitEase/mobile/src/components/common/IconPickerGrid.jsx
//
// Shared icon picker for Quick_Templates / Recurring_Bills / Routines.
// Grouped by category, with a long-press tooltip showing the name —
// several lucide glyphs look near-identical at 18px (train vs metro,
// auto vs cab-taxi), the label is the real disambiguator.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TemplateIcon, ICON_GROUPS, CATEGORY_ICON_GROUPS, ICON_CHIP_BG } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

function IconCell({ itemKey, label, active, activeColor, onPress }) {
  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.iconCircle,
          active
            ? { backgroundColor: activeColor + '22', borderColor: activeColor }
            : { backgroundColor: ICON_CHIP_BG, borderColor: 'transparent' },
        ]}
      >
        <TemplateIcon name={itemKey} size={20} color={active ? activeColor : COLORS.text2} />
      </View>
      <Text style={[styles.cellLabel, active && { color: activeColor, fontWeight: FONT_WEIGHT.semibold }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function IconPickerGrid({ value, onChange, activeColor = COLORS.primary, categoryName = null }) { // eslint-disable-line
  const relevantTitles = categoryName ? CATEGORY_ICON_GROUPS[categoryName] : null;
  const hasFilter = !!(relevantTitles && relevantTitles.length);

  const primaryGroups = hasFilter
    ? ICON_GROUPS.filter((g) => relevantTitles.includes(g.title))
    : ICON_GROUPS;
  const restGroups = hasFilter
    ? ICON_GROUPS.filter((g) => !relevantTitles.includes(g.title))
    : [];

  const [showAll, setShowAll] = useState(!hasFilter);

  // Re-collapse to the filtered view whenever the category changes —
  // otherwise switching from "Utilities" to "Travel" after tapping
  // "Show all" would leave every group open for the new category too.
  useEffect(() => { setShowAll(!hasFilter); }, [categoryName]);

  const groupsToRender = showAll ? ICON_GROUPS : primaryGroups;

  return (
    <View style={{ gap: SPACING.md }}>
      {groupsToRender.map((group) => (
        <View key={group.title} style={{ gap: SPACING.sm }}>
          <Text style={styles.groupLabel}>{group.title}</Text>
          <View style={styles.grid}>
            {group.items.map((item) => (
              <IconCell
                key={item.key}
                itemKey={item.key}
                label={item.label}
                active={value === item.key}
                activeColor={activeColor}
                onPress={() => onChange(item.key)}
              />
            ))}
          </View>
        </View>
      ))}

      {restGroups.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowAll((v) => !v)}
          style={[styles.toggle, { borderColor: activeColor + '55' }]}
        >
          <Text style={[styles.toggleText, { color: activeColor }]}>
            {showAll ? 'Show fewer icons' : 'Show all icons'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cell: { width: 64, alignItems: 'center', gap: 4 },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  cellLabel: { fontSize: 10.5, color: COLORS.text2, textAlign: 'center' },
  toggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  toggleText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
});