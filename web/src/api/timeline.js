// SplitEase/web/src/api/timeline.js

import api from "./client.js";
export const getTimeline = (limit = 200) => api.get(`/timeline/?limit=${limit}`);