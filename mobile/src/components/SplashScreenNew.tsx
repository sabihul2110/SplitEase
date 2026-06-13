// SplitEase/mobile/src/components/SplashScreenNew.tsx

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, G, Defs } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const SIZE   = 160;
const CENTER = 256;

const PATHS = [
  'M -45 -45 L -85 -85 A 120 120 0 0 1 0 -120 L 0 -60 A 60 60 0 0 0 -42.4 -42.4 Z',
  'M 45 -45 L 85 -85 A 120 120 0 0 0 120 0 L 60 0 A 60 60 0 0 1 42.4 -42.4 Z',
  'M 45 45 L 85 85 A 120 120 0 0 1 0 120 L 0 60 A 60 60 0 0 0 42.4 42.4 Z',
  'M -45 45 L -85 85 A 120 120 0 0 0 -120 0 L -60 0 A 60 60 0 0 1 -42.4 42.4 Z',
];

interface Props { onFinish?: () => void }

export default function SplashScreenNew({ onFinish }: Props) {
  // ── Blade 1: flies in from top-left ──
  const b1Opacity   = useRef(new Animated.Value(0)).current;
  const b1Translate = useRef(new Animated.ValueXY({ x: -130, y: -130 })).current;
  const b1Scale     = useRef(new Animated.Value(0.15)).current;

  // ── Blades 2-4: spin+scale in ──
  const b2Opacity = useRef(new Animated.Value(0)).current;
  const b2Rotate  = useRef(new Animated.Value(90)).current;
  const b2Scale   = useRef(new Animated.Value(0.3)).current;

  const b3Opacity = useRef(new Animated.Value(0)).current;
  const b3Rotate  = useRef(new Animated.Value(-90)).current;
  const b3Scale   = useRef(new Animated.Value(0.3)).current;

  const b4Opacity = useRef(new Animated.Value(0)).current;
  const b4Rotate  = useRef(new Animated.Value(180)).current;
  const b4Scale   = useRef(new Animated.Value(0.3)).current;

  // ── Hub ──
  const hubOpacity = useRef(new Animated.Value(0)).current;
  const hubScale   = useRef(new Animated.Value(0.2)).current;

  // ── Full spin (applied to wrapper) ──
  const spinValue  = useRef(new Animated.Value(0)).current;

  // ── Glow ──
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // ── Master fade out ──
  const masterOpacity = useRef(new Animated.Value(1)).current;

  const easeOutBack = Easing.out(Easing.back(1.7));

  useEffect(() => {
    // Phase 1 — b1 flies in from top-left
    Animated.parallel([
      Animated.timing(b1Opacity,   { toValue:1, duration:400, easing:Easing.out(Easing.ease), useNativeDriver:true, delay:200 }),
      Animated.timing(b1Translate, { toValue:{x:0,y:0}, duration:750, easing:Easing.out(Easing.exp), useNativeDriver:true, delay:200 }),
      Animated.timing(b1Scale,     { toValue:1, duration:750, easing:Easing.out(Easing.exp), useNativeDriver:true, delay:200 }),
    ]).start(() => {

      // Phase 2 — b2, b3, b4 snap in sequentially
      const snapBlade = (opacity: Animated.Value, rotate: Animated.Value, scale: Animated.Value, delay: number, onDone?: () => void) => {
        Animated.parallel([
          Animated.timing(opacity, { toValue:1, duration:200, easing:Easing.out(Easing.ease), useNativeDriver:true, delay }),
          Animated.timing(rotate,  { toValue:0, duration:320, easing:easeOutBack, useNativeDriver:true, delay }),
          Animated.timing(scale,   { toValue:1, duration:320, easing:easeOutBack, useNativeDriver:true, delay }),
        ]).start(onDone ? ({ finished }) => { if (finished) onDone() } : undefined);
      };

      snapBlade(b2Opacity, b2Rotate, b2Scale, 0);
      snapBlade(b3Opacity, b3Rotate, b3Scale, 120);
      snapBlade(b4Opacity, b4Rotate, b4Scale, 240, () => {

        // Phase 3 — hub pops in
        Animated.parallel([
          Animated.timing(hubOpacity, { toValue:1, duration:200, easing:Easing.out(Easing.ease), useNativeDriver:true }),
          Animated.spring(hubScale,   { toValue:1, damping:8, stiffness:220, useNativeDriver:true }),
        ]).start(() => {

          // Phase 4 — glow + full spin
          Animated.timing(glowOpacity, { toValue:0.9, duration:400, useNativeDriver:true }).start();
          Animated.timing(spinValue, {
            toValue:1,
            duration:1100,
            easing:Easing.inOut(Easing.cubic),
            useNativeDriver:true,
          }).start(() => {

            // Phase 5 — master fade out
            Animated.timing(masterOpacity, {
              toValue:0,
              duration:300,
              delay:600,
              easing:Easing.in(Easing.ease),
              useNativeDriver:true,
            }).start(() => {
              onFinish?.();
            });
          });
        });
      });
    });
  }, []);

  const spin = spinValue.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });

  const b1Style = {
    opacity:   b1Opacity,
    transform: [
      { translateX: b1Translate.x },
      { translateY: b1Translate.y },
      { scale: b1Scale },
    ],
  };
  const b2Style = { opacity:b2Opacity, transform:[{ rotate: b2Rotate.interpolate({ inputRange:[-360,360], outputRange:['-360deg','360deg'] }) },{ scale:b2Scale }] };
  const b3Style = { opacity:b3Opacity, transform:[{ rotate: b3Rotate.interpolate({ inputRange:[-360,360], outputRange:['-360deg','360deg'] }) },{ scale:b3Scale }] };
  const b4Style = { opacity:b4Opacity, transform:[{ rotate: b4Rotate.interpolate({ inputRange:[-360,360], outputRange:['-360deg','360deg'] }) },{ scale:b4Scale }] };
  const hubStyle  = { opacity:hubOpacity, transform:[{ scale:hubScale }] };
  const glowStyle = { opacity:glowOpacity };
  const spinStyle = { transform:[{ rotate:spin }] };

  return (
    <Animated.View style={[styles.container, { opacity:masterOpacity }]}>

      {/* Ambient glow */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

      <Animated.View style={spinStyle}>
        <Svg width={SIZE} height={SIZE} viewBox="116 116 280 280">
          <Defs>
            {/* Gradients removed — use flat fills instead, RN SVG gradient IDs don't resolve cross-component */}
          </Defs>

          {/* b1 — flies from top-left */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={b1Style}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[0]} fill="#2563eb" />
              </Svg>
            </Animated.View>
          </G>

          {/* b2, b3, b4 — spin in */}
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={b2Style}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[1]} fill="#3b82f6" />
              </Svg>
            </Animated.View>
          </G>
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={b3Style}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[2]} fill="#2563eb" />
              </Svg>
            </Animated.View>
          </G>
          <G transform={`translate(${CENTER},${CENTER})`}>
            <Animated.View style={b4Style}>
              <Svg width={SIZE} height={SIZE} viewBox="-140 -140 280 280">
                <Path d={PATHS[3]} fill="#3b82f6" />
              </Svg>
            </Animated.View>
          </G>

          {/* Hub — ONE ring, dark fill, matches icon.png */}
          <Animated.View style={[styles.hubWrap, hubStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="116 116 280 280">
              <Circle cx={CENTER} cy={CENTER} r="28"
                fill="#13141c"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeOpacity="0.6"
              />
            </Svg>
          </Animated.View>

        </Svg>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    top:             0, left: 0,
    width:           SW, height: SH,
    backgroundColor: '#0a0b0f',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          999,
  },
  glow: {
    display: 'none', // RN can't do radial gradient — just remove it
  },
  hubWrap: {
    position: 'absolute',
    width:    SIZE, height: SIZE,
  },
});