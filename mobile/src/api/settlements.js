// SplitEase/mobile/src/api/settlements.js

import client from './client';

export const getSettlements  = (groupId)      => client.get(`/settlements/${groupId}`);
export const getSimplified   = (groupId)      => client.get(`/settlements/${groupId}/simplified`);
export const getPayments     = (groupId)      => client.get(`/payments/${groupId}`);
export const addPayment      = (groupId, payload) => client.post(`/payments/${groupId}`, payload);
export const deletePayment   = (id)           => client.delete(`/payments/${id}`);
export const getPendingSplits = (groupId, debtorId, creditorId) =>
  client.get(`/payments/pending-splits/${groupId}?debtor_id=${debtorId}&creditor_id=${creditorId}`);

export const getSettlementsBulk = (groupIds) =>
  client.post('/settlements/bulk', { group_ids: groupIds });
