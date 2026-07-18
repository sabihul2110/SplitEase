// SplitEase/mobile/src/components/icons/BrandIcon.jsx
//
// Renders official brand logos live from the Simple Icons CDN
// (cdn.simpleicons.org) as SVG — no bundled icon package, no Metro
// resolution issues, always the current official mark.

import React, { useState } from 'react';
import { SvgUri } from 'react-native-svg';

import { BRAND_SLUGS, BRAND_TINTS, isBrandSupported } from '@splitease/shared';

export { BRAND_SLUGS, BRAND_TINTS, isBrandSupported };

export default function BrandIcon({ brand, size = 20, style }) {
  const [failed, setFailed] = useState(false);
  const slug = BRAND_SLUGS[brand];
  if (!slug || failed) return null;

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