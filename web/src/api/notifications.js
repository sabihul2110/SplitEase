// SplitEase/web/src/api/notifications.js


import api from "./client.js";

export const getNotificationCount    = ()           => api.get("/notifications/unread-count");
export const getNotifications        = (limit, offset) => api.get(`/notifications/?limit=${limit}&offset=${offset}`);
export const markRead                = (id)         => api.post(`/notifications/read/${id}`);
export const markAllRead             = ()           => api.post("/notifications/read-all");
export const deleteNotification      = (id)         => api.delete(`/notifications/${id}`);
export const deleteReadNotifications = ()           => api.delete("/notifications/read");