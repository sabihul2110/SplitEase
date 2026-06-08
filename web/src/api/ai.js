// SplitEase/web/src/api/ai.js

import api from "./client.js";

export const scanReceipt = (formData) => api.post("/ai/scan-receipt", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});