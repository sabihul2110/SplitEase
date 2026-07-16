// SplitEase/mobile/src/api/pendingBills.js

import client from './client';

const BASE = '/api/v1/pending-bills';

export const getPendingBills    = ()            => client.get(`${BASE}/`);
export const payPendingBill     = (id, payload) => client.post(`${BASE}/${id}/pay`, payload);
export const dismissPendingBill = (id)          => client.post(`${BASE}/${id}/dismiss`);