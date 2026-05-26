// SplitEase/mobile/src/constants/api.js

/**
 * api.js
 * Central place for API URL and storage keys.
 * Change BASE_URL here for dev ↔ prod switching.
 */

export const BASE_URL = 'https://splitease-kfda.onrender.com';

export const STORAGE_KEY = 'splitease_user'; // AsyncStorage key

export const ENDPOINTS = {
  // Auth
  login:    '/auth/login',
  signup:   '/auth/signup',
  me:       '/auth/me',

  // Groups
  groups:       '/groups/',
  groupMembers: (id) => `/groups/${id}/members`,
  createGroup:  '/groups/',

  // Expenses
  expenses:    (groupId) => `/expenses/${groupId}`,
  addExpense:  (groupId) => `/expenses/${groupId}`,
  delExpense:  (id)      => `/expenses/${id}`,

  // Settlements
  settlements: (groupId) => `/settlements/${groupId}/simplified`,

  // Timeline / Activity
  timeline: '/timeline/',

  // Notifications
  notifCount: '/notifications/unread-count',
  notifs:     '/notifications/',
  readNotif:  (id) => `/notifications/read/${id}`,
  readAll:    '/notifications/read-all',

  // Users
  users:      '/users/',
  resetData:  '/users/reset-my-data',
  adminWipe:  '/users/admin-wipe',
};