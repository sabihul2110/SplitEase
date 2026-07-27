// SplitEase/shared/endpoints.js
//
// Canonical API path templates — no platform prefix baked in. Both
// mobile/src/config/api.js and web/src/config/api.js import this and
// build their own ENDPOINTS object:
//   - mobile prepends '/api/v1' (its axios baseURL is just BASE_URL)
//   - web does NOT prepend it (its axios baseURL already includes /api/v1)
// This is the single place to add/change/remove an endpoint — edit here,
// both platforms pick it up automatically.

export const ENDPOINT_PATHS = {
  // Auth
  login:               '/auth/login',
  signup:              '/auth/signup',
  me:                  '/auth/me',
  forgotPassword:      '/auth/forgot-password',
  resetPassword:       '/auth/reset-password',
  verifyEmail:         '/auth/verify-email',
  resendVerification:  '/auth/resend-verification',
  changePass:          '/auth/change-password',

  // Groups
  groups:            '/groups/',
  groupMembers:      (id) => `/groups/${id}/members`,
  createGroup:       '/groups/',
  allGroups:         '/groups/all',
  wipeAllGroups:     '/groups/admin/wipe-groups',
  categories:        '/groups/categories',
  subcategories:     (catId) => `/groups/subcategories/${catId}`,
  membersBulk:       '/groups/members-bulk',
  hasExpensesBulk:   '/groups/has-expenses-bulk',
  deleteGroup:       (id) => `/groups/${id}`,
  leaveGroup:        (groupId, userId) => `/groups/${groupId}/members/${userId}`,
  remind:            (groupId) => `/groups/${groupId}/remind`,

  // Invites
  generateInvite: (groupId) => `/groups/${groupId}/invite`,
  inviteInfo:     (token)   => `/invite/${token}`,
  joinInvite:     (token)   => `/invite/${token}/join`,

  // Expenses
  expenses:         (groupId) => `/expenses/${groupId}`,
  addExpense:       (groupId) => `/expenses/${groupId}`,
  delExpense:       (id)      => `/expenses/${id}`,
  expenseSplits:    (groupId, expenseId) => `/expenses/${groupId}/${expenseId}/splits`,
  settlementStatus: (groupId) => `/expenses/${groupId}/settlement-status`,

  // Payments
  payments:      (groupId) => `/payments/${groupId}`,
  addPayment:    (groupId) => `/payments/${groupId}`,
  delPayment:    (id)      => `/payments/${id}`,
  pendingSplits: (groupId, debtorId, creditorId) =>
    `/payments/pending-splits/${groupId}?debtor_id=${debtorId}&creditor_id=${creditorId}`,

  // Settlements
  settlementsBulk:       '/settlements/bulk',
  settlementsSimplified: (groupId) => `/settlements/${groupId}/simplified`,
  settlementsRaw:        (groupId) => `/settlements/${groupId}`,

  // Timeline
  timeline:  '/timeline/',
  statement: '/timeline/statement',

  // Notifications
  notifCount:    '/notifications/unread-count',
  notifs:        '/notifications/',
  readNotif:     (id) => `/notifications/read/${id}`,
  readAll:       '/notifications/read-all',
  delNotif:      (id) => `/notifications/${id}`,
  delReadNotifs: '/notifications/read',

  // Users
  users:           '/users/',
  allUsers:        '/users/all',
  updateMe:        '/users/me',
  resetData:       '/users/reset-my-data',
  forceResetData:  '/users/reset-my-data/force',
  adminWipe:       '/users/admin-wipe',
  userSearch:      (q) => `/users/search?q=${encodeURIComponent(q)}`,
  pushToken:       '/users/push-token',
  deleteUser:      (id) => `/users/${id}`,

  // Loans / Borrows
  loans:      '/loans/',
  loanRepay:  (id) => `/loans/${id}/repay`,
  delLoan:    (id) => `/loans/${id}`,
  borrows:     '/borrows/',
  borrowRepay: (id) => `/borrows/${id}/repay`,
  delBorrow:   (id) => `/borrows/${id}`,

  // Personal expenses / Income
  personalExpenses:   '/personal-expenses/',
  delPersonalExpense: (id) => `/personal-expenses/${id}/`,
  income:    '/income/',
  delIncome: (id) => `/income/${id}/`,

  // People / Ledger
  people:              '/people/',
  personDetail:        (id) => `/people/${id}`,
  deletePerson:        (id) => `/people/${id}`,
  personEntries:       (id) => `/people/${id}/entries`,
  addEntry:            (id) => `/people/${id}/entries`,
  repayEntry:          (id) => `/people/entries/${id}/repay`,
  deleteEntry:         (id) => `/people/entries/${id}`,
  acceptEntry:         (id) => `/people/entries/${id}/accept`,
  rejectEntry:         (id) => `/people/entries/${id}/reject`,
  pendingRequests:     '/people/pending-requests',
  settleUp:            (id) => `/people/${id}/settle`,
  sentRequests:        '/people/sent-requests',
  pendingRepayments:   '/people/pending-repayments',
  sentRepayments:      '/people/sent-repayments',
  acceptRepayment:     (id) => `/people/repayments/${id}/accept`,
  rejectRepayment:     (id) => `/people/repayments/${id}/reject`,
  cancelRepayment:     (id) => `/people/repayments/${id}`,
  pendingSettlements:  '/people/pending-settlements',
  sentSettlements:     '/people/sent-settlements',
  acceptSettlement:    (id) => `/people/settlements/${id}/accept`,
  rejectSettlement:    (id) => `/people/settlements/${id}/reject`,
  cancelSettlement:    (id) => `/people/settlements/${id}`,

  // Ledger notifications
  ledgerNotifs:            '/ledger-notifications/',
  ledgerUnreadCount:       '/ledger-notifications/unread-count',
  ledgerNotifRead:         (id) => `/ledger-notifications/${id}/read`,
  ledgerNotifReadAll:      '/ledger-notifications/read-all',
  ledgerNotifReadCategory: (category) => `/ledger-notifications/read-category/${category}`,

  // Quick templates (mobile-only feature today)
  quickTemplates:        '/quick-templates/',
  quickTemplateById:     (id) => `/quick-templates/${id}`,
  quickTemplateExecute:  (id) => `/quick-templates/${id}/execute`,

  // Recurring bills (mobile-only feature today)
  recurringBills:    '/recurring-bills/',
  recurringBillById: (id) => `/recurring-bills/${id}`,

  // Pending bills (mobile-only feature today)
  pendingBills:        '/pending-bills/',
  pendingBillPay:      (id) => `/pending-bills/${id}/pay`,
  pendingBillDismiss:  (id) => `/pending-bills/${id}/dismiss`,

  // Routines (mobile-only feature today)
  routines:        '/routines/',
  routineById:     (id) => `/routines/${id}`,
  routineExecute:  (id) => `/routines/${id}/execute`,
  routineStatus:   '/routines/status',
  routineSkip:     (id) => `/routines/${id}/skip`,
  routineUnskip:   (id, skipDate) => `/routines/${id}/skip/${skipDate}`,

  // AI (web-only feature today)
  scanReceipt: '/ai/scan-receipt',
};