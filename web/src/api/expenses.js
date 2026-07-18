// SplitEase/web/src/api/expenses.js

import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getExpenses         = (groupId) => api.get(ENDPOINTS.expenses(groupId));
export const addExpense          = (groupId, data) => api.post(ENDPOINTS.addExpense(groupId), data);
export const editExpense         = (id, data) => api.put(ENDPOINTS.delExpense(id), data);
export const deleteExpense       = (id) => api.delete(ENDPOINTS.delExpense(id));
export const getSettlementStatus = (groupId) => api.get(ENDPOINTS.settlementStatus(groupId));
export const getExpenseSplits    = (groupId, expenseId) => api.get(ENDPOINTS.expenseSplits(groupId, expenseId));
export const getCategories       = () => api.get(ENDPOINTS.categories);
export const getSubcategories    = (catId) => api.get(ENDPOINTS.subcategories(catId));

export const getTimeline = (limit = 200) => api.get(`${ENDPOINTS.timeline}?limit=${limit}`);
export const downloadStatement = (startDate, endDate, label, periodType = "range") => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);
  if (label) qs.set("label", label);
  qs.set("period_type", periodType);
  return api.get(`${ENDPOINTS.statement}?${qs.toString()}`, { responseType: "blob" });
};

export const getPersonalExpenses   = () => api.get(ENDPOINTS.personalExpenses);
export const addPersonalExpense    = (data) => api.post(ENDPOINTS.personalExpenses, data);
export const deletePersonalExpense = (id)   => api.delete(ENDPOINTS.delPersonalExpense(id));

export const addIncome    = (data) => api.post(ENDPOINTS.income, data);
export const deleteIncome = (id)   => api.delete(ENDPOINTS.delIncome(id));