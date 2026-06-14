// SplitEase/mobile/src/components/SplashScreenNew.tsx


import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');

const SIZE   = 100;  // reduced from 120
const CENTER = 256;

const PATHS = [
  'M -45 -45 L -85 -85 A 120 120 0 0 1 0 -120 L 0 -60 A 60 60 0 0 0 -42.4 -42.4 Z',
  'M 45 -45 L 85 -85 A 120 120 0 0 0 120 0 L 60 0 A 60 60 0 0 1 42.4 -42.4 Z',
  'M 45 45 L 85 85 A 120 120 0 0 1 0 120 L 0 60 A 60 60 0 0 0 42.4 42.4 Z',
  'M -45 45 L -85 85 A 120 120 0 0 0 -120 0 L -60 0 A 60 60 0 0 1 -42.4 42.4 Z',
];

// ── Timing ──
const T = {
  b1Start:    200,
  b1Duration: 750,
  b2Delay:    0,
  b3Delay:    220,
  b4Delay:    440,
  bladeDur:   380,
  hubDelay:   40,
  spinDelay:  0,
  spinDur:    900,
  dotsIn:     400,
  fadeOut:    2200,
  totalMs:    2600,
};

// ── Dot ──
function LoaderDot({ index, startDelay, masterOpacity }: {
  index: number;
  startDelay: number;
  masterOpacity: Animated.Value;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;
  const visible = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const d = startDelay + index * 160;

    Animated.timing(visible, {
      toValue: 1, duration: 220, delay: d,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue:1.7, duration:300, easing:Easing.out(Easing.ease), useNativeDriver:true }),
            Animated.timing(opacity, { toValue:1,   duration:300, useNativeDriver:true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue:1,    duration:300, easing:Easing.in(Easing.ease), useNativeDriver:true }),
            Animated.timing(opacity, { toValue:0.35, duration:300, useNativeDriver:true }),
          ]),
        ])
      ).start();
    }, d);
  }, []);

  return (
    <Animated.View style={[
      styles.dot,
      { opacity: Animated.multiply(visible, opacity), transform: [{ scale }] }
    ]} />
  );
}

interface Props { onFinish?: () => void }

export default function SplashScreenNew({ onFinish }: Props) {

  // b1 — flies from top-left
  const b1Opacity = useRef(new Animated.Value(0)).current;
  const b1TransX  = useRef(new Animated.Value(-130)).current;
  const b1TransY  = useRef(new Animated.Value(-130)).current;
  const b1Scale   = useRef(new Animated.Value(0.15)).current;

  // b2, b3, b4 — snap in with rotation
  const b2Opacity = useRef(new Animated.Value(0)).current;
  const b2Rotate  = useRef(new Animated.Value(90)).current;
  const b2Scale   = useRef(new Animated.Value(0.3)).current;

  const b3Opacity = useRef(new Animated.Value(0)).current;
  const b3Rotate  = useRef(new Animated.Value(-90)).current;
  const b3Scale   = useRef(new Animated.Value(0.3)).current;

  const b4Opacity = useRef(new Animated.Value(0)).current;
  const b4Rotate  = useRef(new Animated.Value(180)).current;
  const b4Scale   = useRef(new Animated.Value(0.3)).current;

  // hub
  const hubOpacity = useRef(new Animated.Value(0)).current;
  const hubScale   = useRef(new Animated.Value(0.2)).current;

  // full spin wrapper
  const spinValue = useRef(new Animated.Value(0)).current;

  // dots row
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // master fade
  const masterOpacity = useRef(new Animated.Value(1)).current;

  const easeOutBack = Easing.out(Easing.back(1.7));

  const snapBlade = (
    opacity: Animated.Value,
    rotate: Animated.Value,
    scale: Animated.Value,
    delay: number,
    onDone?: () => void
  ) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue:1, duration:200, delay, easing:Easing.out(Easing.ease), useNativeDriver:true }),
      Animated.timing(rotate,  { toValue:0, duration:T.bladeDur, delay, easing:easeOutBack, useNativeDriver:true }),
      Animated.timing(scale,   { toValue:1, duration:T.bladeDur, delay, easing:easeOutBack, useNativeDriver:true }),
    ]).start(({ finished }) => { if (finished && onDone) onDone() });
  };

  useEffect(() => {

    // Phase 1 — b1 flies in
    Animated.parallel([
      Animated.timing(b1Opacity, { toValue:1, duration:400, delay:T.b1Start, easing:Easing.out(Easing.ease), useNativeDriver:true }),
      Animated.timing(b1TransX,  { toValue:0, duration:T.b1Duration, delay:T.b1Start, easing:Easing.out(Easing.exp), useNativeDriver:true }),
      Animated.timing(b1TransY,  { toValue:0, duration:T.b1Duration, delay:T.b1Start, easing:Easing.out(Easing.exp), useNativeDriver:true }),
      Animated.timing(b1Scale,   { toValue:1, duration:T.b1Duration, delay:T.b1Start, easing:Easing.out(Easing.exp), useNativeDriver:true }),
    ]).start(({ finished }) => {
      if (!finished) return;

      // Phase 2 — b2, b3, b4 snap in with spread timing
      snapBlade(b2Opacity, b2Rotate, b2Scale, T.b2Delay);
      snapBlade(b3Opacity, b3Rotate, b3Scale, T.b3Delay);
      snapBlade(b4Opacity, b4Rotate, b4Scale, T.b4Delay, () => {

        // Phase 3 — hub pops
        Animated.parallel([
          Animated.timing(hubOpacity, { toValue:1, duration:200, useNativeDriver:true }),
          Animated.spring(hubScale,   { toValue:1, damping:8, stiffness:220, useNativeDriver:true }),
        ]).start(({ finished }) => {
          if (!finished) return;

          // Phase 4 — spin + dots appear simultaneously
          Animated.timing(spinValue, {
            toValue:   1,
            duration:  T.spinDur,
            delay:     T.spinDelay,
            easing:    Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }).start();

          Animated.timing(dotsOpacity, {
            toValue:  1,
            duration: 220,
            delay:    T.dotsIn,
            useNativeDriver: true,
          }).start();

          // Phase 5 — master fade (logo + dots together)
          Animated.timing(masterOpacity, {
            toValue:  0,
            duration: 250,
            delay:    T.fadeOut,
            useNativeDriver: true,
          }).start(() => { onFinish?.() });
        });
      });
    });
  }, []);

  const spin = spinValue.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotInterp = (v: Animated.Value) =>
    v.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>

      {/* Logo + spin wrapper */}
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={SIZE} height={SIZE} viewBox="116 116 280 280">

          {/* b1 */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={{
              position:'absolute',
              transform:[
                { translateX: b1TransX },
                { translateY: b1TransY },
                { scale: b1Scale },
              ],
              opacity: b1Opacity,
            }}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[0]} fill="#2563eb" />
              </Svg>
            </Animated.View>
          </G>

          {/* b2 */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={{
              position:'absolute',
              opacity: b2Opacity,
              transform:[{ rotate: rotInterp(b2Rotate) },{ scale: b2Scale }],
            }}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[1]} fill="#3b82f6" />
              </Svg>
            </Animated.View>
          </G>

          {/* b3 */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={{
              position:'absolute',
              opacity: b3Opacity,
              transform:[{ rotate: rotInterp(b3Rotate) },{ scale: b3Scale }],
            }}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[2]} fill="#2563eb" />
              </Svg>
            </Animated.View>
          </G>

          {/* b4 */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={{
              position:'absolute',
              opacity: b4Opacity,
              transform:[{ rotate: rotInterp(b4Rotate) },{ scale: b4Scale }],
            }}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[3]} fill="#3b82f6" />
              </Svg>
            </Animated.View>
          </G>

          {/* Hub — one ring, matches icon */}
          <Animated.View style={[styles.hubWrap, {
            opacity:   hubOpacity,
            transform: [{ scale: hubScale }],
          }]}>
            <Svg width={SIZE} height={SIZE} viewBox="116 116 280 280">
              <Circle cx={CENTER} cy={CENTER} r="25"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeOpacity="0.4"
              />
            </Svg>
          </Animated.View>

        </Svg>
      </Animated.View>

      {/* Dots — fades in during spin, fades out with master */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        <LoaderDot index={0} startDelay={0} masterOpacity={masterOpacity} />
        <LoaderDot index={1} startDelay={0} masterOpacity={masterOpacity} />
        <LoaderDot index={2} startDelay={0} masterOpacity={masterOpacity} />
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    top: 0, left: 0,
    width:           SW,
    height:          SH,
    backgroundColor: '#0a0b0f',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             24,
    zIndex:          999,
  },
  hubWrap: {
    position: 'absolute',
    width:    SIZE,
    height:   SIZE,
  },
  dotsRow: {
    flexDirection:  'row',
    gap:            5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: '#3b82f6',
  },
});