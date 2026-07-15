// SplitEase/web/src/api/settlements.js

import api from "./client.js";

export const getSettlements     = (groupId) => api.get(`/settlements/${groupId}`);
export const getSimplified      = (groupId) => api.get(`/settlements/${groupId}/simplified`);
export const getSettlementsBulk = (groupIds) => api.post("/settlements/bulk", { group_ids: groupIds });
export const getPendingSplits   = (groupId, debtorId, creditorId) =>
  api.get(`/settlements/${groupId}/pending-splits?debtor_id=${debtorId}&creditor_id=${creditorId}`);

export const getPayments   = (groupId) => api.get(`/payments/${groupId}`);
export const addPayment    = (groupId, data) => api.post(`/payments/${groupId}`, data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);