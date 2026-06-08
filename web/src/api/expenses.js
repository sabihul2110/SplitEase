// SplitEase/web/src/api/expenses.js

import api from "./client.js";

export const getExpenses      = (groupId) => api.get(`/expenses/${groupId}`);
export const createExpense    = (groupId, data) => api.post(`/expenses/${groupId}`, data);
export const deleteExpense    = (id) => api.delete(`/expenses/${id}`);
export const getCategories    = () => api.get("/groups/categories");
export const getSubcategories = (catId) => api.get(`/groups/subcategories/${catId}`);