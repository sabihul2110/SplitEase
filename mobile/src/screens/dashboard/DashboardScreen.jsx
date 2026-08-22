// SplitEase/mobile/src/screens/dashboard/DashboardScreen.jsx

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as expensesApi from "../../api/expenses";
import * as groupsApi from "../../api/groups";
import * as peopleApi from "../../api/people";
import * as notificationsApi from "../../api/notifications";
import * as settlementsApi from "../../api/settlements";
import * as pendingBillsApi from "../../api/pendingBills";
import * as routinesApi from "../../api/routines";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArch = global._IS_FABRIC === true;
  if (!isNewArch) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { LoadingState } from "../../components/common/Ui";
import { Icons } from "../../components/icons";
import { TemplateIcon, ICON_CHIP_BG, ICON_CHIP_COLOR } from "../../constants/templateIcons";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  TAB_BAR_HEIGHT,
} from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function dueDateInfo(dueDateStr) {
  const due = new Date(dueDateStr + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);
  const label = due.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (diffDays < 0) return { text: `Overdue · ${label}`, color: COLORS.danger };
  if (diffDays === 0) return { text: `Due today`, color: COLORS.warning };
  if (diffDays === 1) return { text: `Due tomorrow`, color: COLORS.warning };
  return { text: `Due ${label}`, color: COLORS.text2 };
}

function catchupDateLabel(dateStr) {
  if (dateStr === yesterdayStr()) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Top bar (Avatar → Account, Bell → Notifications) ───────────────────────


function TopBar({ initials, unreadCount = 0, onAvatar, onBell }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandWrap}>
        <Image
          source={require('../../../assets/adaptive-icon.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text style={styles.topBarBrand}>
          Split<Text style={{ color: COLORS.primary }}>Ease</Text>
        </Text>
      </View>
      <View style={styles.topBarRight}>
        <TouchableOpacity
          style={styles.topBarIconBtn}
          onPress={onBell}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.bell size={20} color={COLORS.text2} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topBarAvatar}
          onPress={onAvatar}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.topBarAvatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Hero card (unchanged) ───────────────────────────────────────────────────
function HeroCard({ user, groupCount, accountBalance }) {
  const isPositive = accountBalance >= 0;
  const balColor = isPositive ? COLORS.success : COLORS.danger;

  return (
    <View style={styles.hero}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.userName}>Sabihul</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={styles.heroGroupsPill}>
            <Text style={styles.heroGroupsPillText}>
              {groupCount} group{groupCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.heroBalanceBlock}>
        <Text style={styles.heroBalanceLabel}>ACCOUNT BALANCE</Text>
        <Text style={[styles.heroBalanceVal, { color: balColor }]}>
          {isPositive ? "+" : "−"}₹{fmt(Math.abs(accountBalance))}
        </Text>
      </View>
    </View>
  );
}

// ── Balance summary — tight list-style card with two expandable rows ───────
function BalanceRow({ label, value, color, breakdown, expanded, onToggle }) {
  const hasBreakdown = breakdown && breakdown.length > 0;
  return (
    <View>
      <TouchableOpacity
        style={styles.balRow}
        activeOpacity={hasBreakdown ? 0.6 : 1}
        onPress={hasBreakdown ? onToggle : undefined}
      >
        <Text style={styles.balLabel}>{label}</Text>
        <View style={styles.balRight}>
          <Text style={[styles.balValue, { color }]}>₹{fmt(value)}</Text>
          {hasBreakdown && (
            <Text style={styles.balChevron}>{expanded ? "▴" : "▾"}</Text>
          )}
        </View>
      </TouchableOpacity>
      {hasBreakdown && expanded && (
        <View style={styles.balBreakdownList}>
          {breakdown.map((b, i) => {
            const Wrapper = b.onPress ? TouchableOpacity : View;
            return (
              <Wrapper
                key={i}
                onPress={b.onPress}
                style={styles.balBreakdownRow}
                {...(b.onPress ? { activeOpacity: 0.6 } : {})}
              >
                <Text style={styles.balBreakdownLabel} numberOfLines={1}>{b.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={[styles.balBreakdownVal, { color }]}>₹{fmt(b.value)}</Text>
                  {b.onPress && <Text style={styles.balBreakdownChevron}>›</Text>}
                </View>
              </Wrapper>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BalanceSummaryCard({ owedToYou, youOwe, owedBreakdown, oweBreakdown }) {
  const [expandedRow, setExpandedRow] = useState(null); // 'owed' | 'owe' | null

  function toggle(row) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRow((p) => (p === row ? null : row));
  }

  return (
    <View style={styles.balCard}>
      <BalanceRow
        label="You are owed"
        value={owedToYou}
        color={COLORS.success}
        breakdown={owedBreakdown}
        expanded={expandedRow === "owed"}
        onToggle={() => toggle("owed")}
      />
      <View style={styles.balDivider} />
      <BalanceRow
        label="You owe"
        value={youOwe}
        color={youOwe > 0 ? COLORS.danger : COLORS.text2}
        breakdown={oweBreakdown}
        expanded={expandedRow === "owe"}
        onToggle={() => toggle("owe")}
      />
    </View>
  );
}

// ── Quick actions — slim 4-icon row, no boxes ───────────────────────────────
function QuickActionIcon({ label, color, icon: IconComp, onPress }) {
  return (
    <TouchableOpacity style={styles.qaItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.qaCircle, { backgroundColor: color + "16" }]}>
        <IconComp size={20} color={color} />
      </View>
      <Text style={styles.qaItemLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Section wrapper (Routines / Bills) ──────────────────────────────────────
function SectionCard({ title, count, actionLabel, onAction, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHead}>
        <View style={styles.sectionCardTitleWrap}>
          <Text style={styles.sectionCardTitle}>{title}</Text>
          {count > 0 && !actionLabel && (
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{count}</Text>
            </View>
          )}
        </View>
        
        {actionLabel && (
          <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ── Routine row ──────────────────────────────────────────────────────────
const ROUTINE_STATUS_META = {
  done:           { label: "Done today",   color: COLORS.success },
  pending:        { label: "Log today",    color: COLORS.warning },
  skipped:        { label: "Skipped",      color: COLORS.text3 },
  inactive_today: { label: "Not due today", color: COLORS.text3 },
};

function RoutineRow({ routine, onLogToday, onLogDate, onSkipDate, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ROUTINE_STATUS_META[routine.today_status] || ROUTINE_STATUS_META.pending;
  const hasCatchup = routine.pending_catchup_dates.length > 0;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((p) => !p);
  }

  return (
    <View style={!isLast && styles.rowDivider}>
      <TouchableOpacity
        style={styles.routineRow}
        activeOpacity={0.75}
        onPress={() => {
          if (routine.today_status === "pending") onLogToday(routine);
          else if (hasCatchup) toggle();
        }}
      >
        <View style={styles.routineIcon}>
          <TemplateIcon name={routine.icon_name} size={16} color={ICON_CHIP_COLOR} />
        </View>
        <Text style={styles.routineName} numberOfLines={1}>{routine.name}</Text>
        <View style={[styles.routineBadge, { backgroundColor: meta.color + "18" }]}>
          <Text style={[styles.routineBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {hasCatchup && (
          <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.routineCatchupToggle}>
              {routine.pending_catchup_dates.length} missed {expanded ? "▴" : "▾"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {hasCatchup && expanded && (
        <View style={styles.catchupList}>
          {routine.pending_catchup_dates.map((d) => (
            <View key={d} style={styles.catchupRow}>
              <Text style={styles.catchupDate}>{catchupDateLabel(d)}</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                <TouchableOpacity style={styles.catchupLogBtn} onPress={() => onLogDate(routine, d)}>
                  <Text style={styles.catchupLogText}>Log</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.catchupSkipBtn} onPress={() => onSkipDate(routine, d)}>
                  <Text style={styles.catchupSkipText}>Not required</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Bill row — deep-links straight to PayBillScreen ─────────────────────────
function BillRow({ bill, onPress, isLast }) {
  const due = dueDateInfo(bill.due_date);
  const totalAmount = bill.total_amount || bill.amount || 0;
  const isShared = bill.is_shared;
  const yourShare = bill.your_share || 0;
  const groupSize = bill.group_size || 0;
  const subTitleType = isShared ? "Shared" : "Auto-pay";

  return (
    <TouchableOpacity
      style={[styles.billRow, !isLast && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.billIcon}>
        <TemplateIcon name={bill.icon_name} size={16} color={ICON_CHIP_COLOR} />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={styles.billName} numberOfLines={1}>{bill.name}</Text>
        <Text style={[styles.billDue, { color: due.color }]}>
          {due.text} <Text style={{ color: COLORS.text3 }}>• {subTitleType}</Text>
        </Text>
      </View>
      
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.billAmountText}>₹{fmt(totalAmount)}</Text>
        
        {isShared && yourShare > 0 ? (
          <Text style={styles.billSubAmountRed}>You owe ₹{fmt(yourShare)}</Text>
        ) : groupSize > 0 ? (
          <Text style={styles.billSubAmountGray}>Group of {groupSize}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
};


// ── Main screen ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [groupCount, setGroupCount] = useState(0);
  const [owedToYou, setOwedToYou] = useState(0);
  const [youOwe, setYouOwe] = useState(0);
  const [accountBalance, setAccountBalance] = useState(0);
  const [owedBreakdown, setOwedBreakdown] = useState([]);
  const [oweBreakdown, setOweBreakdown] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = (user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const { data: groupList } = await groupsApi.getGroups();
        setGroupCount((groupList || []).length);

        let owe = 0,
          owed = 0;
        const owedList = [];
        const oweList = [];

        if (groupList?.length) {
          const { data: bulkResult } = await settlementsApi.getSettlementsBulk(
            groupList.map((g) => g.group_id),
          );
          Object.entries(bulkResult).forEach(([gid, rows]) => {
            const myRow = rows.find((s) => s.user_id === user?.user_id);
            if (!myRow) return;
            const net = Number(myRow.net_balance);
            if (net === 0) return;
            const g = groupList.find((x) => String(x.group_id) === String(gid));
            const label = g?.group_name || `Group #${gid}`;
            const goToGroup = () =>
              navigation.navigate("Groups", {
                screen: "GroupDetail",
                params: { groupId: Number(gid), groupName: label },
              });
            if (net < 0) { owe += Math.abs(net); oweList.push({ label, value: Math.abs(net), onPress: goToGroup }); }
            if (net > 0) { owed += net;          owedList.push({ label, value: net, onPress: goToGroup }); }
          });
        }

        try {
          const { data: summary } = await expensesApi.getFinancialSummary();
          setAccountBalance(Number(summary?.account_balance || 0));
          owed += Number(summary?.loans_receivable || 0);
          owe += Number(summary?.borrows_payable || 0);
        } catch {
          setAccountBalance(0);
        }

        try {
          const { data: people } = await peopleApi.getPeople();
          (people || [])
            .filter((p) => Number(p.net_balance) !== 0)
            .forEach((p) => {
              const net = Number(p.net_balance);
              const goToPerson = () =>
                navigation.navigate("Loans", {
                  screen: "PersonLedger",
                  params: { personId: p.person_id, personName: p.display_name },
                });
              if (net > 0) {
                owedList.push({ label: `Owed by ${p.display_name}`, value: net, onPress: goToPerson });
              } else {
                oweList.push({ label: `Owed to ${p.display_name}`, value: Math.abs(net), onPress: goToPerson });
              }
            });
        } catch {}

        setOwedToYou(owed);
        setYouOwe(owe);
        setOwedBreakdown(owedList);
        setOweBreakdown(oweList);

        try {
          const { data: nc } = await notificationsApi.getUnreadCount();
          setUnreadCount(nc?.count || 0);
        } catch {}

        try {
          const { data: bills } = await pendingBillsApi.getPendingBills();
          const sorted = [...(bills || [])].sort((a, b) => a.due_date.localeCompare(b.due_date));
          setPendingBills(sorted);
        } catch {
          setPendingBills([]);
        }

        try {
          const { data: routineStatus } = await routinesApi.getRoutinesStatus();
          setRoutines(routineStatus || []);
        } catch {
          setRoutines([]);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.user_id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSkipDate(routine, dateStr) {
    try {
      await routinesApi.skipRoutineDay(routine.routine_id, dateStr);
      load(true);
    } catch (err) {
      console.error("Skip routine day failed:", err);
    }
  }

  function goToPendingBill(bill) {
    navigation.navigate("PayBill", { bill });
  }

  function goToRunRoutine(routine, initialDate) {
    navigation.navigate("Expenses", {
      screen: "RunRoutine",
      params: { routineId: routine.routine_id, initialDate },
    });
  }

  if (loading) return <LoadingState label="Loading dashboard…" />;

  const visibleRoutines = routines.filter(
    (r) => r.today_status !== "inactive_today" || r.pending_catchup_dates.length > 0,
  );
  const totalCatchups = visibleRoutines.reduce((s, r) => s + r.pending_catchup_dates.length, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT }]}
      >

        <TopBar
          initials={initials}
          unreadCount={unreadCount}
          onAvatar={() => navigation.navigate("Account")}
          onBell={() => {
            setUnreadCount(0);
            navigation.navigate("Notifications");
          }}
        />

        <View style={styles.grid}>
          <HeroCard 
            user={user} 
            groupCount={groupCount} 
            accountBalance={accountBalance} 
          />

          <BalanceSummaryCard
            owedToYou={owedToYou}
            youOwe={youOwe}
            owedBreakdown={owedBreakdown}
            oweBreakdown={oweBreakdown}
          />

          {/* Quick actions — slim 4-icon row, strict count */}
          <View style={styles.qaRow}>
            <QuickActionIcon
              label="Quick Entry"
              color={COLORS.success}
              icon={Icons.zap}
              onPress={() => navigation.navigate("Expenses", { screen: "QuickEntry" })}
            />
            <QuickActionIcon
              label="Groups"
              color={COLORS.primary}
              icon={Icons.groups}
              onPress={() => navigation.navigate("Groups")}
            />
            <QuickActionIcon
              label="Settle Up"
              color="#8b5cf6"
              icon={Icons.loansRupee}
              onPress={() => navigation.navigate("More", { screen: "Settlements" })}
            />
            <QuickActionIcon
              label="More"
              color={COLORS.warning}
              icon={Icons.more}
              onPress={() => navigation.navigate("More")}
            />
          </View>

          {visibleRoutines.length > 0 && (
            <SectionCard title="Routines" count={totalCatchups}>
              <View>
                {visibleRoutines.map((r, i) => (
                  <RoutineRow
                    key={r.routine_id}
                    routine={r}
                    isLast={i === visibleRoutines.length - 1}
                    onLogToday={(routine) => goToRunRoutine(routine, todayStr())}
                    onLogDate={(routine, d) => goToRunRoutine(routine, d)}
                    onSkipDate={(routine, d) => handleSkipDate(routine, d)}
                  />
                ))}
              </View>
            </SectionCard>
          )}

          {pendingBills.length > 0 && (
            <SectionCard 
              title="Upcoming Bills" 
              actionLabel="See all"
              onAction={() => navigation.navigate("Expenses", { screen: "ManageBills" })}
            >
              <View>
                {pendingBills.map((b, i) => (
                  <BillRow
                    key={b.pending_id}
                    bill={b}
                    isLast={i === pendingBills.length - 1}
                    onPress={() => goToPendingBill(b)}
                  />
                ))}
              </View>
            </SectionCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: SPACING["2xl"], gap: SPACING.md },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 28, height: 28 },
  topBarBrand: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  topBarIconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  topBarAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.bg,
  },
  bellBadgeText: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: "#fff" },
  topBarAvatarText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },

  grid: { gap: SPACING.sm, paddingHorizontal: SPACING.base },

  // ── Hero (unchanged) ──
  hero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
    padding: SPACING.xl,
    gap: SPACING.md,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  greetingText: {
    fontSize: FONT_SIZE.sm,
    color: "rgba(147,197,253,0.75)",
    fontWeight: FONT_WEIGHT.medium,
  },
  userName: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    color: "#93c5fd",
  },
  heroGroupsPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: "rgba(37,99,235,0.14)", borderWidth: 1, borderColor: "rgba(37,99,235,0.3)",
  },
  heroGroupsPillText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: "#93c5fd" },
  heroBalanceBlock: {
    marginTop: SPACING.sm, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: "rgba(37,99,235,0.2)", gap: 4,
  },
  heroBalanceLabel: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.8 },
  heroBalanceVal: { fontSize: FONT_SIZE["4xl"], fontWeight: FONT_WEIGHT.extrabold, letterSpacing: -0.5 },

  // ── Balance summary card ──
  balCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
  },
  balRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: SPACING.md,
  },
  balLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, color: COLORS.text2 },
  balRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  balValue: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  balChevron: { fontSize: 10, color: COLORS.text3, fontWeight: FONT_WEIGHT.bold },
  balDivider: { height: 1, backgroundColor: COLORS.border },
  balBreakdownList: { paddingBottom: SPACING.md, gap: 6 },
  balBreakdownRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6,
  },
  balBreakdownLabel: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.text2 },
  balBreakdownVal: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  balBreakdownChevron: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },

  // ── Quick actions — slim icon row ──
  qaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
  },
  qaItem: { alignItems: "center", gap: 6, flex: 1 },
  qaCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  qaItemLabel: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2, textAlign: "center" },

  // ── Section card (Routines / Bills) ──
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.xs, paddingBottom: SPACING.xs },
  sectionCardTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
    sectionCardTitleWrap: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  sectionActionText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium },
  sectionCountPill: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: "rgba(239,68,68,0.14)", alignItems: "center", justifyContent: "center",
  },
  sectionCountText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.danger },

  // ── Routine rows ──
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  routineRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  routineIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: ICON_CHIP_BG, alignItems: "center", justifyContent: "center",
  },
  routineName: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  routineBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  routineBadgeText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold },
  routineCatchupToggle: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.danger },
  catchupList: { paddingHorizontal: SPACING.xs, paddingBottom: SPACING.sm, gap: SPACING.sm },
  catchupRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catchupDate: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  catchupLogBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: "rgba(37,99,235,0.14)" },
  catchupLogText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  catchupSkipBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
  },
  catchupSkipText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text2 },

  // ── Bill rows ──
  billRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  billIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: ICON_CHIP_BG, alignItems: "center", justifyContent: "center",
  },
  billName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  billDue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginTop: 2 },
  billAmountText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  billSubAmountRed: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: COLORS.danger, marginTop: 2 },
  billSubAmountGray: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: COLORS.text3, marginTop: 2 },
});