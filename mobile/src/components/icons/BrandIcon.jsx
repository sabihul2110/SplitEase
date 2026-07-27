// SplitEase/mobile/src/components/icons/BrandIcon.jsx
//
// Renders official brand logos live from the Simple Icons CDN
// (cdn.simpleicons.org) as SVG — no bundled icon package, no Metro
// resolution issues, always the current official mark.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import Svg, { Path } from 'react-native-svg';

import { BRAND_SLUGS, BRAND_TINTS, isBrandSupported } from '@splitease/shared';

export { BRAND_SLUGS, BRAND_TINTS, isBrandSupported };

// Amazon and Uber's official marks from Simple Icons are flat near-black
// — invisible against this app's dark chip backgrounds, and the CDN mark
// is also visually confusable with a load failure. Drawn locally instead:
// always renders, no network dependency, always has contrast.
function AmazonGlyph({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 9.3C5 6.4 8.1 4 12 4s7 2.4 7 5.3" stroke="#cfd6e6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M6 15.4c3.5 2.2 8.5 2.2 12 0" stroke="#FF9900" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Path d="M16.6 14.7l1.8 1-1 1.9" stroke="#FF9900" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function UberGlyph({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 6v7a5 5 0 0 0 10 0V6" stroke="#e7ebf2" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <Path d="M6 18h12" stroke="#e7ebf2" strokeWidth="2.3" strokeLinecap="round" />
    </Svg>
  );
}
const LOCAL_GLYPHS = { amazon: AmazonGlyph, uber: UberGlyph };

export default function BrandIcon({ brand, size = 20, style }) {
  const [failed, setFailed] = useState(false);
  const slug = BRAND_SLUGS[brand];
  if (!slug) return null;

  const Local = LOCAL_GLYPHS[brand];
  if (Local) return <Local size={size} />;

  if (failed) {
    const tint = BRAND_TINTS[brand] || '#8892b0';
    const badgeSize = Math.round(size * 1.5);
    return (
      <View style={[styles.fallback, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: tint }, style]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.55 }]}>{brand[0]?.toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <SvgUri
      width={size}
      height={size}
      uri={`https://cdn.simpleicons.org/${slug}`}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#fff', fontWeight: '800' },
});