// frontend/src/utils/icons.jsx

export const Icons = {

  // ── AddEntry Modal tabs ──────────────────────────────

  personalExpense: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="6" y1="15" x2="10" y2="15"/>
    </svg>
  ),

  income: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 3 12 15"/>
      <polyline points="7 10 12 15 17 10"/>
      <path d="M4 19 Q12 22 20 19"/>
    </svg>
  ),

  lendMoney: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20 Q4 15 9 15 L15 13 Q20 13 20 17"/>
      <line x1="20" y1="17" x2="23" y2="14"/>
    </svg>
  ),

  borrowMoney: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20 Q4 15 9 15 L15 13 Q20 13 20 17"/>
      <line x1="1" y1="14" x2="4" y2="17"/>
    </svg>
  ),

  groupExpense: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="3"/>
      <path d="M5 20 Q5 14 12 14 Q19 14 19 20"/>
      <circle cx="4" cy="9" r="2.2" strokeWidth="1.3" opacity="0.6"/>
      <path d="M1 20 Q1 15 4 15" strokeWidth="1.3" opacity="0.6"/>
      <circle cx="20" cy="9" r="2.2" strokeWidth="1.3" opacity="0.6"/>
      <path d="M23 20 Q23 15 20 15" strokeWidth="1.3" opacity="0.6"/>
    </svg>
  ),

  settlement: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="8 12 11 15 16 9" strokeWidth="2"/>
    </svg>
  ),

  // ── Lending page tabs ────────────────────────────────

  moneyLent: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="7"/>
      <polyline points="7 12 12 7 17 12"/>
      <path d="M4 20 Q12 23 20 20"/>
    </svg>
  ),

  moneyBorrowed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="17"/>
      <polyline points="7 12 12 17 17 12"/>
      <path d="M4 4 Q12 1 20 4"/>
    </svg>
  ),

  // ── Utility (for loan "Receive Back" button) ─────────

  receiveBack: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 Q3 6 9 4 L15 4"/>
      <polyline points="12 1 15 4 12 7"/>
      <rect x="9" y="13" width="12" height="8" rx="2"/>
      <line x1="12" y1="17" x2="18" y2="17"/>
    </svg>
  ),

};