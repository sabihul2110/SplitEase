// SplitEase/mobile/src/config/api.js

/**
 * api.js
 * Central API config. Matches the real backend exactly.
 */


// BASE_URL now comes from EXPO_PUBLIC_API_URL, set via mobile/.env,
// .env.local, or .env.production — see mobile/.env.local for the
// dev-time toggle and the repo-root TESTING_ENVIRONMENTS.md guide.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://splitease-4hcc.onrender.com';

export const STORAGE_KEY = 'splitease_user';


import { ENDPOINT_PATHS } from '@splitease/shared';

const V1 = '/api/v1';

// Builds ENDPOINTS by prepending /api/v1 to every shared path — mobile's
// axios client (client.js) uses a baseURL with NO /api/v1 suffix, so it
// needs to be baked in here. Function-valued paths get wrapped so the
// caller-facing signature (e.g. ENDPOINTS.groupMembers(id)) is unchanged.
function withPrefix(paths) {
  const out = {};
  for (const [key, value] of Object.entries(paths)) {
    out[key] = typeof value === 'function'
      ? (...args) => `${V1}${value(...args)}`
      : `${V1}${value}`;
  }
  return out;
}

export const ENDPOINTS = withPrefix(ENDPOINT_PATHS);

// Aliases for the handful of mobile api files that reference
// ENDPOINTS.ledgerNotifReadCategory/quickTemplates/etc. under slightly
// different names than the shared file — kept for exact backward compat.
ENDPOINTS.ledgerNotifReadCategory = (category) => `${V1}/ledger-notifications/read-category/${category}`;