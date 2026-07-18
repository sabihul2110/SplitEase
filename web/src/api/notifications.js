// SplitEase/web/src/api/notifications.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getNotificationCount    = ()           => api.get(ENDPOINTS.notifCount);
export const getNotifications        = (limit, offset) => api.get(`${ENDPOINTS.notifs}?limit=${limit}&offset=${offset}`);
export const markRead                = (id)         => api.post(ENDPOINTS.readNotif(id));
export const markAllRead             = ()           => api.post(ENDPOINTS.readAll);
export const deleteNotification      = (id)         => api.delete(ENDPOINTS.delNotif(id));
export const deleteReadNotifications = ()           => api.delete(ENDPOINTS.delReadNotifs);