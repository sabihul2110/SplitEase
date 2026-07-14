// web/src/api/ledgerNotifications.js
import api from "./client.js";

export const getLedgerNotifs   = () => api.get("/ledger-notifications/");
export const getLedgerUnread   = () => api.get("/ledger-notifications/unread-count");
export const markLedgerRead    = (id) => api.post(`/ledger-notifications/${id}/read`);
export const markAllLedgerRead = () => api.post("/ledger-notifications/read-all");
export const markCategoryRead  = (category) => api.post(`/ledger-notifications/read-category/${category}`);