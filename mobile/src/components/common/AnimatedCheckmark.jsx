// SplitEase/mobile/src/components/common/AnimatedCheckmark.jsx
//
// The animated draw-on checkmark used by both Toast (small, inline) and
// SuccessCheck (large, full-screen modal). Previously each of those files
// hand-rolled an identical <Svg><Circle/><Path/></Svg> block with the same
// CHECK_LENGTH=90 path and strokeDashoffset animation — duplicated logic,
// now a single source of truth. The animation timing itself still lives in
// each caller (Toast and SuccessCheck animate on different schedules); this
// component just renders the SVG for a given `offset` Animated.Value.

import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Length of the checkmark path — callers animate their own Animated.Value
// from this down to 0 to "draw" the check. Exported so callers don't
// hardcode a magic number that has to match this file.
export const CHECK_PATH_LENGTH = 90;

export default function AnimatedCheckmark({
  size = 88,
  color = '#10b981',
  strokeWidth = 7,
  offset,           // required: Animated.Value, CHECK_PATH_LENGTH → 0
  circleStroke = false, // SuccessCheck draws a ringed circle; Toast's tiny
                        // version is just a filled dot (no ring, too small to read)
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx={50} cy={50} r={44}
        fill={color + '1a'}
        stroke={circleStroke ? color : 'none'}
        strokeWidth={circleStroke ? 3 : 0}
      />
      <AnimatedPath
        d="M28,52 L43,66 L74,34"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_PATH_LENGTH}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}