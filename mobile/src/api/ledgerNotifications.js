// SplitEase/mobile/src/api/ledgerNotifications.js


import client from './client';
import { ENDPOINTS } from '../config/api';

export const getLedgerNotifs    = ()   => client.get(ENDPOINTS.ledgerNotifs);
export const getLedgerUnread    = ()   => client.get(ENDPOINTS.ledgerUnreadCount);
export const markLedgerRead     = (id) => client.post(ENDPOINTS.ledgerNotifRead(id));
export const markAllLedgerRead  = ()   => client.post(ENDPOINTS.ledgerNotifReadAll);