// SplitEase/mobile/src/components/layout/SplashScreen.tsx


import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, G, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.View;

const { width: SW, height: SH } = Dimensions.get('window');

const CIRCLE_SIZE = 120;

const T = {
  b1:       80,
  b2:      180,
  b3:      280,
  b4:      380,
  textIn:  750,
  dotsIn: 1050,
  fadeOut: 2300,
  totalMs: 2700,
};

const SLICES = [
  {
    d: 'M -45 -45 L -85 -85 A 120 120 0 0 1 0 -120 L 0 -60 A 60 60 0 0 0 -42.4 -42.4 Z',
    fill: '#2563eb',
    delay: T.b1,
  },
  {
    d: 'M 45 -45 L 85 -85 A 120 120 0 0 0 120 0 L 60 0 A 60 60 0 0 1 42.4 -42.4 Z',
    fill: '#3b82f6',
    delay: T.b2,
  },
  {
    d: 'M 45 45 L 85 85 A 120 120 0 0 1 0 120 L 0 60 A 60 60 0 0 0 42.4 42.4 Z',
    fill: '#2563eb',
    delay: T.b3,
  },
  {
    d: 'M -45 45 L -85 85 A 120 120 0 0 0 -120 0 L -60 0 A 60 60 0 0 1 -42.4 42.4 Z',
    fill: '#3b82f6',
    delay: T.b4,
  },
];

function Slice({ d, fill, delay }: { d: string; fill: string; delay: number }) {
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(delay,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) }));
    scale.value = withDelay(delay,
      withSpring(1, { damping: 12, stiffness: 200 }));
  }, []);

  const animProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return <AnimatedPath d={d} fill={fill} animatedProps={animProps} />;
}

function LoaderDot({ index }: { index: number }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    const d = T.dotsIn + index * 160;
    scale.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(1.7, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1,   { duration: 300, easing: Easing.in(Easing.ease) }),
      ), -1, false,
    ));
    opacity.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(1,    { duration: 300 }),
        withTiming(0.35, { duration: 300 }),
      ), -1, false,
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return <AnimatedView style={[styles.dot, style]} />;
}

interface Props { onFinish?: () => void; }

export default function SplashScreen({ onFinish }: Props) {
  const scale   = useSharedValue(0.01);
  const rotate  = useSharedValue(0);

  const masterOpacity = useSharedValue(1);

  const textOpacity   = useSharedValue(0);
  const textTranslate = useSharedValue(12);
  const dotsOpacity   = useSharedValue(0);

  useEffect(() => {
    // Pop in
    scale.value = withSpring(1, {
      damping:   15,
      stiffness: 190,
      mass:      0.75,
    });

    // Single entry spin
    rotate.value = withDelay(
      380,
      withTiming(360, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Text slide up
    textOpacity.value = withDelay(T.textIn,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }));
    textTranslate.value = withDelay(T.textIn,
      withSpring(0, { damping: 14, stiffness: 130 }));

    // Dots appear
    dotsOpacity.value = withDelay(T.dotsIn,
      withTiming(1, { duration: 220 }));

    // ── MASTER FADE OUT — everything disappears in sync ──
    masterOpacity.value = withDelay(T.fadeOut,
      withTiming(0, { duration: 200 }));

    if (onFinish) {
      const t = setTimeout(onFinish, T.totalMs);
      return () => clearTimeout(t);
    }
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale:  scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: masterOpacity.value,
  }));

  const masterContainerStyle = useAnimatedStyle(() => ({
    opacity: masterOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity:   textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
  }));

  
  const squircleRadius = CIRCLE_SIZE * 0.22;
  const LOGO_INNER_SCALE = 0.72;

  return (
    <View style={styles.container}>

      {/* ── SQUIRCLE BACKGROUND (static — does NOT rotate) ── */}
      {/* VERSION 1: squircle blends with screen bg (very subtle presence) */}
      {/* <AnimatedView
        style={[
          styles.logoSquircle,
          { borderRadius: squircleRadius, opacity: masterOpacity },
        ]}
        pointerEvents="none"
      /> */}
      {/* VERSION 2: no squircle background at all - comment version 1*/}

      {/* ── LOGO BLADES  ── */}
      <AnimatedView
        style={[styles.logoBladesWrap, logoStyle]}
        pointerEvents="none"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="-216 -216 432 432"
        >
          <G scale={1.8 * LOGO_INNER_SCALE}>
            {SLICES.map((s, i) => (
              <Slice key={i} d={s.d} fill={s.fill} delay={s.delay} />
            ))}

            <Circle
              cx="0" cy="0" r="25"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeOpacity={0.4}
            />

            {/* <Line
              x1="-35" y1="-35" x2="35" y2="35"
              stroke="#13141c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Line
              x1="35" y1="-35" x2="-35" y2="35"
              stroke="#13141c"
              strokeWidth="4"
              strokeLinecap="round"
            /> */}
          </G>
        </Svg>
      </AnimatedView>

      {/* ── TEXT + DOTS wrapped in master opacity container ── */}
      <AnimatedView style={masterContainerStyle}>

        {/* <AnimatedView style={[styles.textGroup, textStyle]}>
          <Text style={styles.appName}>
            Split<Text style={styles.accent}>Ease</Text>
          </Text>
        </AnimatedView> */}

        <AnimatedView style={[styles.dotsRow, dotsStyle]}>
          <LoaderDot index={0} />
          <LoaderDot index={1} />
          <LoaderDot index={2} />
        </AnimatedView>

      </AnimatedView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    width:           SW,
    height:          SH,
    backgroundColor: '#0a0b0f',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             20,
  },

  logoSquircle: {
    width:           CIRCLE_SIZE,
    height:          CIRCLE_SIZE,
    overflow:        'hidden',
    position:        'absolute',
    // VERSION 1: blends with bg — very dark, almost invisible squircle
    // backgroundColor: '#0f1018',    // just 1–2 shades above screen bg #0a0b0f
    // VERSION 2:
    backgroundColor: 'transparent',
  },

  logoBladesWrap: {
    width:  CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },

  textGroup: {
    alignItems: 'center',
    gap:        4,
  },
  appName: {
    fontSize:      22,
    fontWeight:    '600',
    letterSpacing: -0.3,
    color:         '#f0f4ff',
  },
  accent: {
    color: '#3b82f6',
  },
  tagline: {
    fontSize:      9,
    letterSpacing: 1.8,
    color:         'rgba(148,163,184,0.55)',
    fontWeight:    '400',
  },

  dotsRow: {
    flexDirection: 'row',
    gap:           5,
    alignItems:    'center',
    justifyContent: 'center',
    marginTop:     16,
  },
  dot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: '#3b82f6',
    opacity:         0.4,
  },
});