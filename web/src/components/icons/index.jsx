// web/src/components/icons/index.jsx
//
// Icon system for SplitEase web.
//
// Rule of thumb:
//   - Generic UI icons (search, trash, chevrons, eye, lock, alerts...) →
//     re-exported from lucide-react. Don't hand-roll icons that already
//     exist in a maintained, audited library.
//   - Domain-specific icons (rupee-based lend/borrow, settlement badge,
//     entry-type tabs) → hand-drawn here, since no library covers these.
//
// All icons here are FUNCTION COMPONENTS — size/color/className are real
// props, not baked into a static SVG string.

import {
  Search, Trash2, Plus, RefreshCw, Copy, Check, X, Eye, EyeOff,
  ChevronLeft, ChevronRight, ChevronDown, Lock, Mail, Wallet, Users, LogOut,
  User, Bell, BellOff, CheckSquare, Square, CalendarDays, ExternalLink,
  ArrowUpRight, ArrowDownLeft, ArrowUp, ArrowDown, Clock, Zap, List,
  LayoutGrid, Archive, History, Info, AlertTriangle, Moon, Sun, Settings,
  LayoutDashboard, Receipt, ArrowUpDown, UserPlus, Sparkles, Inbox,
  PartyPopper, FileText, Edit3, MoreVertical, CheckCircle,
  TrendingUp, HandCoins, Handshake,
} from "lucide-react";

// ─── Re-exported generic icons (lucide) ──────────────────────────────────
// Keeping these under our own `Icons` namespace means call sites never
// import lucide directly — if we ever swap libraries, only this file changes.
export const Icons = {
  search: Search,
  trash: Trash2,
  plus: Plus,
  refresh: RefreshCw,
  copy: Copy,
  check: Check,
  close: X,
  eye: Eye,
  eyeOff: EyeOff,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  lock: Lock,
  mail: Mail,
  wallet: Wallet,
  users: Users,
  logout: LogOut,
  profile: User,
  bell: Bell,
  bellOff: BellOff,
  checkSquare: CheckSquare,
  square: Square,
  calendarDays: CalendarDays,
  externalLink: ExternalLink,
  sendMoney: ArrowUpRight,
  receiveMoney: ArrowDownLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  clockPending: Clock,
  zap: Zap,
  list: List,
  grid: LayoutGrid,
  archive: Archive,
  history: History,
  info: Info,
  alertTriangle: AlertTriangle,
  moon: Moon,
  sun: Sun,
  settings: Settings,
  dashboard: LayoutDashboard,
  receipt: Receipt,
  settlement: ArrowUpDown,
  userPlus: UserPlus,
  sparkle: Sparkles,
  inboxZero: Inbox,
  celebrate: PartyPopper,
  document: FileText,
  edit: Edit3,
  more: MoreVertical,
  checkCircle: CheckCircle,
  trendingUp: TrendingUp,
  handCoins: HandCoins,
  handshake: Handshake,

  // ─── Domain-specific icons (hand-drawn, no lucide equivalent) ──────────
  personalExpense: ({ size = 22, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  ),

  groupExpense: ({ size = 22, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 20 Q5 14 12 14 Q19 14 19 20" />
      <circle cx="4" cy="9" r="2.2" strokeWidth="1.3" opacity="0.6" />
      <path d="M1 20 Q1 15 4 15" strokeWidth="1.3" opacity="0.6" />
      <circle cx="20" cy="9" r="2.2" strokeWidth="1.3" opacity="0.6" />
      <path d="M23 20 Q23 15 20 15" strokeWidth="1.3" opacity="0.6" />
    </svg>
  ),

      
        income: ({ size = 22, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
    </svg>
  ),

  lendMoney: ({ size = 22, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20 Q4 15 9 15 L15 13 Q20 13 20 17" />
      <line x1="20" y1="17" x2="23" y2="14" />
    </svg>
  ),

  borrowMoney: ({ size = 22, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20 Q4 15 9 15 L15 13 Q20 13 20 17" />
      <line x1="1" y1="14" x2="4" y2="17" />
    </svg>
  ),

  moneyLent: ({ size = 18, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <line x1="12" y1="19" x2="12" y2="7" />
      <polyline points="7 12 12 7 17 12" />
      <path d="M4 20 Q12 23 20 20" />
    </svg>
  ),

  moneyBorrowed: ({ size = 18, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <line x1="12" y1="5" x2="12" y2="17" />
      <polyline points="7 12 12 17 17 12" />
      <path d="M4 4 Q12 1 20 4" />
    </svg>
  ),

  receiveBack: ({ size = 16, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 12 Q3 6 9 4 L15 4" />
      <polyline points="12 1 15 4 12 7" />
      <rect x="9" y="13" width="12" height="8" rx="2" />
      <line x1="12" y1="17" x2="18" y2="17" />
    </svg>
  ),

  paymentSettled: ({ size = 24, color = "currentColor", ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.76Z" />
      <circle cx="12" cy="12" r="5.5" />
      <polyline points="10 12 11.5 13.5 14.5 10.5" />
    </svg>
  ),
};

// ─── Category icons (expense category badges) ───────────────────────────
export const CATEGORY_ICONS = {
  'Travel':        { Icon: Icons.sendMoney,    color: "#60a5fa" },
  'Food & Dining': { Icon: Icons.receipt,      color: "#fb923c" },
  'Shopping':      { Icon: Icons.wallet,       color: "#f472b6" },
  'Transport':     { Icon: Icons.sendMoney,    color: "#38bdf8" },
  'Entertainment': { Icon: Icons.sparkle,      color: "#c084fc" },
  'Utilities':     { Icon: Icons.zap,          color: "#fde047" },
  'Groceries':     { Icon: Icons.wallet,       color: "#4ade80" },
  'Health':        { Icon: Icons.zap,          color: "#f87171" },
  'Accommodation': { Icon: Icons.wallet,       color: "#a78bfa" },
  'Activities':    { Icon: Icons.zap,          color: "#facc15" },
};

// ─── Entry-type → icon/color map (timeline, activity feed) ──────────────
// Matches mobile's constants/entryTypeIcons.js exactly — same lucide
// glyphs, same bg/color per type. Repayments and settlements all use
// the plain check-circle badge (not the hand-drawn scalloped one).
export const TYPE_ICONS = {
  personal_expense:        { Icon: Icons.receipt,      bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  group_expense:           { Icon: Icons.users,         bg: "rgba(37,99,235,0.12)",   color: "#60a5fa" },
  group_expense_owed:      { Icon: Icons.users,         bg: "rgba(37,99,235,0.12)",   color: "#60a5fa" },
  settlement_sent:         { Icon: Icons.checkCircle,   bg: "rgba(239,68,68,0.10)",   color: "#f87171" },
  income:                  { Icon: Icons.trendingUp,    bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  settlement_received:     { Icon: Icons.checkCircle,   bg: "rgba(99,102,241,0.12)",  color: "#10b981" },
  loan_given:               { Icon: Icons.handCoins,    bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  loan_taken:               { Icon: Icons.wallet,       bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  loan_repayment_received:  { Icon: Icons.checkCircle,  bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  loan_repayment_paid:      { Icon: Icons.checkCircle,  bg: "rgba(239,68,68,0.10)",   color: "#f87171" },
  loan_settlement:          { Icon: Icons.handshake,    bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
};