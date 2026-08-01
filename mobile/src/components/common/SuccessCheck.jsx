// SplitEase/mobile/src/components/common/SuccessCheck.jsx
//
// Minimal iOS-style success confirmation, rendered via native Modal so it
// always centers on the full device screen regardless of the calling
// screen's layout (tab bars, KeyboardAvoidingView, etc. don't affect it).

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import AnimatedCheckmark, { CHECK_PATH_LENGTH } from './AnimatedCheckmark';

const CHECK_LENGTH = CHECK_PATH_LENGTH;
const HOLD_MS = 550;

export default function SuccessCheck({ visible, label, onDone }) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const checkOffset = useRef(new Animated.Value(CHECK_LENGTH)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    backdropOpacity.setValue(0);
    circleScale.setValue(0);
    checkOffset.setValue(CHECK_LENGTH);
    labelOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(backdropOpacity, {
        toValue: 1, duration: 120, useNativeDriver: true,
      }),
      Animated.spring(circleScale, {
        toValue: 1, useNativeDriver: true, stiffness: 260, damping: 16, mass: 1,
      }),
      Animated.timing(checkOffset, {
        toValue: 0, duration: 320, useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(() => onDone && onDone());
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]} pointerEvents="none">
        <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.circleWrap, { transform: [{ scale: circleScale }] }]}>
          <AnimatedCheckmark size={88} color={COLORS.success} strokeWidth={7} offset={checkOffset} circleStroke />
        </Animated.View>
        {!!label && (
          <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>{label}</Animated.Text>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrap: {
    width: 88, height: 88,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    marginTop: 16,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text2,
  },
});