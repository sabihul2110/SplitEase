// web/src/config/api.js
//
// Mirrors mobile/src/config/api.js — builds ENDPOINTS from the shared
// path templates, but WITHOUT the /api/v1 prefix, since web's axios
// client (api/client.js) already includes /api/v1 in its baseURL.

import { ENDPOINT_PATHS } from '@splitease/shared';

export const ENDPOINTS = ENDPOINT_PATHS;