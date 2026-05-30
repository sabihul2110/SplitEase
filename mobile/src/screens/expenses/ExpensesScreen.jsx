// SplitEase/mobile/src/screens/expenses/ExpensesScreen.jsx
//
// Full mobile port of web/src/pages/Expenses.jsx
// Matches all features: month navigator, tabs, search,
// summary cards, timeline grouped by month → day, inline repay,
// delete, settled badges, group links, loan status.

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList,
  Animated, Pressable, Linking, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from "../../constants/theme";
import { Icons, TYPE_ICONS, TYPE_CFG } from "../../constants/icons";
import ScreenHeader from "../../components/layout/ScreenHeader";

// ─────────────────────────────────────────────
//  Helpers (identical logic to web)
// ─────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });
}
function fmtDayHeader(s) {
  if (!s) return "";
  if (s === todayStr()) return "Today";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function filterByMonth(entries, ym) {
  if (!ym || ym === "all") return entries;
  return entries.filter(e => e.date && e.date.slice(0, 7) === ym);
}
function displayAmount(entry) {
  if (entry.type === "group_expense") return entry.my_share ?? entry.amount;
  return entry.amount;
}
function computeSummary(entries) {
  let spent = 0, received = 0, net = 0;
  for (const e of entries) {
    const cfg = TYPE_CFG[e.type];
    if (!cfg) continue;
    const disp = displayAmount(e);
    if (cfg.bucket === "spent")    spent    += disp;
    if (cfg.bucket === "received") received += disp;
    if (e.type === "group_expense")      net += (e.receivable ?? 0);
    if (e.type === "group_expense_owed") net -= (e.amount ?? 0);
    if (e.type === "loan_given")         net += (e.receivable ?? 0);
    if (e.type === "loan_taken")         net -= (e.receivable ?? 0);
  }
  return {
    spent,
    received,
    lent:     net > 0 ? net : 0,
    borrowed: net < 0 ? Math.abs(net) : 0,
  };
}
function groupByMonthAndDay(entries) {
  const monthMap = {};
  for (const e of entries) {
    const mk = e.date ? e.date.slice(0, 7) : "unknown";
    const dk = e.date || "unknown";
    if (!monthMap[mk]) monthMap[mk] = {};
    if (!monthMap[mk][dk]) monthMap[mk][dk] = [];
    monthMap[mk][dk].push(e);
  }
  return Object.keys(monthMap)
    .sort().reverse()
    .map(mk => ({
      monthKey:   mk,
      monthLabel: mk === "unknown" ? "Unknown" : fmtMonthLabel(mk),
      days: Object.keys(monthMap[mk])
        .sort().reverse()
        .map(dk => ({
          dateKey:  dk,
          dayLabel: fmtDayHeader(dk),
          isToday:  dk === todayStr(),
          entries:  monthMap[mk][dk],
        })),
    }));
}
function fmt(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────
//  Summary Card
// ─────────────────────────────────────────────
function SummaryCard({ label, value, color, sub, loading }) {
  return (
    <View style={styles.sumCard}>
      <Text style={styles.sumLabel}>{label}</Text>
      {loading
        ? <View style={styles.sumSkel} />
        : <Text style={[styles.sumVal, { color }]}>₹{fmt(value)}</Text>}
      <Text style={styles.sumSub}>{sub}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Month Navigator (With Picker Modal)
// ─────────────────────────────────────────────
function MonthNavigator({ value, onChange, availableMonths }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => parseInt(value.split('-')[0], 10));

  const cur = currentMonth();
  const curYear = parseInt(cur.split('-')[0], 10);
  const isCurrentMonth = value === cur;
  const canGoBack = true; 
  const canGoForward = value < cur || availableMonths.some(m => m > value);
  
  // 🔥 Prevent advancing the year past the current calendar year
  const canGoNextYear = pickerYear < curYear;

  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function handleSelectMonth(monthIndex) {
    const paddedMonth = String(monthIndex + 1).padStart(2, '0');
    onChange(`${pickerYear}-${paddedMonth}`);
    setShowPicker(false);
  }

  return (
    <>
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={[styles.monthNavBtn, !canGoBack && styles.monthNavBtnDisabled]}
          onPress={() => canGoBack && onChange(shiftMonth(value, -1))}
          disabled={!canGoBack}
        >
          <Icons.chevronLeft size={16} color={canGoBack ? COLORS.text2 : COLORS.border2} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.monthNavLabel}
          onPress={() => {
            setPickerYear(parseInt(value.split('-')[0], 10));
            setShowPicker(true);
          }}
          activeOpacity={0.6}
        >
          <Text style={[styles.monthNavLabelText, isCurrentMonth && { color: COLORS.primaryH }]}>
            {fmtMonthLabel(value)} ▾
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.monthNavBtn, !canGoForward && styles.monthNavBtnDisabled]}
          onPress={() => canGoForward && onChange(shiftMonth(value, 1))}
          disabled={!canGoForward}
        >
          <Icons.chevronRight size={16} color={canGoForward ? COLORS.text2 : COLORS.border2} />
        </TouchableOpacity>

        {!isCurrentMonth && (
          <TouchableOpacity style={styles.monthReset} onPress={() => onChange(cur)}>
            <Text style={styles.monthResetText}>
              ← {fmtMonthLabel(cur).split(" ")[0]}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        {/* 🔥 Fix 2: Pressable background that closes the modal */}
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPicker(false)}>
          
          {/* 🔥 Stop propagation so tapping inside the box doesn't close it */}
          <Pressable style={styles.pickerBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerYearHeader}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icons.chevronLeft size={20} color={COLORS.text} />
              </TouchableOpacity>
              
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              
              <TouchableOpacity 
                onPress={() => canGoNextYear && setPickerYear(y => y + 1)} 
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                disabled={!canGoNextYear}
                style={!canGoNextYear && { opacity: 0.3 }}
              >
                <Icons.chevronRight size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerGrid}>
              {MONTHS_SHORT.map((m, i) => {
                const paddedMonth = String(i + 1).padStart(2, '0');
                const thisMonthStr = `${pickerYear}-${paddedMonth}`;
                const isSelected = thisMonthStr === value;
                const hasData = availableMonths.includes(thisMonthStr);
                
                // 🔥 Fix 1: Prevent selecting future months
                const isFuture = thisMonthStr > cur;

                return (
                  <TouchableOpacity
                    key={m}
                    disabled={isFuture}
                    style={[
                      styles.pickerMonthBtn,
                      isSelected && styles.pickerMonthBtnSelected,
                      !isSelected && hasData && styles.pickerMonthBtnHasData,
                      isFuture && styles.pickerMonthBtnDisabled
                    ]}
                    onPress={() => handleSelectMonth(i)}
                  >
                    <Text style={[
                      styles.pickerMonthText,
                      isSelected && styles.pickerMonthTextSelected,
                      !isSelected && hasData && { color: COLORS.primaryH },
                      isFuture && { color: COLORS.text3 } // Fade out text for future months
                    ]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────
//  Inline Repay widget (loan_given)
// ─────────────────────────────────────────────
function InlineRepay({ entry, onSuccess }) {
  const [amt,    setAmt]    = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const remaining = entry.receivable ?? 0;

  if (remaining <= 0) {
    return (
      <View style={styles.settledBadge}>
        <Icons.check size={10} color="#10b981" />
        <Text style={styles.settledBadgeText}>Settled</Text>
      </View>
    );
  }

  async function handleRepay() {
    setErr("");
    const parsed = parseFloat(amt);
    if (isNaN(parsed) || parsed <= 0) { setErr("Enter a valid amount."); return; }
    if (parsed > remaining)           { setErr(`Max ₹${fmt(remaining)}`); return; }
    setSaving(true);
    try {
      await client.post(`/loans/${entry.ref_id}/repay`, { repayment_amount: parsed });
      setAmt("");
      onSuccess();
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.repayRemaining}>
        Remaining:{" "}
        <Text style={{ color: "#f59e0b", fontWeight: FONT_WEIGHT.bold }}>
          ₹{fmt(remaining)}
        </Text>
        {"  "}· Record repayment:
      </Text>
      <View style={styles.repayRow}>
        <TextInput
          style={styles.repayInput}
          placeholder={`Max ₹${fmt(remaining)}`}
          placeholderTextColor={COLORS.text3}
          keyboardType="decimal-pad"
          value={amt}
          onChangeText={v => { setAmt(v); setErr(""); }}
        />
        <TouchableOpacity
          style={[styles.repayBtn, (!amt || saving) && { opacity: 0.45 }]}
          onPress={handleRepay}
          disabled={saving || !amt}
        >
          <Text style={styles.repayBtnText}>{saving ? "…" : "Received Back"}</Text>
        </TouchableOpacity>
      </View>
      {!!err && <Text style={styles.repayErr}>{err}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Single Entry Row
// ─────────────────────────────────────────────
function EntryRow({ entry, deleting, onDelete, onNavigateGroup }) {
  const cfg     = TYPE_CFG[entry.type];
  const iconCfg = TYPE_ICONS[entry.type];
  if (!cfg || !iconCfg) return null;

  const { Icon, bg, color } = iconCfg;
  const disp        = displayAmount(entry);
  const isGrp       = entry.type === "group_expense";
  const isLoanGiven = entry.type === "loan_given";
  const isLoanTaken = entry.type === "loan_taken";
  const isDeletable = ["personal_expense", "income", "loan_given", "loan_taken"].includes(entry.type);
  const isDeleting  = deleting === entry.ref_id;

  return (
    <View style={styles.entry}>
      {/* Icon */}
      <View style={[styles.entryIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} />
      </View>

      {/* Body */}
      <View style={styles.entryBody}>
        <Text style={styles.entryLabel} numberOfLines={1}>{entry.label}</Text>
        {!!entry.sub && (
          <Text style={styles.entrySub} numberOfLines={2}>{entry.sub}</Text>
        )}

        {/* Group expense breakdown */}
        {isGrp && (
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownKey}>You paid</Text>
              <Text style={[styles.breakdownVal, { color: COLORS.text }]}>
                ₹{fmt(entry.amount)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownKey}>Your share</Text>
              <Text style={[styles.breakdownVal, { color: "#f87171" }]}>
                ₹{fmt(entry.my_share ?? 0)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownKey}>You are owed</Text>
              <Text style={[styles.breakdownVal, { color: "#34d399" }]}>
                ₹{fmt(entry.receivable ?? 0)}
              </Text>
            </View>
          </View>
        )}

        {/* Loan given — inline repay */}
        {isLoanGiven && (
          <InlineRepay entry={entry} onSuccess={onDelete ? () => onDelete(entry, "refresh") : () => {}} />
        )}

        {/* Loan taken — repayment status */}
        {isLoanTaken && (() => {
          const rem = entry.receivable ?? 0;
          return rem <= 0 ? (
            <View style={styles.settledBadge}>
              <Icons.check size={10} color="#10b981" />
              <Text style={styles.settledBadgeText}>Repaid</Text>
            </View>
          ) : (
            <Text style={styles.loanTakenRem}>
              Still to repay:{" "}
              <Text style={{ color: "#818cf8", fontWeight: FONT_WEIGHT.semibold }}>
                ₹{fmt(rem)}
              </Text>
            </Text>
          );
        })()}

        {/* Group link */}
        {!!entry.group_id && (
          <TouchableOpacity onPress={() => onNavigateGroup?.(entry.group_id)}>
            <Text style={styles.groupLink}>→ {entry.group_name}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right: amount + delete */}
      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, { color }]}>
          {cfg.sign}₹{fmt(disp)}
        </Text>
        {isDeletable && (
          <TouchableOpacity
            style={styles.delBtn}
            onPress={() => {
              Alert.alert(
                "Delete entry",
                `Delete "${entry.label}"?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => onDelete?.(entry) },
                ]
              );
            }}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={COLORS.danger} />
              : <Icons.trash size={14} color={COLORS.text3} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Tab bar
// ─────────────────────────────────────────────
const TABS = [
  { id: "all",      label: "All"      },
  { id: "spent",    label: "Spent"    },
  { id: "received", label: "Received" },
  { id: "loans",    label: "Loans"    },
];

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────
export default function ExpensesScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState(null);
  const [selMonth, setSelMonth] = useState(currentMonth);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/timeline/");
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Available months for navigator bounds
  const availableMonths = useMemo(() => {
    const seen = new Set();
    for (const e of entries) {
      if (e.date?.length >= 7) seen.add(e.date.slice(0, 7));
    }
    return Array.from(seen).sort();
  }, [entries]);

  const monthEntries = useMemo(() => filterByMonth(entries, selMonth), [entries, selMonth]);
  const summary      = useMemo(() => computeSummary(monthEntries), [monthEntries]);

  const visible = useMemo(() => monthEntries.filter(e => {
    const cfg = TYPE_CFG[e.type];
    if (!cfg) return false;
    if (filter !== "all" && cfg.bucket !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${e.label} ${e.sub} ${e.group_name || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [monthEntries, filter, search]);

  const grouped = useMemo(() => groupByMonthAndDay(visible), [visible]);

  async function handleDelete(entry, mode) {
    if (mode === "refresh") { load(); return; }
    setDeleting(entry.ref_id);
    try {
      if (entry.type === "personal_expense") await client.delete(`/personal-expenses/${entry.ref_id}/`);
      else if (entry.type === "income")      await client.delete(`/income/${entry.ref_id}/`);
      else if (entry.type === "loan_given")  await client.delete(`/loans/${entry.ref_id}/`);
      else if (entry.type === "loan_taken")  await client.delete(`/borrows/${entry.ref_id}/`);
      await load();
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  const sumCards = [
    { label: "Total Spent",    value: summary.spent,    color: COLORS.danger,  sub: "personal + your group share" },
    { label: "Money Received", value: summary.received, color: COLORS.success, sub: "income + settlements in"     },
    { label: "You Are Owed",   value: summary.lent,     color: summary.lent     > 0 ? COLORS.success : COLORS.text2, sub: "group balances + loans" },
    { label: "You Owe",        value: summary.borrowed, color: summary.borrowed > 0 ? COLORS.danger  : COLORS.text2, sub: "outstanding borrowed"    },
  ];

  const monthDisplayLabel = fmtMonthLabel(selMonth);

  // Build flat list data from grouped structure
  const listData = useMemo(() => {
    const rows = [];
    for (const { monthKey, monthLabel, days } of grouped) {
      // Compute section spent
      const sectionEntries = days.flatMap(d => d.entries);
      const sectionSpent = sectionEntries.reduce((acc, e) => {
        const cfg = TYPE_CFG[e.type];
        if (!cfg || cfg.bucket !== "spent") return acc;
        return acc + displayAmount(e);
      }, 0);
      rows.push({ _type: "monthHeader", key: `mh-${monthKey}`, monthLabel, sectionSpent });
      for (const { dateKey, dayLabel, isToday, entries: dayEntries } of days) {
        rows.push({ _type: "dayHeader", key: `dh-${dateKey}`, dayLabel, isToday });
        for (let i = 0; i < dayEntries.length; i++) {
          const e = dayEntries[i];
          rows.push({ _type: "entry", key: `e-${e.type}-${e.ref_id}-${i}`, entry: e });
        }
      }
    }
    return rows;
  }, [grouped]);

  function renderItem({ item }) {
    if (item._type === "monthHeader") {
      return (
        <View style={styles.monthHeading}>
          <Text style={styles.monthHeadingText}>{item.monthLabel}</Text>
          {item.sectionSpent > 0 && (
            <Text style={styles.monthHeadingSum}>
              spent ₹{fmt(item.sectionSpent)}
            </Text>
          )}
        </View>
      );
    }
    if (item._type === "dayHeader") {
      return (
        <Text style={[styles.dateHeader, item.isToday && styles.dateHeaderToday]}>
          {item.dayLabel}
        </Text>
      );
    }
    return (
      <EntryRow
        entry={item.entry}
        deleting={deleting}
        onDelete={handleDelete}
        onNavigateGroup={gid => navigation.navigate("GroupDetail", { groupId: gid })}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScreenHeader
        title="Expenses"
        actions={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddEntry")}
          >
            <Icons.plus size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={listData}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[]}
        ListHeaderComponent={
          <>
            {/* Page sub-title */}
            {/* <Text style={styles.subtitle}>
              Financial summary for{" "}
              <Text style={{ color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold }}>
                {monthDisplayLabel}
              </Text>
            </Text> */}

            <View style={{ marginBottom: 20, marginTop: 4 }}>
              <Text style={styles.pageTitle}>Expenses</Text>
              <Text style={styles.subtitle}>
                Financial summary for{" "}
                <Text style={{ color: COLORS.text, fontWeight: FONT_WEIGHT.semibold }}>
                  {monthDisplayLabel}
                </Text>
              </Text>
            </View>

            {/* Summary cards — 2×2 grid */}
            <View style={styles.sumGrid}>
              {sumCards.map(c => (
                <SummaryCard key={c.label} {...c} loading={loading} />
              ))}
            </View>

            {/* Search bar */}
            <View style={styles.searchWrap}>
              <Icons.search size={14} color={COLORS.text3} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search entries…"
                placeholderTextColor={COLORS.text3}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContainer}
            >
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tab, filter === t.id && styles.tabActive]}
                  onPress={() => setFilter(t.id)}
                >
                  <Text style={[styles.tabText, filter === t.id && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month navigator */}
            <View style={styles.navRow}>
              <MonthNavigator
                value={selMonth}
                onChange={setSelMonth}
                availableMonths={availableMonths}
              />
              <Text style={styles.entryCount}>
                {visible.length} entr{visible.length !== 1 ? "ies" : "y"}
              </Text>
            </View>

            {/* Loading skeletons */}
            {loading && (
              <View style={{ gap: 12, marginTop: 8 }}>
                {[0,1,2,3].map(i => (
                  <View key={i} style={styles.skelRow}>
                    <View style={[styles.skel, { width: 36, height: 36, borderRadius: 10 }]} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={[styles.skel, { width: "50%", height: 12 }]} />
                      <View style={[styles.skel, { width: "30%", height: 10 }]} />
                    </View>
                    <View style={[styles.skel, { width: 64, height: 14 }]} />
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {!loading && visible.length === 0 && (
              <View style={styles.empty}>
                <Icons.inboxZero size={48} color={COLORS.text3} />
                <Text style={styles.emptyTitle}>
                  {search
                    ? `No results for "${search}"`
                    : filter !== "all"
                      ? `No ${filter} entries in ${monthDisplayLabel}`
                      : `No entries for ${monthDisplayLabel}`}
                </Text>
                {!search && filter === "all" && (
                  <Text style={styles.emptyHint}>
                    Use "Add" to record a transaction,{"\n"}
                    or navigate to another month.
                  </Text>
                )}
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  listContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING["2xl"],
  },

  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
    marginBottom: 14,
    marginTop: 4,
  },

  /* Summary grid */
  sumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  sumCard: {
    width: "47.5%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  sumLabel: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.09 * 10,
    textTransform: "uppercase",
    color: COLORS.text3,
    marginBottom: 8,
  },
  sumVal: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sumSub: {
    fontSize: 10,
    color: COLORS.text3,
    lineHeight: 14,
  },
  sumSkel: {
    height: 20,
    width: "60%",
    backgroundColor: COLORS.surface3,
    borderRadius: 4,
    marginBottom: 6,
  },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    padding: 0,
  },

  /* Tabs */
  tabsScroll: { marginBottom: 10 },
  tabsContainer: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: COLORS.surface2,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 7,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text2,
  },
  tabTextActive: { color: COLORS.text },

  /* Month nav */
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 8,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  monthNavBtn: {
    width: 32,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavBtnDisabled: { opacity: 0.3 },
  monthNavLabel: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    height: 34,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  monthNavLabelText: {
    fontSize: 12.5,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  monthReset: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  monthResetText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primaryH,
  },
  entryCount: {
    fontSize: 12,
    color: COLORS.text3,
  },

  /* Timeline */
  monthHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderColor: COLORS.border,
    paddingBottom: 8,
    marginTop: 24,
    marginBottom: 0,
  },
  monthHeadingText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: 0.1 * 10,
    textTransform: "uppercase",
    color: COLORS.text2,
  },
  monthHeadingSum: {
    fontSize: 11,
    color: COLORS.text3,
  },
  dateHeader: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.06 * 10,
    textTransform: "uppercase",
    color: COLORS.text3,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  dateHeaderToday: { color: COLORS.primaryH },

  /* Entry row */
  entry: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  entryBody: { flex: 1, minWidth: 0 },
  entryLabel: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  entrySub: {
    fontSize: 12,
    color: COLORS.text3,
    lineHeight: 17,
  },
  entryRight: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
    minWidth: 80,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -0.3,
  },
  delBtn: {
    padding: 4,
    borderRadius: 6,
  },

  /* Group expense breakdown */
  breakdown: {
    marginTop: 7,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownKey: { fontSize: 12, color: COLORS.text2 },
  breakdownVal: { fontSize: 12, fontWeight: FONT_WEIGHT.semibold },

  /* Inline repay */
  repayRemaining: { fontSize: 11.5, color: COLORS.text3, marginBottom: 5 },
  repayRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  repayInput: {
    flex: 1,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    color: COLORS.text,
    fontSize: 12,
  },
  repayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#10b981",
  },
  repayBtnText: {
    fontSize: 11.5,
    fontWeight: FONT_WEIGHT.bold,
    color: "#fff",
  },
  repayErr: { fontSize: 11, color: "#f87171", marginTop: 4 },

  /* Settled badge */
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.1)",
    marginTop: 6,
  },
  settledBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.07 * 10,
    textTransform: "uppercase",
    color: "#10b981",
  },

  loanTakenRem: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.text3,
  },

  groupLink: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.primaryH,
    textDecorationLine: "underline",
  },

  /* Skeleton */
  skelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  skel: {
    backgroundColor: COLORS.surface3,
    borderRadius: 5,
  },

  /* Empty */
  empty: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text2,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.text3,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 19,
  },

  /* Add button */
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: "#fff",
  },

  /* 🔥 Picker Modal Styles */
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Integrated bg color directly into overlay
  },
  pickerBox: {
    width: 300, // 🔥 Fix 3: Fixed compact width instead of 100% screen stretch
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base, // Tighter padding
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5, 
  },
  pickerYearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base, // Tighter margin
    paddingHorizontal: SPACING.xs,
  },
  pickerYearText: {
    fontSize: 17, // Slightly reduced font
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm, // Tighter gap between buttons
  },
  pickerMonthBtn: {
    width: '31%', // Ensures tight 3-column fit
    alignItems: 'center',
    paddingVertical: 10, // Hardcoded tighter height
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerMonthBtnSelected: {
    backgroundColor: COLORS.primary,
  },
  pickerMonthBtnHasData: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
  },
  pickerMonthBtnDisabled: {
    opacity: 0.3, // Visually fade out future, un-clickable months
  },
  pickerMonthText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text2,
  },
  pickerMonthTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
    marginTop: 2,   // tight — subtitle cuddles under title
  },
});