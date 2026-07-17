// SplitEase/mobile/src/components/icons/BrandIcon.jsx
//
// Renders exact brand logos from the `simple-icons` npm package (real
// SVG path data, not hand-drawn approximations). Add more brands by
// importing their `si<Name>` export and adding a row to BRAND_MAP.

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  siSpotify, siApplemusic, siNetflix, siYoutube, siAmazon,
  siZomato, siSwiggy, siUber, siJiosaavn,
} from 'simple-icons';

const BRAND_MAP = {
  spotify:     siSpotify,
  applemusic:  siApplemusic,
  netflix:     siNetflix,
  youtube:     siYoutube,
  amazon:      siAmazon,
  zomato:      siZomato,
  swiggy:      siSwiggy,
  uber:        siUber,
  jiosaavn:    siJiosaavn,
};

export function getBrandIcon(key) {
  return BRAND_MAP[key] || null;
}

export default function BrandIcon({ brand, size = 20, useOriginalColor = false, color = '#fff' }) {
  const icon = BRAND_MAP[brand];
  if (!icon) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={icon.path} fill={useOriginalColor ? `#${icon.hex}` : color} />
    </Svg>
  );
}