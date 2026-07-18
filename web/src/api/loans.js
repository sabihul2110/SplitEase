// SplitEase/web/src/api/loans.js

import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getLoans     = () => api.get(ENDPOINTS.loans);
export const addLoan      = (data) => api.post(ENDPOINTS.loans, data);
export const addBorrow    = (data) => api.post(ENDPOINTS.borrows, data);
export const deleteLoan   = (id) => api.delete(ENDPOINTS.delLoan(id));
export const repayLoan    = (id, data) => api.post(ENDPOINTS.loanRepay(id), data);
export const getBorrows   = () => api.get(ENDPOINTS.borrows);
export const deleteBorrow = (id) => api.delete(ENDPOINTS.delBorrow(id));
export const repayBorrow  = (id, data) => api.post(ENDPOINTS.borrowRepay(id), data);