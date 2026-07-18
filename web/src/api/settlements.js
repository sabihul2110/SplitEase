// SplitEase/web/src/api/settlements.js

import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getSettlements     = (groupId) => api.get(ENDPOINTS.settlementsRaw(groupId));
export const getSimplified      = (groupId) => api.get(ENDPOINTS.settlementsSimplified(groupId));
export const getSettlementsBulk = (groupIds) => api.post(ENDPOINTS.settlementsBulk, { group_ids: groupIds });
export const getPendingSplits   = (groupId, debtorId, creditorId) =>
  api.get(ENDPOINTS.pendingSplits(groupId, debtorId, creditorId));

export const getPayments   = (groupId) => api.get(ENDPOINTS.payments(groupId));
export const addPayment    = (groupId, data) => api.post(ENDPOINTS.addPayment(groupId), data);
export const deletePayment = (id) => api.delete(ENDPOINTS.delPayment(id));