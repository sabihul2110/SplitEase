// SplitEase/mobile/src/api/recurringBills.js

import client from './client';

const BASE = '/api/v1/recurring-bills';

export const getBills   = ()            => client.get(`${BASE}/`);
export const createBill = (payload)     => client.post(`${BASE}/`, payload);
export const updateBill = (id, payload) => client.put(`${BASE}/${id}`, payload);
export const deleteBill = (id)          => client.delete(`${BASE}/${id}`);