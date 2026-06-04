// SplitEase/mobile/src/api/expenses.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getExpenses    = (groupId)  => client.get(ENDPOINTS.expenses(groupId));
export const addExpense     = (groupId, payload) =>
  client.post(ENDPOINTS.addExpense(groupId), payload);
export const editExpense    = (id, payload)  => client.put(`/expenses/${id}`, payload);
export const deleteExpense  = (id)           => client.delete(ENDPOINTS.delExpense(id));
export const getSettlementStatus = (groupId) =>
  client.get(`/expenses/${groupId}/settlement-status`);
export const getExpenseSplits = (id)         => client.get(`/expenses/${id}/splits`);
export const getTimeline    = (limit = 200)  =>
  client.get(`${ENDPOINTS.timeline}?limit=${limit}`);
export const getPersonalExpenses = ()        => client.get(ENDPOINTS.personalExpenses);
export const deletePersonalExpense = (id)    =>
  client.delete(ENDPOINTS.delPersonalExpense(id));
export const addIncome      = (payload)      => client.post(ENDPOINTS.income, payload);
export const deleteIncome   = (id)           => client.delete(ENDPOINTS.delIncome(id));