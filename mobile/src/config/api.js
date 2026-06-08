// SplitEase/mobile/src/config/api.js

/**
 * api.js
 * Central API config. Matches the real backend exactly.
 */


// 🎚️ TOGGLE THIS: Set to 'true' to use laptop's Python backend
const USE_LOCAL_BACKEND = false; 

export const BASE_URL = (__DEV__ && USE_LOCAL_BACKEND)
  ? 'http://192.168.29.115:8000'
  : 'https://splitease-4hcc.onrender.com';


export const STORAGE_KEY = 'splitease_user';


const V1 = '/api/v1';

export const ENDPOINTS = {
  // Auth
  login:           `${V1}/auth/login`,
  signup:          `${V1}/auth/signup`,
  me:              `${V1}/auth/me`,
  forgotPassword:  `${V1}/auth/forgot-password`,
  resetPassword:   `${V1}/auth/reset-password`,

  // Groups
  groups:            `${V1}/groups/`,
  groupMembers:      (id) => `${V1}/groups/${id}/members`,
  createGroup:       `${V1}/groups/`,
  categories:        `${V1}/groups/categories`,
  subcategories:     (catId) => `${V1}/groups/subcategories/${catId}`,
  membersBulk:       `${V1}/groups/members-bulk`,
  hasExpensesBulk:   `${V1}/groups/has-expenses-bulk`,
  deleteGroup:       (id) => `${V1}/groups/${id}`,

  // Expenses
  expenses:    (groupId) => `${V1}/expenses/${groupId}`,
  addExpense:  (groupId) => `${V1}/expenses/${groupId}`,
  delExpense:  (id)      => `${V1}/expenses/${id}`,

  // Payments
  payments:    (groupId) => `${V1}/payments/${groupId}`,
  addPayment:  (groupId) => `${V1}/payments/${groupId}`,
  delPayment:  (id)      => `${V1}/payments/${id}`,

  // Settlements
  settlementsBulk:       `${V1}/settlements/bulk`,
  settlementsSimplified: (groupId) => `${V1}/settlements/${groupId}/simplified`,
  settlementsRaw:        (groupId) => `${V1}/settlements/${groupId}`,

  // Timeline (single endpoint for all activity types)
  timeline: `${V1}/timeline/`,

  // Notifications
  notifCount: `${V1}/notifications/unread-count`,
  notifs:     `${V1}/notifications/`,
  readNotif:  (id) => `${V1}/notifications/read/${id}`,
  readAll:    `${V1}/notifications/read-all`,
  delNotif:       (id) => `${V1}/notifications/${id}`,
  delReadNotifs:  `${V1}/notifications/read`,

  // Users / Profile
  users:      `${V1}/users/`,
  updateMe:   `${V1}/users/me`,
  changePass: `${V1}/auth/change-password`,
  resetData:  `${V1}/users/reset-my-data`,
  adminWipe:  `${V1}/users/admin-wipe`,

  // Loans (money lent by current user)
  loans:      `${V1}/loans/`,
  loanRepay:  (id) => `${V1}/loans/${id}/repay`,
  delLoan:    (id) => `${V1}/loans/${id}`,

  // Borrows (money borrowed by current user)
  borrows:     `${V1}/borrows/`,
  borrowRepay: (id) => `${V1}/borrows/${id}/repay`,
  delBorrow:   (id) => `${V1}/borrows/${id}`,

  // Personal expenses
  personalExpenses:   `${V1}/personal-expenses/`,
  delPersonalExpense: (id) => `${V1}/personal-expenses/${id}/`,

  // Income
  income:    `${V1}/income/`,
  delIncome: (id) => `${V1}/income/${id}/`,

  // Invites
  generateInvite: (groupId) => `${V1}/groups/${groupId}/invite`,
  inviteInfo:     (token)   => `${V1}/invite/${token}`,
  joinInvite:     (token)   => `${V1}/invite/${token}/join`,

  // Reminders
  remind: (groupId) => `${V1}/groups/${groupId}/remind`,

  // Leave group
  leaveGroup: (groupId, userId) => `${V1}/groups/${groupId}/members/${userId}`,

  // Pending splits
  pendingSplits: (groupId, debtorId, creditorId) =>
    `${V1}/payments/pending-splits/${groupId}?debtor_id=${debtorId}&creditor_id=${creditorId}`,
};