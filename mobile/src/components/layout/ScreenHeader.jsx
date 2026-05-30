// SplitEase/mobile/src/components/layout/ScreenHeader.jsx

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';
import { Icons } from '../../constants/icons';

// export default function ScreenHeader({
//   title,
//   subtitle,
//   showBack = false,
//   onBack,
//   actions,
//   transparent = false,
// }) {

export default function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  transparent = false,
  compact = false,   // ← ADD: true for detail/settings screens
}) {
  const nav = useNavigation();

  function handleBack() {
    if (onBack) onBack();
    else if (nav.canGoBack()) nav.goBack();
  }

  return (
    <View style={[
      styles.container,
      // 🔥 Removed paddingTop: insets.top entirely!
      transparent && styles.transparent,
    ]}>
      <View style={styles.row}>
        
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}
          >
            <Icons.back size={22} color={COLORS.text} />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrapper}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {actions && (
          <View style={styles.actionsWrapper}>
            {actions}
          </View>
        )}
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg,
    // 🔥 Restored horizontal padding (you can use paddingLeft: 24 here if you still want it nudged right)
    paddingHorizontal: SPACING.base, 
    // 🔥 Added a tiny normal padding so the text doesn't touch the black status bar
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm, 
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: SPACING.sm,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // title: {
  //   fontSize: 28,
  //   fontWeight: '800',
  //   color: COLORS.text,
  //   letterSpacing: -0.5,
  //   includeFontPadding: false,
  //   textAlignVertical: 'center',
  // },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  titleCompact: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.text3,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  backBtn: {
    paddingRight: 4,
    justifyContent: 'center',
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});