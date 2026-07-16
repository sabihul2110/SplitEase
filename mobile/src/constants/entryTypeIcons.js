// mobile/src/constants/entryTypeIcons.js
//
// USED IN:
//   - ExpensesScreen.jsx  → EntryRow (fallback icon for income/loan/settlement rows;
//                            personal_expense & group_expense rows prefer categoryIcons.js instead)
//   - ActivityScreen.jsx  → ActivityRow (same split as above)


import {
  Receipt,
  Users,
  TrendingUp,
  CheckCircle2,
  HandCoins,
  Wallet,
} from "lucide-react-native";

export const TYPE_ICONS = {
  personal_expense:        { Icon: Receipt,      bg: "rgba(239,68,68,0.12)",  color: "#f87171" },
  group_expense:           { Icon: Users,        bg: "rgba(37,99,235,0.12)",  color: "#f87171" },
  group_expense_owed:      { Icon: Users,        bg: "rgba(37,99,235,0.12)",  color: "#f87171" },
  settlement_sent:         { Icon: CheckCircle2, bg: "rgba(239,68,68,0.10)",  color: "#f87171" },
  income:                  { Icon: TrendingUp,   bg: "rgba(16,185,129,0.12)", color: "#10b981" },
  settlement_received:     { Icon: CheckCircle2, bg: "rgba(99,102,241,0.12)", color: "#10b981" },
  loan_given:               { Icon: HandCoins,    bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  loan_taken:               { Icon: Wallet,       bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  loan_repayment_received:  { Icon: CheckCircle2, bg: "rgba(16,185,129,0.12)", color: "#10b981" },
  loan_repayment_paid:      { Icon: CheckCircle2, bg: "rgba(239,68,68,0.10)",  color: "#f87171" },
};