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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
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
import { TYPE_ICONS as ENTRY_TYPE_ICONS } from "../../constants/entryTypeIcons";
import { getExpenseIcon, extractCategoryFromLabel } from "../../constants/categoryIcons";
import ScreenHeader from "../../components/layout/ScreenHeader";
import DatePickerInput from "../../components/common/DatePickerInput";
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
  loan_repayment_received: {
    bg: "rgba(16,185,129,0.12)",
    color: "#34d399",
    label: "Repayment received",
  },
  loan_repayment_paid: {
    bg: "rgba(239,68,68,0.10)",
    color: "#f87171",
    label: "Repayment paid",
  },
};

// const TYPE_ICON = {
//   group_expense: Icons.groupExpense,
//   group_expense_owed: Icons.receipt,
//   personal_expense: Icons.personalExpense,
//   income: Icons.income,
//   loan_given: Icons.lendMoney,
//   loan_taken: Icons.borrowMoney,
//   settlement_received: Icons.checkCircle,
//   settlement_sent: Icons.settlement,
//   loan_repayment_received: Icons.paymentSettled,
//   loan_repayment_paid: Icons.paymentSettled,
// };

// Entry-type icons now come from constants/entryTypeIcons.js — the
// same source ExpensesScreen uses, since both screens render the
// same timeline data. See ActivityRow below for the per-row
// keyword-icon resolution logic shared with Expenses.

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
  if (tab === "money")
    return (
      type === "loan_given" ||
      type === "loan_taken" ||
      type === "loan_repayment_received" ||
      type === "loan_repayment_paid"
    );
  return true;
}

function isInflow(type) {
  return (
    type === "income" ||
    type === "settlement_received" ||
    type === "loan_taken" ||
    type === "loan_repayment_received"
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
function toIso(d) {
  return d.toISOString().split("T")[0];
}
function fmtStatementDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function rangeLabel(start, end) {
  return `${fmtStatementDate(start)} to ${fmtStatementDate(end)}`;
}

function daysAgoRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const s = toIso(start), e = toIso(end);
  return { start: s, end: e, label: `Last ${days} days`, statementLabel: rangeLabel(s, e), periodType: "range" };
}

function monthRange(monthsAgo = 0) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const label = target.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { start: toIso(start), end: toIso(end), label, statementLabel: label, periodType: "month" };
}

// Indian financial year: Apr 1 -> Mar 31
function fyRange(yearsAgo = 0) {
  const now = new Date();
  const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStartYear = currentFyStartYear - yearsAgo;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyStartYear + 1, 2, 31);
  const label = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const s = toIso(start), e = toIso(end);
  return { start: s, end: e, label, statementLabel: rangeLabel(s, e), periodType: "range" };
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

  const isExpenseType =
    item.type === "personal_expense" ||
    item.type === "group_expense" ||
    item.type === "group_expense_owed";
  const resolved = isExpenseType
    ? getExpenseIcon({
        category: extractCategoryFromLabel(item.label),
        description: item.sub,
      })
    : null;

  const IconComp = resolved?.Icon  || ENTRY_TYPE_ICONS[item.type]?.Icon || Icons.receipt;
  const iconColor = resolved?.color || meta.color;
  const iconBg    = resolved ? `${resolved.color}18` : meta.bg;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={canNav ? onPress : undefined}
      activeOpacity={canNav ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <IconComp size={18} color={iconColor} />
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
  const [selMonth, setSelMonth] = useState("all"); // "all" | "YYYY-MM"
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [downloading, setDownloading] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [periodTab, setPeriodTab] = useState("range"); // range | month | fy | custom
  const [selectedRange, setSelectedRange] = useState(30);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedFy, setSelectedFy] = useState(0);
  const [customStart, setCustomStart] = useState(isoToday());
  const [customEnd, setCustomEnd] = useState(isoToday());
  const [successInfo, setSuccessInfo] = useState(null); // { fileUri }

  const runDownload = useCallback(async (startDate, endDate, statementLabel, periodType) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data } = await expensesApi.downloadStatement(startDate, endDate, statementLabel, periodType);
      const base64 = arrayBufferToBase64(data);
      const fileUri = `${FileSystem.documentDirectory}splitease-statement.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setShowPeriodPicker(false);
      setSuccessInfo({ fileUri });
    } catch (err) {
      console.log("Statement download failed:", err?.response?.status, err?.response?.data, err?.message);
      setShowPeriodPicker(false);
      setSuccessInfo({ error: true });
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const handleDownloadPress = useCallback(() => {
    if (periodTab === "range") {
      const { start, end, statementLabel, periodType } = daysAgoRange(selectedRange);
      runDownload(start, end, statementLabel, periodType);
    } else if (periodTab === "month") {
      const { start, end, statementLabel, periodType } = monthRange(selectedMonth);
      runDownload(start, end, statementLabel, periodType);
    } else if (periodTab === "fy") {
      const { start, end, statementLabel, periodType } = fyRange(selectedFy);
      runDownload(start, end, statementLabel, periodType);
    } else {
      runDownload(customStart, customEnd, rangeLabel(customStart, customEnd), "range");
    }
  }, [periodTab, selectedRange, selectedMonth, selectedFy, customStart, customEnd, runDownload]);

  const handleOpenFromSuccess = useCallback(async () => {
    if (!successInfo?.fileUri) return;
    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(successInfo.fileUri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: "application/pdf",
      });
    } else {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(successInfo.fileUri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      }
    }
  }, [successInfo]);

  const handleShareFromSuccess = useCallback(async () => {
    if (!successInfo?.fileUri) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(successInfo.fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "SplitEase Statement",
        UTI: "com.adobe.pdf",
      });
    }
  }, [successInfo]);

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

  // Available months present in the feed, newest first — powers the month chips
  const monthOptions = (() => {
    const seen = new Set();
    feed.forEach((e) => {
      if (e.date && e.date.length >= 7) seen.add(e.date.slice(0, 7));
    });
    return Array.from(seen).sort().reverse();
  })();

  function monthChipLabel(m) {
    const [yr, mo] = m.split("-");
    return new Date(+yr, +mo - 1, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }

  // Filter
  const visible = feed.filter((item) => {
    if (!tabMatches(tab, item.type)) return false;
    if (selMonth !== "all" && (!item.date || item.date.slice(0, 7) !== selMonth)) return false;
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
  const sortedDateKeys = Object.keys(grouped).sort(); // ascending
  const sections = (sortOrder === "newest" ? sortedDateKeys.slice().reverse() : sortedDateKeys)
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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
              style={styles.downloadBtn}
            >
              {sortOrder === "newest" ? (
                <Icons.sortNewest size={18} color={COLORS.primary} />
              ) : (
                <Icons.sortOldest size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
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
          </View>
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

            {/* Month filter chips */}
            {monthOptions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthChipRow}
              >
                <TouchableOpacity
                  style={[styles.monthChip, selMonth === "all" && styles.monthChipActive]}
                  onPress={() => setSelMonth("all")}
                >
                  <Text style={[styles.monthChipText, selMonth === "all" && styles.monthChipTextActive]}>
                    All time
                  </Text>
                </TouchableOpacity>
                {monthOptions.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, selMonth === m && styles.monthChipActive]}
                    onPress={() => setSelMonth(m)}
                  >
                    <Text style={[styles.monthChipText, selMonth === m && styles.monthChipTextActive]}>
                      {monthChipLabel(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

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

      {/* Period picker — bottom sheet, tabbed */}
      <Modal
        visible={showPeriodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodPicker(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowPeriodPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Statement Period</Text>

            <View style={styles.tabRow}>
              {[
                { id: "range", label: "Range" },
                { id: "month", label: "Month" },
                { id: "fy", label: "FY" },
                { id: "custom", label: "Custom" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabPill, periodTab === t.id && styles.tabPillActive]}
                  onPress={() => setPeriodTab(t.id)}
                >
                  <Text style={[styles.tabPillText, periodTab === t.id && styles.tabPillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {periodTab === "range" && (
              <View style={styles.radioList}>
                {[7, 30, 90, 180, 365].map((d) => (
                  <TouchableOpacity key={d} style={styles.radioRow} onPress={() => setSelectedRange(d)}>
                    <Text style={styles.radioLabel}>Last {d} days</Text>
                    <View style={[styles.radioOuter, selectedRange === d && styles.radioOuterActive]}>
                      {selectedRange === d && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {periodTab === "month" && (
              <View style={styles.radioList}>
                {[0, 1, 2, 3, 4, 5].map((m) => (
                  <TouchableOpacity key={m} style={styles.radioRow} onPress={() => setSelectedMonth(m)}>
                    <Text style={styles.radioLabel}>{monthRange(m).label}</Text>
                    <View style={[styles.radioOuter, selectedMonth === m && styles.radioOuterActive]}>
                      {selectedMonth === m && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {periodTab === "fy" && (
              <View style={styles.radioList}>
                {[0, 1, 2, 3].map((y) => (
                  <TouchableOpacity key={y} style={styles.radioRow} onPress={() => setSelectedFy(y)}>
                    <Text style={styles.radioLabel}>
                      {fyRange(y).label}{y === 0 ? " (Current)" : ""}
                    </Text>
                    <View style={[styles.radioOuter, selectedFy === y && styles.radioOuterActive]}>
                      {selectedFy === y && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {periodTab === "custom" && (
              <View style={{ gap: SPACING.md, marginTop: SPACING.sm }}>
                <View>
                  <Text style={styles.rangeLabel}>From</Text>
                  <DatePickerInput value={customStart} onChange={setCustomStart} />
                </View>
                <View>
                  <Text style={styles.rangeLabel}>To</Text>
                  <DatePickerInput value={customEnd} onChange={setCustomEnd} />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.sheetPrimaryBtn}
              onPress={handleDownloadPress}
              disabled={downloading}
            >
              <Text style={styles.sheetPrimaryBtnText}>
                {downloading ? "Generating…" : "Download Statement"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Success bottom sheet */}
      <Modal
        visible={!!successInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setSuccessInfo(null)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSuccessInfo(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {successInfo?.error ? (
              <>
                <View style={[styles.successIconWrap, { backgroundColor: COLORS.danger + "22" }]}>
                  <Icons.close size={28} color={COLORS.danger} />
                </View>
                <Text style={styles.sheetTitle}>Download failed</Text>
                <Text style={styles.successSub}>Could not generate your statement. Please try again.</Text>
              </>
            ) : (
              <>
                <View style={styles.successIconWrap}>
                  <Icons.checkCircle size={28} color={COLORS.success} />
                </View>
                <Text style={styles.sheetTitle}>Statement Ready</Text>
                <Text style={styles.successSub}>Your PDF statement has been generated successfully.</Text>

                <View style={styles.fileChip}>
                  <Icons.receipt size={18} color={COLORS.primary} />
                  <Text style={styles.fileChipText} numberOfLines={1}>splitease-statement.pdf</Text>
                  <TouchableOpacity onPress={handleOpenFromSuccess}>
                    <Text style={styles.fileChipAction}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleShareFromSuccess} style={{ marginLeft: 14 }}>
                    <Text style={styles.fileChipAction}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.sheetPrimaryBtn} onPress={() => setSuccessInfo(null)}>
              <Text style={styles.sheetPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

  monthChipRow: { gap: 8, paddingVertical: 2 },
  monthChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  monthChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(37,99,235,0.14)",
  },
  monthChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text2,
  },
  monthChipTextActive: { color: COLORS.primary },

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

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#171c2c",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "#242a3d",
    padding: SPACING.xl,
    paddingBottom: SPACING["2xl"],
    gap: SPACING.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border2,
    alignSelf: "center",
    marginBottom: SPACING.sm,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.surface2,
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  tabPillActive: { backgroundColor: COLORS.surface },
  tabPillText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tabPillTextActive: { color: COLORS.text },
  radioList: { marginTop: SPACING.md, gap: 2 },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  radioLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.medium,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  rangeLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sheetPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  sheetPrimaryBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.base,
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.success + "22",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: SPACING.sm,
  },
  successSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    textAlign: "center",
    marginTop: 2,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  fileChipText: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.sm },
  fileChipAction: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm },

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
