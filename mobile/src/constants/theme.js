// SplitEase/mobile/src/constants/theme.js

/**
 * theme.js
 * Single source of truth for all design tokens.
 * Mirrors the web app's CSS variables exactly.
 */

import { Platform } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW } from '@splitease/shared';

// TAB_BAR_HEIGHT stays local — Platform.OS is a React Native API,
// not shareable with web. Everything else now lives in shared/constants.js
// (this file was the canonical source that shared/ was built from).
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 108 : 78;

export { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW };