// SplitEase/mobile/src/components/common/IconPickerGrid.jsx
//
// Shared icon picker for Quick_Templates / Recurring_Bills / Routines.
// Grouped by category, with a long-press tooltip showing the name —
// several lucide glyphs look near-identical at 18px (train vs metro,
// auto vs cab-taxi), the label is the real disambiguator.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TemplateIcon, ICON_GROUPS } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

function IconCell({ itemKey, label, active, activeColor, onPress }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <View style={styles.cellWrap}>
      {showTip && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText} numberOfLines={1}>{label}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.iconOpt, active && { borderColor: activeColor, backgroundColor: activeColor + '1f' }]}
        onPress={onPress}
        onLongPress={() => setShowTip(true)}
        onPressOut={() => setShowTip(false)}
        delayLongPress={280}
      >
        <TemplateIcon name={itemKey} size={18} color={active ? activeColor : COLORS.text3} />
      </TouchableOpacity>
    </View>
  );
}

export default function IconPickerGrid({ value, onChange, activeColor = COLORS.primary }) {
  return (
    <View style={{ gap: SPACING.md }}>
      {ICON_GROUPS.map((group) => (
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
      <Text style={styles.hint}>Hold an icon to see its name</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cellWrap: { position: 'relative' },
  iconOpt: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute', top: -30, left: -10, zIndex: 10,
    backgroundColor: '#000', borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 60, alignItems: 'center',
  },
  tooltipText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.text3, fontStyle: 'italic' },
});