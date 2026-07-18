// SplitEase/web/src/api/ai.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const scanReceipt = (formData) => api.post(ENDPOINTS.scanReceipt, formData, {
  headers: { "Content-Type": "multipart/form-data" },
});