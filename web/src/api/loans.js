// SplitEase/web/src/api/loans.js

import api from "./client.js";

export const getLoans     = () => api.get("/loans/");
export const addLoan      = (data) => api.post("/loans/", data);
export const addBorrow    = (data) => api.post("/borrows/", data);
export const deleteLoan   = (id) => api.delete(`/loans/${id}`);
export const repayLoan    = (id, data) => api.post(`/loans/${id}/repay`, data);
export const getBorrows   = () => api.get("/borrows/");
export const deleteBorrow = (id) => api.delete(`/borrows/${id}`);
export const repayBorrow  = (id, data) => api.post(`/borrows/${id}/repay`, data);