// SplitEase/mobile/src/api/loans.js

import client from './client';
import { ENDPOINTS } from '../config/api.js';

export const getLoans    = ()         => client.get(ENDPOINTS.loans);
export const repayLoan   = (id, amt)  =>
  client.post(ENDPOINTS.loanRepay(id),  { repayment_amount: amt });
export const deleteLoan  = (id)       => client.delete(ENDPOINTS.delLoan(id));
export const getBorrows  = ()         => client.get(ENDPOINTS.borrows);
export const repayBorrow = (id, amt)  =>
  client.post(ENDPOINTS.borrowRepay(id), { repayment_amount: amt });
export const deleteBorrow = (id)      => client.delete(ENDPOINTS.delBorrow(id));
export const addLoan   = (payload) => client.post(ENDPOINTS.loans, payload);
export const addBorrow = (payload) => client.post(ENDPOINTS.borrows, payload);