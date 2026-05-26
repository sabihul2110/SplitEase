// SplitEase/mobile/src/constants/api.js

/**
 * api.js
 * Central API config. Matches the real backend exactly.
 */

export const BASE_URL    = 'https://splitease-4hcc.onrender.com';
export const STORAGE_KEY = 'splitease_user';

export const ENDPOINTS = {
  // Auth
  login:  '/auth/login',
  signup: '/auth/signup',
  me:     '/auth/me',

  // Groups
  groups:            '/groups/',
  groupMembers:      (id) => `/groups/${id}/members`,
  createGroup:       '/groups/',
  categories:        '/groups/categories',
  subcategories:     (catId) => `/groups/subcategories/${catId}`,
  membersBulk:       '/groups/members-bulk',
  hasExpensesBulk:   '/groups/has-expenses-bulk',

  // Expenses
  expenses:    (groupId) => `/expenses/${groupId}`,
  addExpense:  (groupId) => `/expenses/${groupId}`,
  delExpense:  (id)      => `/expenses/${id}`,

  // Payments
  payments:    (groupId) => `/payments/${groupId}`,
  addPayment:  (groupId) => `/payments/${groupId}`,
  delPayment:  (id)      => `/payments/${id}`,

  // Settlements
  settlementsBulk:       '/settlements/bulk',
  settlementsSimplified: (groupId) => `/settlements/${groupId}/simplified`,
  settlementsRaw:        (groupId) => `/settlements/${groupId}`,

  // Timeline (single endpoint for all activity types)
  timeline: '/timeline/',

  // Notifications
  notifCount: '/notifications/unread-count',
  notifs:     '/notifications/',
  readNotif:  (id) => `/notifications/read/${id}`,
  readAll:    '/notifications/read-all',

  // Users / Profile
  users:      '/users/',
  updateMe:   '/users/me',
  changePass: '/auth/change-password',
  resetData:  '/users/reset-my-data',
  adminWipe:  '/users/admin-wipe',

  // Loans (money lent by current user)
  loans:      '/loans/',
  loanRepay:  (id) => `/loans/${id}/repay/`,
  delLoan:    (id) => `/loans/${id}/`,

  // Borrows (money borrowed by current user)
  borrows:     '/borrows/',
  borrowRepay: (id) => `/borrows/${id}/repay/`,
  delBorrow:   (id) => `/borrows/${id}/`,

  // Personal expenses
  personalExpenses:   '/personal-expenses/',
  delPersonalExpense: (id) => `/personal-expenses/${id}/`,

  // Income
  income:    '/income/',
  delIncome: (id) => `/income/${id}/`,

  // Invites
  generateInvite: (groupId) => `/groups/${groupId}/invite`,
  inviteInfo:     (token)   => `/invite/${token}`,
  joinInvite:     (token)   => `/invite/${token}/join`,

  // Reminders
  remind: (groupId) => `/groups/${groupId}/remind`,
};