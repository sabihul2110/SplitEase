// SplitEase/mobile/src/screens/activity/ActivityScreen.jsx


import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as expensesApi from "../../api/expenses";
import { useAuth } from "../../context/AuthContext";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
} from "../../constants/theme";
import { Icons } from "../../components/icons/icons";
import ScreenHeader from "../../components/layout/ScreenHeader";
import DatePickerInput from "../../components/common/DatePickerInput";
import AppAlert from "../../components/common/AppAlert";
import { TAB_BAR_HEIGHT } from "../../constants/theme";
import { Modal } from "react-native";

// Matches web TYPE_META exactly
const TYPE_META = {
  group_expense: {
    bg: "rgba(59,130,246,0.12)",
    color: "#60a5fa",
    label: "Group expense",
  },
  group_expense_owed: {
    bg: "rgba(239,68,68,0.10)",
    color: "#f87171",
    label: "You owe",
  },
  personal_expense: {
    bg: "rgba(245,158,11,0.12)",
    color: "#fbbf24",
    label: "Personal",
  },
  income: { bg: "rgba(16,185,129,0.12)", color: "#34d399", label: "Income" },
  loan_given: {
    bg: "rgba(99,102,241,0.12)",
    color: "#818cf8",
    label: "Loan given",
  },
  loan_taken: {
    bg: "rgba(236,72,153,0.12)",
    color: "#f472b6",
    label: "Loan taken",
  },
  settlement_received: {
    bg: "rgba(16,185,129,0.12)",
    color: "#34d399",
    label: "Received",
  },
  settlement_sent: {
    bg: "rgba(59,130,246,0.12)",
    color: "#60a5fa",
    label: "Sent",
  },
};

const TYPE_ICON = {
  group_expense: Icons.groupExpense,
  group_expense_owed: Icons.receipt,
  personal_expense: Icons.personalExpense,
  income: Icons.income,
  loan_given: Icons.lendMoney,
  loan_taken: Icons.borrowMoney,
  settlement_received: Icons.checkCircle,
  settlement_sent: Icons.settlement,
};

// Matches web tabMatches()
function tabMatches(tab, type) {
  if (tab === "all") return true;
  if (tab === "group")
    return (
      type === "group_expense" ||
      type === "group_expense_owed" ||
      type.startsWith("settlement")
    );
  if (tab === "personal")
    return type === "personal_expense" || type === "income";
  if (tab === "money") return type === "loan_given" || type === "loan_taken";
  return true;
}

function isInflow(type) {
  return (
    type === "income" || type === "settlement_received" || type === "loan_taken"
  );
}

function dateLabel(d) {
  const today = new Date().toISOString().split("T")[0];
  const yest = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yest) return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function isoToday() {
  return new Date().toISOString().split("T")[0];
}

function monthRange(monthsAgo = 0) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const toIso = (d) => d.toISOString().split("T")[0];
  const label = target.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { start: toIso(start), end: toIso(end), label };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chars = [];
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    chars.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
  }
  return global.btoa(chars.join(""));
}

// ── Activity row ───────────────────────────────────────────────────────────
function ActivityRow({ item, onPress }) {
  const meta = TYPE_META[item.type] || TYPE_META.group_expense;
  const inflow = isInflow(item.type);
  const canNav = !!item.group_id;
  const amount = Number(item.amount || 0);
  const IconComp = TYPE_ICON[item.type] || Icons.receipt;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={canNav ? onPress : undefined}
      activeOpacity={canNav ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <IconComp size={18} color={meta.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.rowTag, { borderColor: meta.color + "40" }]}>
            <Text style={[styles.rowTagText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          {item.sub && (
            <Text style={styles.rowSub} numberOfLines={1}>
              {item.sub}
            </Text>
          )}
          {item.group_name && (
            <Text style={styles.rowGroup} numberOfLines={1}>
              {item.group_name}
            </Text>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.rowAmt,
          { color: inflow ? COLORS.success : COLORS.text },
        ]}
      >
        {inflow ? "+" : ""}₹{fmt(amount)}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
const TABS = [
  { id: "all", label: "All" },
  { id: "group", label: "Group" },
  { id: "personal", label: "Personal" },
  { id: "money", label: "Money" },
];

export default function ActivityScreen() {
  const navigation = useNavigation();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState(isoToday());
  const [customEnd, setCustomEnd] = useState(isoToday());

  const runDownload = useCallback(async (startDate, endDate) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data } = await expensesApi.downloadStatement(startDate, endDate);
      const base64 = arrayBufferToBase64(data);
      const fileUri = `${FileSystem.cacheDirectory}splitease-statement.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "SplitEase Statement",
          UTI: "com.adobe.pdf",
        });
      } else {
        setAlertConfig({
          title: "Saved",
          message: `Statement saved to ${fileUri}`,
          buttons: [{ text: "OK", onPress: () => setAlertConfig(null) }],
        });
      }
    } catch (err) {
      setAlertConfig({
        title: "Download failed",
        message: `${err?.message || "Unknown error"} | type: ${typeof err}`,
        buttons: [{ text: "OK", onPress: () => setAlertConfig(null) }],
      });
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const handleSelectAllTime = useCallback(() => {
    setShowPeriodPicker(false);
    runDownload();
  }, [runDownload]);

  const handleSelectMonth = useCallback((monthsAgo) => {
    setShowPeriodPicker(false);
    const { start, end } = monthRange(monthsAgo);
    runDownload(start, end);
  }, [runDownload]);

  const handleConfirmCustomRange = useCallback(() => {
    setShowCustomRange(false);
    runDownload(customStart, customEnd);
  }, [runDownload, customStart, customEnd]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await expensesApi.getTimeline(200);
      setFeed(data || []);
    } catch {
      setFeed([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Summary chips — matches web
  const groupSpend = feed
    .filter((f) => f.type === "group_expense")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const personalSpend = feed
    .filter((f) => f.type === "personal_expense")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const settledCount = feed.filter(
    (f) => f.type === "settlement_sent" || f.type === "settlement_received",
  ).length;

  // Filter
  const visible = feed.filter((item) => {
    if (!tabMatches(tab, item.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay =
        `${item.label || ""} ${item.sub || ""} ${item.group_name || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Group by date for SectionList
  const grouped = {};
  visible.forEach((item) => {
    const d = item.date || "Unknown";
    (grouped[d] = grouped[d] || []).push(item);
  });
  const sections = Object.keys(grouped)
    .sort()
    .reverse()
    .map((date) => ({ title: dateLabel(date), data: grouped[date] }));

  if (loading)
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View
          style={[
            styles.listHeader,
            { flex: 1, alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Icons.activity size={32} color={COLORS.text3} />
          <Text
            style={{
              fontSize: FONT_SIZE.base,
              color: COLORS.text3,
              marginTop: 10,
            }}
          >
            Loading activity…
          </Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScreenHeader
        title="Activity"
        actions={
          <TouchableOpacity
            onPress={() => setShowPeriodPicker(true)}
            disabled={downloading}
            style={styles.downloadBtn}
          >
            <Icons.receipt
              size={18}
              color={downloading ? COLORS.text3 : COLORS.primary}
            />
          </TouchableOpacity>
        }
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.type}-${item.ref_id || i}`}
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
          <View style={styles.listHeader}>
            {/* Summary chips */}
            {feed.length > 0 && (
              <View style={styles.chips}>
                <View style={styles.chip}>
                  <View
                    style={[styles.chipDot, { backgroundColor: "#3b82f6" }]}
                  />
                  <Text style={styles.chipText}>
                    ₹{fmt(groupSpend)} group spend
                  </Text>
                </View>
                <View style={styles.chip}>
                  <View
                    style={[styles.chipDot, { backgroundColor: "#f59e0b" }]}
                  />
                  <Text style={styles.chipText}>
                    ₹{fmt(personalSpend)} personal
                  </Text>
                </View>
                <View style={styles.chip}>
                  <View
                    style={[styles.chipDot, { backgroundColor: "#10b981" }]}
                  />
                  <Text style={styles.chipText}>
                    {settledCount} settlement{settledCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            )}

            {/* Search */}
            <View style={styles.searchWrap}>
              <Icons.search size={14} color={COLORS.text3} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search activity…"
                placeholderTextColor={COLORS.text3}
              />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
                  onPress={() => setTab(t.id)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      tab === t.id && styles.tabTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.countText}>
              {visible.length} item{visible.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: "center", paddingTop: 64, gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.activity size={32} color={COLORS.text3} />
            </View>
            <Text
              style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: FONT_WEIGHT.bold,
                color: COLORS.text,
              }}
            >
              {search ? "No results" : "No activity yet"}
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE.base,
                color: COLORS.text3,
                textAlign: "center",
                paddingHorizontal: SPACING.xl,
              }}
            >
              {search
                ? `Nothing matches "${search}"`
                : "Expenses, payments, and income will appear here."}
            </Text>
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHead}>
            <Icons.calendarDays size={11} color={COLORS.text3} />
            <Text style={styles.dateHeadText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ActivityRow
            item={item}
            onPress={() =>
              item.group_id &&
              navigation.navigate("Groups", {
                screen: "GroupDetail",
                params: { groupId: item.group_id, groupName: item.group_name },
              })
            }
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT }]}
        stickySectionHeadersEnabled={false}
      />

      {/* Period picker */}
      <Modal
        visible={showPeriodPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPeriodPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.periodBox}>
            <Text style={styles.periodTitle}>Download statement</Text>

            <TouchableOpacity style={styles.periodOption} onPress={handleSelectAllTime}>
              <Icons.calendarDays size={16} color={COLORS.text2} />
              <Text style={styles.periodOptionText}>All time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.periodOption} onPress={() => handleSelectMonth(0)}>
              <Icons.calendarDays size={16} color={COLORS.text2} />
              <Text style={styles.periodOptionText}>{monthRange(0).label}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.periodOption} onPress={() => handleSelectMonth(1)}>
              <Icons.calendarDays size={16} color={COLORS.text2} />
              <Text style={styles.periodOptionText}>{monthRange(1).label}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodOption}
              onPress={() => {
                setShowPeriodPicker(false);
                setShowCustomRange(true);
              }}
            >
              <Icons.calendarDays size={16} color={COLORS.primary} />
              <Text style={[styles.periodOptionText, { color: COLORS.primary }]}>
                Custom range…
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodCancel}
              onPress={() => setShowPeriodPicker(false)}
            >
              <Text style={styles.periodCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Custom range picker */}
      <Modal
        visible={showCustomRange}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomRange(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCustomRange(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.periodBox}>
            <Text style={styles.periodTitle}>Custom range</Text>

            <Text style={styles.rangeLabel}>From</Text>
            <DatePickerInput value={customStart} onChange={setCustomStart} />

            <Text style={[styles.rangeLabel, { marginTop: SPACING.md }]}>To</Text>
            <DatePickerInput value={customEnd} onChange={setCustomEnd} />

            <TouchableOpacity
              style={[styles.periodCancel, styles.confirmBtn]}
              onPress={handleConfirmCustomRange}
            >
              <Text style={[styles.periodCancelText, { color: COLORS.white }]}>
                Download
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodCancel}
              onPress={() => setShowCustomRange(false)}
            >
              <Text style={styles.periodCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AppAlert config={alertConfig} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: SPACING["2xl"] },
  listHeader: { padding: SPACING.base, gap: SPACING.base },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { fontSize: 13, marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },

  tabs: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: COLORS.surface2,
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: COLORS.surface },
  tabText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tabTextActive: { color: COLORS.text },
  countText: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  periodBox: {
    backgroundColor: "#171c2c",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "#242a3d",
    padding: SPACING.xl,
    width: "100%",
    gap: SPACING.sm,
  },
  periodTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  periodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodOptionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.medium,
  },
  periodCancel: {
    marginTop: SPACING.sm,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  periodCancelText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.lg,
  },
  rangeLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  dateHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: SPACING.base,
    paddingVertical: 10,
    backgroundColor: COLORS.surface2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateHeadText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: SPACING.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 4 },
  rowLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rowTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.surface2,
  },
  rowTagText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.4,
  },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  rowGroup: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rowAmt: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.extrabold },
});
