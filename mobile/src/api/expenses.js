// SplitEase/mobile/src/api/expenses.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getExpenses    = (groupId)  => client.get(ENDPOINTS.expenses(groupId));
export const addExpense     = (groupId, payload) =>
  client.post(ENDPOINTS.addExpense(groupId), payload);
export const editExpense    = (id, payload)  => client.put(ENDPOINTS.delExpense(id), payload);
export const deleteExpense  = (id)           => client.delete(ENDPOINTS.delExpense(id));
export const getSettlementStatus = (groupId) =>
  client.get(ENDPOINTS.settlementStatus(groupId));
export const getExpenseSplits = (groupId, expenseId) => 
  client.get(ENDPOINTS.expenseSplits(groupId, expenseId));
export const getTimeline    = (limit = 200)  =>
  client.get(`${ENDPOINTS.timeline}?limit=${limit}`);
export const downloadStatement = (startDate, endDate, label, periodType = 'range') => {
  const qs = new URLSearchParams();
  if (startDate) qs.set('start_date', startDate);
  if (endDate) qs.set('end_date', endDate);
  if (label) qs.set('label', label);
  qs.set('period_type', periodType);
  return client.get(`${ENDPOINTS.statement}?${qs.toString()}`, { responseType: 'arraybuffer' });
};
export const getPersonalExpenses = ()        => client.get(ENDPOINTS.personalExpenses);
export const deletePersonalExpense = (id)    =>
  client.delete(ENDPOINTS.delPersonalExpense(id));
export const addIncome      = (payload)      => client.post(ENDPOINTS.income, payload);
export const deleteIncome   = (id)           => client.delete(ENDPOINTS.delIncome(id));

export const addPersonalExpense  = (payload)     => client.post(ENDPOINTS.personalExpenses, payload);
export const editPersonalExpense = (id, payload) => client.put(`${ENDPOINTS.personalExpenses}${id}/`, payload);

export { repayLoan, deleteLoan, deleteBorrow } from './loans';