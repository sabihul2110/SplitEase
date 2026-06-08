// SplitEase/web/src/api/personalExpenses.js

import api from "./client.js";
export const createPersonalExpense = (data) => api.post("/personal-expenses/", data);
export const deletePersonalExpense = (id)   => api.delete(`/personal-expenses/${id}/`);