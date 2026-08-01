// SplitEase/mobile/src/components/common/Toast.jsx
//
// Notch-emerge animated toast. Animates from the Dynamic Island / notch
// downward on show, and collapses back up into it on hide.
// Uses expo-blur for the frosted glass pill effect on iOS, standard View on Android.
//
// Usage:
//   const [toast, setToast] = useState({ msg: '', type: 'success' });
//   function showToast(msg, type = 'success') {
//     setToast({ msg, type });
//     setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
//   }
//   <Toast config={toast} />

import React, { useState, useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '../icons';
import AnimatedCheckmark, { CHECK_PATH_LENGTH } from './AnimatedCheckmark';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedContainer = Platform.OS === 'ios' ? AnimatedBlurView : Animated.View;

const CHECK_LENGTH = CHECK_PATH_LENGTH;

const C = {
  success: '#10b981',
  danger: '#E53935',
  warning: '#f59e0b',
  text: '#f0f4ff',
  surface2: '#171c2c',
};

export default function Toast({ config }) {
  const insets = useSafeAreaInsets();
  const [display, setDisplay] = useState({ msg: '', type: 'success' });

  // Toast Layout Animations
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // SVG Checkmark Animation
  const checkOffset = useRef(new Animated.Value(CHECK_LENGTH)).current;

  useEffect(() => {
    if (config.msg) {
      setDisplay(config);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Reset the checkmark before animating in
      checkOffset.setValue(CHECK_LENGTH);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          stiffness: 250, damping: 20, mass: 1,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          stiffness: 250, damping: 20, mass: 1,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 150, useNativeDriver: true,
        }),
        // Draw the checkmark (only if it's a success toast)
        ...(config.type === 'success' || !config.type ? [
          Animated.timing(checkOffset, {
            toValue: 0,
            duration: 320,
            delay: 150, // Wait for the toast to mostly appear first
            useNativeDriver: false, // SVG stroke dash cannot use native driver
          })
        ] : [])
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -100,
          useNativeDriver: true,
          stiffness: 300, damping: 25, mass: 1,
        }),
        Animated.spring(scale, {
          toValue: 0.8,
          useNativeDriver: true,
          stiffness: 300, damping: 25, mass: 1,
        }),
        Animated.timing(opacity, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start(() => setDisplay({ msg: '', type: 'success' }));
    }
  }, [config.msg]);

  if (!display.msg) return null;

  const isErr = display.type === 'error';
  const isWarn = display.type === 'warning';
  const isSuccess = !isErr && !isWarn;
  
  const color = isErr ? C.danger : isWarn ? C.warning : C.success;
  const Icon = isErr ? Icons.info : isWarn ? Icons.info : null;

  return (
    <AnimatedContainer
      tint={Platform.OS === 'ios' ? "dark" : undefined}
      intensity={Platform.OS === 'ios' ? 100 : undefined}
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          borderColor: color + '40',
          // Drops slightly below the system status bar cutouts
          top: insets.top + 10,
          backgroundColor: Platform.OS === 'ios' ? '#000000' : 'rgba(23, 28, 44, 0.98)',
          borderWidth: Platform.OS === 'ios' ? 0 : 1,
          shadowColor: color,
          shadowOpacity: 0.4,
          elevation: Platform.OS === 'android' ? 10 : 0, 
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        {isSuccess ? (
          <AnimatedCheckmark size={16} color={color} strokeWidth={12} offset={checkOffset} />
        ) : (
          <Icon size={12} color={color} />
        )}
      </View>
      <Text style={styles.text}>{display.msg}</Text>
    </AnimatedContainer>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    zIndex: 9999,
    overflow: 'hidden',
  },
  iconBox: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    color: '#f0f4ff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});