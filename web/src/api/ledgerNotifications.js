// web/src/api/ledgerNotifications.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getLedgerNotifs   = () => api.get(ENDPOINTS.ledgerNotifs);
export const getLedgerUnread   = () => api.get(ENDPOINTS.ledgerUnreadCount);
export const markLedgerRead    = (id) => api.post(ENDPOINTS.ledgerNotifRead(id));
export const markAllLedgerRead = () => api.post(ENDPOINTS.ledgerNotifReadAll);
export const markCategoryRead  = (category) => api.post(ENDPOINTS.ledgerNotifReadCategory(category));