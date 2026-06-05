// SplitEase/mobile/src/api/settlements.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getSettlements  = (groupId)          => client.get(ENDPOINTS.settlementsRaw(groupId));
export const getSimplified   = (groupId)          => client.get(ENDPOINTS.settlementsSimplified(groupId));
export const getPayments     = (groupId)          => client.get(ENDPOINTS.payments(groupId));
export const addPayment      = (groupId, payload) => client.post(ENDPOINTS.addPayment(groupId), payload);
export const deletePayment   = (id)               => client.delete(ENDPOINTS.delPayment(id));
export const getSettlementsBulk = (groupIds)      => client.post(ENDPOINTS.settlementsBulk, { group_ids: groupIds });
export const getPendingSplits = (groupId, debtorId, creditorId) =>
  client.get(ENDPOINTS.pendingSplits(groupId, debtorId, creditorId));
