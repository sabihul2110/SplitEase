// SplitEase/mobile/src/screens/dashboard/DashboardScreen.jsx

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as expensesApi from "../../api/expenses";
import * as groupsApi from "../../api/groups";
import * as loansApi from "../../api/loans";
import * as notificationsApi from "../../api/notifications";
import * as settlementsApi from "../../api/settlements";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArch = global._IS_FABRIC === true;
  if (!isNewArch) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { Avatar, EmptyState, LoadingState } from "../../components/common/Ui";
import { Icons } from "../../components/icons";
import { getGroupIcon } from "../../constants/groupIcons";
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

// ── Top bar (Avatar → Account, Bell → Notifications) ───────────────────────

function VerifyBanner({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.verifyBanner}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icons.info size={14} color="#f59e0b" />
      <Text style={styles.verifyBannerText}>
        Your email isn't verified.{" "}
        <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: "#f59e0b" }}>
          Tap to verify →
        </Text>
      </Text>
    </TouchableOpacity>
  );
}


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

// ── Hero card ──────────────────────────────────────────────────────────────
function HeroCard({ user, groups, accountBalance }) {
  const isPositive = accountBalance >= 0;
  const balColor = isPositive ? COLORS.success : COLORS.danger;
  const firstName = user?.name?.split(" ")[0] || "You";

  return (
    <View style={styles.hero}>
      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>YOUR ACCOUNT</Text>
          <Text style={styles.heroName}>{firstName}'s SplitEase</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
        </View>
        <View style={styles.heroGroupsPill}>
          <Text style={styles.heroGroupsPillText}>
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </Text>
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

// ── Mini balance card ──────────────────────────────────────────────────────
function MiniCard({ label, value, color, sub, breakdown }) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = breakdown && breakdown.length > 0;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((p) => !p);
  }

  return (
    <View style={[styles.miniCard, { borderColor: color + "33" }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniVal, { color }]}>₹{fmt(value)}</Text>
      <View style={styles.miniSubRow}>
        <Text style={styles.miniSub}>{sub}</Text>
        {hasBreakdown && (
          <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.miniBreakdownToggle}>
              {expanded ? "Hide" : "Breakdown"} {expanded ? "▴" : "▾"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {hasBreakdown && expanded && (
        <View style={styles.miniBreakdownList}>
          {breakdown.map((b, i) => {
            const Wrapper = b.onPress ? TouchableOpacity : View;
            return (
              <Wrapper
                key={i}
                onPress={b.onPress}
                style={styles.miniBreakdownRow}
                {...(b.onPress ? { activeOpacity: 0.6 } : {})}
              >
                <Text style={styles.miniBreakdownLabel} numberOfLines={1}>{b.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={[styles.miniBreakdownVal, { color }]}>₹{fmt(b.value)}</Text>
                  {b.onPress && <Text style={styles.miniBreakdownChevron}>›</Text>}
                </View>
              </Wrapper>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Quick action button ────────────────────────────────────────────────────
function QuickAction({ label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.qaBtn,
        { backgroundColor: color + "14", borderColor: color + "30" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.qaLabel, { color }]}>→ {label}</Text>
    </TouchableOpacity>
  );
}

// ── Group row ──────────────────────────────────────────────────────────────
function GroupRow({ group, onPress }) {
  const date = group.created_at
    ? new Date(group.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const { IconComponent, bg, color, matched } = getGroupIcon(group.group_name);
  return (
    <TouchableOpacity
      style={styles.groupRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {matched ? (
        <View style={[styles.groupIconBox, { backgroundColor: bg }]}>
          <IconComponent size={19} color={color} strokeWidth={2} />
        </View>
      ) : (
        <Avatar name={group.group_name} size={38} />
      )}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>
          {group.group_name}
        </Text>
        <Text style={styles.groupDate}>{date}</Text>
      </View>
      <Text style={styles.groupChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isUnverified = user && user.email_verified === false;
  const [groups, setGroups] = useState([]);
  const [owedToYou, setOwedToYou] = useState(0);
  const [youOwe, setYouOwe] = useState(0);
  const [accountBalance, setAccountBalance] = useState(0);
  const [owedBreakdown, setOwedBreakdown] = useState([]);
  const [oweBreakdown, setOweBreakdown] = useState([]);
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
        setGroups(groupList || []);

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
          const [loansRes, borrowsRes] = await Promise.all([
            loansApi.getLoans(),
            loansApi.getBorrows(),
          ]);
          (loansRes.data || [])
            .filter((l) => l.status === "active" && Number(l.remaining_amount) > 0)
            .forEach((l) => owedList.push({
              label: `Lent to ${l.borrower_name}`,
              value: Number(l.remaining_amount),
              onPress: () => navigation.navigate("Loans", { initialTab: "lent", highlightId: l.loan_id }),
            }));
          (borrowsRes.data || [])
            .filter((b) => b.status === "active" && Number(b.remaining_amount) > 0)
            .forEach((b) => oweList.push({
              label: `Borrowed from ${b.lender_name}`,
              value: Number(b.remaining_amount),
              onPress: () => navigation.navigate("Loans", { initialTab: "borrowed", highlightId: b.borrow_id }),
            }));
        } catch {}

        setOwedToYou(owed);
        setYouOwe(owe);
        setOwedBreakdown(owedList);
        setOweBreakdown(oweList);

        try {
          const { data: nc } = await notificationsApi.getUnreadCount();
          setUnreadCount(nc?.count || 0);
        } catch {}
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

  if (loading) return <LoadingState label="Loading dashboard…" />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <FlatList
        data={groups.slice(0, 6)}
        keyExtractor={(g) => String(g.group_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {/* ── Global header bar ── */}
            {isUnverified && (
              <VerifyBanner onPress={() => navigation.navigate("VerifyEmail")} />
            )}

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
              {/* Hero */}
              <HeroCard
                user={user}
                groups={groups}
                accountBalance={accountBalance}
              />

              {/* Mini cards */}
              <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <MiniCard
                    label="YOU ARE OWED"
                    value={owedToYou}
                    color={COLORS.success}
                    sub={owedToYou > 0 ? "Pending" : "All clear"}
                    breakdown={owedBreakdown}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MiniCard
                    label="YOU OWE"
                    value={youOwe}
                    color={youOwe > 0 ? COLORS.danger : COLORS.text2}
                    sub={youOwe > 0 ? "Pending" : "All clear"}
                    breakdown={oweBreakdown}
                  />
                </View>
              </View>

              {/* Quick actions */}
              <View style={styles.quickCard}>
                <Text style={styles.miniLabel}>QUICK ACTIONS</Text>
                <View style={styles.quickList}>
                  <QuickAction
                    label="Expenses"
                    color="#10b981"
                    onPress={() => navigation.navigate("Expenses")}
                  />
                  <QuickAction
                    label="View Groups"
                    color="#3b82f6"
                    onPress={() => navigation.navigate("Groups")}
                  />
                  <QuickAction
                    label="Loans"
                    color="#10b981"
                    onPress={() => navigation.navigate("Loans")}
                  />
                  <QuickAction
                    label="Activity"
                    color="#f59e0b"
                    onPress={() =>
                      navigation.navigate("More", { screen: "Activity" })
                    }
                  />
                  <QuickAction
                    label="Settle Up"
                    color="#8b5cf6"
                    onPress={() =>
                      navigation.navigate("More", { screen: "Settlements" })
                    }
                  />
                </View>
              </View>
            </View>


            {/* Recent groups heading */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Groups")}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ padding: SPACING.base }}>
            <EmptyState
              icon="usersPlus"
              title="No groups yet"
              subtitle="Create a group to start splitting."
            />
          </View>
        )}
        renderItem={({ item: group }) => (
          <GroupRow
            group={group}
            onPress={() =>
              navigation.navigate("Groups", {
                screen: "GroupDetail",
                params: {
                  groupId: group.group_id,
                  groupName: group.group_name,
                },
              })
            }
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT }]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: SPACING["2xl"] },
  header: { gap: SPACING.md, paddingTop: SPACING.sm },
  
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: SPACING.base,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: 10,
  },
  verifyBannerText: {
    fontSize: FONT_SIZE.sm,
    color: "rgba(245,158,11,0.85)",
    flex: 1,
  },
  topBarBrand: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  topBarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    color: "#fff",
  },

  topBarAvatarText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
  },

  // ── Chips ──
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.medium,
  },

  grid: { gap: SPACING.sm, paddingHorizontal: SPACING.base },

  // ── Hero ──
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
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  heroLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: "rgba(147,197,253,0.65)",
    letterSpacing: 1,
  },
  heroName: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.extrabold,
    color: "#93c5fd",
    marginTop: 2,
  },
  heroEmail: { fontSize: FONT_SIZE.sm, color: "rgba(147,197,253,0.55)", marginTop: 2 },
  heroGroupsPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(37,99,235,0.14)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
  },
  heroGroupsPillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: "#93c5fd",
  },
  heroBalanceBlock: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(37,99,235,0.2)",
    gap: 4,
  },
  heroBalanceLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3,
    letterSpacing: 0.8,
  },
  heroBalanceVal: {
    fontSize: FONT_SIZE["4xl"],
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -0.5,
  },

  // ── Mini cards ──
  miniCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    gap: 4,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  miniVal: { fontSize: FONT_SIZE["3xl"], fontWeight: FONT_WEIGHT.extrabold },
  miniSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  miniSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  miniBreakdownToggle: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3,
  },
  miniBreakdownList: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  miniBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  miniBreakdownLabel: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.text2,
  },
  miniBreakdownVal: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  miniBreakdownChevron: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
  },

  // ── Quick actions ──
  quickCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.md,
  },
  quickList: { gap: SPACING.sm },
  qaBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  qaLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },

  // ── Section head ──
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  viewAll: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },

  // ── Group rows ──
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  groupInfo: { flex: 1 },
  groupName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  groupDate: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  groupChevron: { fontSize: FONT_SIZE.lg, color: COLORS.text3 },
});
