// web/src/components/icons/BrandIcon.jsx
//
// Renders official brand logos from the Simple Icons CDN as a plain
// <img>, mirroring mobile's SvgUri-based BrandIcon.jsx. Data (slugs,
// tints, support check) is shared; only rendering differs per platform.

import React, { useState } from 'react';
import { BRAND_SLUGS, BRAND_TINTS, isBrandSupported } from '@splitease/shared';

export { BRAND_SLUGS, BRAND_TINTS, isBrandSupported };

export default function BrandIcon({ brand, size = 20, style, className }) {
  const [failed, setFailed] = useState(false);
  const slug = BRAND_SLUGS[brand];
  if (!slug || failed) return null;

  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}`}
      width={size}
      height={size}
      alt={brand}
      style={style}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}