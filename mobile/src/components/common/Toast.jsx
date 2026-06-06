// SplitEase/mobile/src/components/common/Toast.jsx
//
// Notch-emerge animated toast. Animates from the Dynamic Island / notch
// downward on show, and collapses back up into it on hide.
// Uses expo-blur for the frosted glass pill effect.
//
// Usage:
//   const [toast, setToast] = useState({ msg: '', type: 'success' });
//   function showToast(msg, type = 'success') {
//     setToast({ msg, type });
//     setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
//   }
//   <Toast config={toast} />

import React from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '../icons/icons';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const C = {
  success: '#10b981',
  danger:  '#E53935',
  warning: '#f59e0b',
  text:    '#f0f4ff',
  surface2:'#171c2c',
};

export default function Toast({ config }) {
  const insets = useSafeAreaInsets();
  const [display, setDisplay] = React.useState({ msg: '', type: 'success' });

  const translateY = React.useRef(new Animated.Value(-40)).current;
  const scale      = React.useRef(new Animated.Value(0.8)).current;
  const opacity    = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (config.msg) {
      setDisplay(config);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -30,
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

  const isErr  = display.type === 'error';
  const isWarn = display.type === 'warning';
  const color  = isErr ? C.danger : isWarn ? C.warning : C.success;
  const Icon   = isErr ? Icons.info : isWarn ? Icons.info : Icons.check;

  return (
    <AnimatedBlurView
      tint="dark"
      intensity={100} // changed
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          borderColor: color + '40',
          top: insets.top + 10,
          overflow: 'hidden',
          backgroundColor: 'rgba(23,28,44,0.9)',
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon size={12} color={color} />
      </View>
      <Text style={styles.text}>{display.msg}</Text>
    </AnimatedBlurView>
  );
}

const styles = StyleSheet.create({
  toast: {
    position:    'absolute',
    alignSelf:   'center',
    flexDirection: 'row',
    alignItems:  'center',
    gap:         12, // was 10
    borderRadius: 999,
    borderWidth:  1,
    paddingVertical:   12, // was 10
    paddingHorizontal: 16, // was 16
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, // was 8
    shadowOpacity: 0.5,
    shadowRadius:  16,
    elevation: 12,
    zIndex: 9999,
    overflow: 'hidden', // added
  },
  iconBox: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  text: {
    fontSize: 13, // was 12
    color: '#f0f4ff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});