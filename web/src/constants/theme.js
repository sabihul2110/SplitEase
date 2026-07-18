// web/src/constants/theme.js


import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, AVATAR_PALETTE } from '@splitease/shared';

// This file now mirrors mobile's theme.js — mobile was the more complete
// canonical version (had moneyOut/moneyIn, FONT_WEIGHT, RADIUS.full,
// SHADOW; web previously had none of those). FONT_WEIGHT and SHADOW are
// new additions here — additive only, nothing currently imports them
// from this file, so nothing existing changes behavior.
export { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, AVATAR_PALETTE };