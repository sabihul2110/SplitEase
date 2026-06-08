// SplitEase/web/src/api/invites.js

import api from "./client.js";

export const getInvite  = (token) => api.get(`/invite/${token}`);
export const joinInvite = (token) => api.post(`/invite/${token}/join`);