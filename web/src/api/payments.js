// SplitEase/web/src/api/payments.js

import api from "./client.js";

export const getPayments   = (groupId) => api.get(`/payments/${groupId}`);
export const createPayment = (groupId, data) => api.post(`/payments/${groupId}`, data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);