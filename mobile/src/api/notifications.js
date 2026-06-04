// SplitEase/mobile/src/api/loans.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getNotifs      = ()   => client.get(ENDPOINTS.notifs);
export const getUnreadCount = ()   => client.get(ENDPOINTS.notifCount);
export const markRead       = (id) => client.post(ENDPOINTS.readNotif(id));
export const markAllRead    = ()   => client.post(ENDPOINTS.readAll);
export const deleteNotif    = (id) => client.delete(ENDPOINTS.delNotif(id));
export const deleteReadNotifs = () => client.delete(ENDPOINTS.delReadNotifs);