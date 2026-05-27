// SplitEase/mobile/src/screens/activity/ActivityScreen.jsx

/**
 * ActivityScreen.jsx
 *
 * Matches web Activity.jsx exactly:
 * - Single GET /timeline/?limit=200 call (not N+1 fan-out)
 * - All 8 event types with correct colors
 * - Filter tabs: All | Group | Personal | Money
 * - Summary chips at top
 * - Grouped by date
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { EmptyState, LoadingState } from '../../components/common/ui';
import ScreenHeader from '../../components/layout/ScreenHeader';

// Matches web TYPE_META exactly
const TYPE_META = {
  group_expense:       { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', label: 'Group expense'   },
  group_expense_owed:  { bg: 'rgba(239,68,68,0.10)',   color: '#f87171', label: 'You owe'         },
  personal_expense:    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', label: 'Personal'        },
  income:              { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', label: 'Income'          },
  loan_given:          { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', label: 'Loan given'      },
  loan_taken:          { bg: 'rgba(236,72,153,0.12)',  color: '#f472b6', label: 'Loan taken'      },
  settlement_received: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', label: 'Received'        },
  settlement_sent:     { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', label: 'Sent'            },
};

const TYPE_ICON = {
  group_expense:       '📄',
  group_expense_owed:  '📄',
  personal_expense:    '💸',
  income:              '📈',
  loan_given:          '🤝',
  loan_taken:          '🏦',
  settlement_received: '✅',
  settlement_sent:     '✅',
};

// Matches web tabMatches()
function tabMatches(tab, type) {
  if (tab === 'all')      return true;
  if (tab === 'group')    return type === 'group_expense' || type === 'group_expense_owed' || type.startsWith('settlement');
  if (tab === 'personal') return type === 'personal_expense' || type === 'income';
  if (tab === 'money')    return type === 'loan_given' || type === 'loan_taken';
  return true;
}

function isInflow(type) {
  return type === 'income' || type === 'settlement_received' || type === 'loan_taken';
}

function dateLabel(d) {
  const today = new Date().toISOString().split('T')[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (d === today) return 'Today';
  if (d === yest)  return 'Yesterday';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ── Activity row ───────────────────────────────────────────────────────────
function ActivityRow({ item, onPress }) {
  const meta     = TYPE_META[item.type] || TYPE_META.group_expense;
  const inflow   = isInflow(item.type);
  const canNav   = !!item.group_id;
  const amount   = Number(item.amount || 0);
  const icon     = TYPE_ICON[item.type] || '💰';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={canNav ? onPress : undefined}
      activeOpacity={canNav ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel} numberOfLines={1}>{item.label}</Text>
        <View style={styles.rowMeta}>
          <View style={[styles.rowTag, { borderColor: meta.color + '40' }]}>
            <Text style={[styles.rowTagText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.sub && <Text style={styles.rowSub} numberOfLines={1}>{item.sub}</Text>}
          {item.group_name && (
            <Text style={styles.rowGroup} numberOfLines={1}>{item.group_name}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.rowAmt, { color: inflow ? COLORS.success : COLORS.text }]}>
        {inflow ? '+' : ''}₹{fmt(amount)}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'group',    label: 'Group'    },
  { id: 'personal', label: 'Personal' },
  { id: 'money',    label: 'Money'    },
];

export default function ActivityScreen() {
  const navigation   = useNavigation();
  const [feed,       setFeed]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState('all');
  const [search,     setSearch]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data } = await client.get(ENDPOINTS.timeline + '?limit=200');
      setFeed(data || []);
    } catch {
      setFeed([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Summary chips — matches web
  const groupSpend    = feed.filter(f => f.type === 'group_expense').reduce((s, e) => s + Number(e.amount || 0), 0);
  const personalSpend = feed.filter(f => f.type === 'personal_expense').reduce((s, e) => s + Number(e.amount || 0), 0);
  const settledCount  = feed.filter(f => f.type === 'settlement_sent' || f.type === 'settlement_received').length;

  // Filter
  const visible = feed.filter(item => {
    if (!tabMatches(tab, item.type)) return false;
    if (search) {
      const q   = search.toLowerCase();
      const hay = `${item.label || ''} ${item.sub || ''} ${item.group_name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Group by date for SectionList
  const grouped = {};
  visible.forEach(item => {
    const d = item.date || 'Unknown';
    (grouped[d] = grouped[d] || []).push(item);
  });
  const sections = Object.keys(grouped)
    .sort()
    .reverse()
    .map(date => ({ title: dateLabel(date), data: grouped[date] }));

  if (loading) return <LoadingState label="Loading activity…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Activity" />

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
                  <View style={[styles.chipDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.chipText}>₹{fmt(groupSpend)} group spend</Text>
                </View>
                <View style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.chipText}>₹{fmt(personalSpend)} personal</Text>
                </View>
                <View style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.chipText}>{settledCount} settlement{settledCount !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            )}

            {/* Search */}
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
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
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
                  onPress={() => setTab(t.id)}
                >
                  <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.countText}>{visible.length} item{visible.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="📋"
            title={search ? `No results for "${search}"` : 'No activity yet'}
            subtitle={!search ? 'Expenses, payments, and income will appear here.' : ''}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHead}>
            <Text style={styles.dateHeadText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ActivityRow
            item={item}
            onPress={() => item.group_id && navigation.navigate('Groups', {
              screen: 'GroupDetail',
              params: { groupId: item.group_id, groupName: item.group_name },
            })}
          />
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.bg },
  list:       { paddingBottom: SPACING['2xl'] },
  listHeader: { padding: SPACING.base, gap: SPACING.base },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipDot:  { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon:  { fontSize: 13, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, color: COLORS.text, fontSize: FONT_SIZE.md },

  tabs: {
    flexDirection: 'row', gap: 4,
    backgroundColor: COLORS.surface2, padding: 4,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtn:         { flex: 1, paddingVertical: 5, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabBtnActive:   { backgroundColor: COLORS.surface },
  tabText:        { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  tabTextActive:  { color: COLORS.text },
  countText:      { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  dateHead: {
    paddingHorizontal: SPACING.base, paddingVertical: 10,
    backgroundColor: COLORS.surface2,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dateHeadText: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.8, textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: SPACING.base, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowIcon:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody:    { flex: 1, gap: 4 },
  rowLabel:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  rowMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowTag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1,
    backgroundColor: COLORS.surface2,
  },
  rowTagText: { fontSize: 10, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.4 },
  rowSub:     { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  rowGroup:   { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  rowAmt:     { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.extrabold },
});