// SplitEase/mobile/src/api/recurringBills.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getBills   = ()            => client.get(ENDPOINTS.recurringBills);
export const createBill = (payload)     => client.post(ENDPOINTS.recurringBills, payload);
export const updateBill = (id, payload) => client.put(ENDPOINTS.recurringBillById(id), payload);
export const deleteBill = (id)          => client.delete(ENDPOINTS.recurringBillById(id));