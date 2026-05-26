// SplitEase/mobile/src/components/common/Button.jsx

/**
 * Button.jsx
 * Reusable button matching the web app's .btn system.
 * Variants: primary, success, danger, ghost, surface
 * Sizes: sm, md (default), lg
 */

import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, View,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const VARIANT_STYLES = {
  primary: {
    bg:         COLORS.primary,
    bgPressed:  COLORS.primaryH,
    text:       COLORS.white,
  },
  success: {
    bg:         COLORS.success,
    bgPressed:  '#0ea472',
    text:       COLORS.white,
  },
  danger: {
    bg:         COLORS.danger,
    bgPressed:  '#dc2626',
    text:       COLORS.white,
  },
  ghost: {
    bg:         COLORS.transparent,
    bgPressed:  COLORS.surface2,
    text:       COLORS.text2,
    border:     COLORS.border2,
  },
  surface: {
    bg:         COLORS.surface2,
    bgPressed:  COLORS.surface3,
    text:       COLORS.text,
  },
};

const SIZE_STYLES = {
  xs: { paddingVertical: 5,  paddingHorizontal: 10, fontSize: FONT_SIZE.xs, radius: RADIUS.sm },
  sm: { paddingVertical: 7,  paddingHorizontal: 14, fontSize: FONT_SIZE.sm, radius: RADIUS.sm },
  md: { paddingVertical: 11, paddingHorizontal: 20, fontSize: FONT_SIZE.base, radius: RADIUS.md },
  lg: { paddingVertical: 15, paddingHorizontal: 28, fontSize: FONT_SIZE.md, radius: RADIUS.lg },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size    = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const s = SIZE_STYLES[size]       || SIZE_STYLES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor:    isDisabled ? COLORS.surface3 : v.bg,
          paddingVertical:    s.paddingVertical,
          paddingHorizontal:  s.paddingHorizontal,
          borderRadius:       s.radius,
          borderWidth:        v.border ? 1 : 0,
          borderColor:        v.border,
          opacity:            isDisabled ? 0.55 : 1,
          alignSelf:          fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.inner}>
          {leftIcon && <View style={styles.iconWrap}>{leftIcon}</View>}
          <Text style={[
            styles.label,
            {
              color:      isDisabled ? COLORS.text3 : v.text,
              fontSize:   s.fontSize,
              fontWeight: FONT_WEIGHT.semibold,
            },
            textStyle,
          ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    marginRight: 4,
  },
  label: {
    letterSpacing: 0.1,
  },
});