// SplitEase/web/src/api/expenses.js

import api from "./client.js";

export const getExpenses         = (groupId) => api.get(`/expenses/${groupId}`);
export const addExpense          = (groupId, data) => api.post(`/expenses/${groupId}`, data);
export const editExpense         = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense       = (id) => api.delete(`/expenses/${id}`);
export const getSettlementStatus = (groupId) => api.get(`/expenses/${groupId}/settlement-status`);
export const getExpenseSplits    = (id) => api.get(`/expenses/${id}/splits`);
export const getCategories       = () => api.get("/groups/categories");
export const getSubcategories    = (catId) => api.get(`/groups/subcategories/${catId}`);

export const getTimeline = (limit = 200) => api.get(`/timeline/?limit=${limit}`);
export const downloadStatement = (startDate, endDate, label, periodType = "range") => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);
  if (label) qs.set("label", label);
  qs.set("period_type", periodType);
  return api.get(`/timeline/statement?${qs.toString()}`, { responseType: "blob" });
};

export const getPersonalExpenses   = () => api.get("/personal-expenses/");
export const addPersonalExpense    = (data) => api.post("/personal-expenses/", data);
export const deletePersonalExpense = (id)   => api.delete(`/personal-expenses/${id}/`);

export const addIncome    = (data) => api.post("/income/", data);
export const deleteIncome = (id)   => api.delete(`/income/${id}/`);