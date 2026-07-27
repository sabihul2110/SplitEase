// SplitEase/mobile/src/components/common/IconPickerField.jsx
//
// Replaces an always-visible IconPickerGrid with a compact trigger row
// (current icon + "Tap to change icon"). Disabled with a hint until a
// category is picked — the icon list only ever appears once there's a
// category to filter it by, instead of dumping every icon in the app
// inline into the form.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { TemplateIcon, ICON_CHIP_BG, ICON_CHIP_COLOR } from '../../constants/templateIcons';
import IconPickerGrid from './IconPickerGrid';
import { Icons } from '../icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

export default function IconPickerField({ value, onChange, categoryName, activeColor = COLORS.primary }) {
  const [open, setOpen] = useState(false);
  const disabled = !categoryName;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <View style={styles.previewCircle}>
          <TemplateIcon name={value} size={20} color={ICON_CHIP_COLOR} />
        </View>
        <Text style={styles.triggerText}>
          {disabled ? 'Pick a category first' : 'Tap to change icon'}
        </Text>
        {!disabled && (
          <Icons.chevronRight size={16} color={COLORS.text3} style={{ transform: [{ rotate: '90deg' }] }} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Choose an icon</Text>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: SPACING.base, paddingBottom: SPACING.lg }}
              keyboardShouldPersistTaps="handled"
            >
              <IconPickerGrid
                value={value}
                onChange={(k) => { onChange(k); setOpen(false); }}
                activeColor={activeColor}
                categoryName={categoryName}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  triggerDisabled: { opacity: 0.5 },
  previewCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ICON_CHIP_BG, alignItems: 'center', justifyContent: 'center',
  },
  triggerText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm,
  },
});