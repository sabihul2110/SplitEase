// SplitEase/web/src/api/settlements.js

import api from "./client.js";

export const getSettlements     = (groupId) => api.get(`/settlements/${groupId}`);
export const getSimplified      = (groupId) => api.get(`/settlements/${groupId}/simplified`);
export const getSettlementsBulk = (ids)     => api.post("/settlements/bulk", { group_ids: ids });