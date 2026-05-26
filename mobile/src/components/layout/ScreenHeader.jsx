// SplitEase/mobile/src/components/layout/ScreenHeader.jsx

/**
 * ScreenHeader.jsx
 * Reusable header bar for all screens.
 * Replaces the web app's AppShell topbar for mobile.
 * Supports back button, title, subtitle, and right actions.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../../constants/theme';

export default function ScreenHeader({
  title,
  subtitle,
  showBack    = false,
  onBack,
  rightElement,
  transparent = false,
}) {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (onBack) onBack();
    else if (nav.canGoBack()) nav.goBack();
  }

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) },
      transparent && styles.transparent,
    ]}>
      <View style={styles.row}>
        {/* Left: back button or spacer */}
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center: title */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right: actions */}
        <View style={[styles.side, styles.sideRight]}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
  },
  transparent: {
    backgroundColor: COLORS.transparent,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    minHeight:      44,
  },
  side: {
    width:          44,
    alignItems:     'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems:  'flex-end',
    width:       'auto',
    flex:        0,
  },
  center: {
    flex:       1,
    alignItems: 'center',
  },
  title: {
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color:      COLORS.text,
  },
  subtitle: {
    fontSize:   FONT_SIZE.xs,
    color:      COLORS.text3,
    marginTop:  2,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize:   FONT_SIZE.xl,
    color:      COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});