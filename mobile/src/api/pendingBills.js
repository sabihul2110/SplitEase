// SplitEase/mobile/src/api/pendingBills.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getPendingBills    = ()            => client.get(ENDPOINTS.pendingBills);
export const payPendingBill     = (id, payload) => client.post(ENDPOINTS.pendingBillPay(id), payload);
export const dismissPendingBill = (id)          => client.post(ENDPOINTS.pendingBillDismiss(id));