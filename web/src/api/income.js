// SplitEase/web/src/api/income.js

import api from "./client.js";
export const createIncome = (data) => api.post("/income/", data);
export const deleteIncome = (id)   => api.delete(`/income/${id}/`);