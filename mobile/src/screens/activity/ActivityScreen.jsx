// SplitEase/mobile/src/screens/activity/ActivityScreen.jsx

/**
 * ActivityScreen.jsx
 * Unified activity timeline: expenses + payments across all groups.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, EmptyState, LoadingState } from '../../components/common/ui';
import ScreenHeader from '../../components/layout/ScreenHeader';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0)  return `${days}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  if (mins  > 0)  return `${mins}m ago`;
  return 'Just now';
}

function ActivityItem({ item }) {
  const isExpense = item.type === 'expense';
  const color     = isExpense ? COLORS.warning : COLORS.success;

  return (
    <View style={styles.item}>
      <View style={[styles.itemDot, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Text style={{ fontSize: 16 }}>{isExpense ? '💸' : '✅'}</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={styles.itemDesc} numberOfLines={1}>
            {item.description || (isExpense ? 'Expense' : 'Payment')}
          </Text>
          <Text style={[styles.itemAmount, { color }]}>
            {isExpense ? '' : '+'} ₹{parseFloat(item.amount || 0).toFixed(0)}
          </Text>
        </View>
        <Text style={styles.itemMeta}>
          {isExpense
            ? `${item.payer_name} paid · ${item.group_name}`
            : `${item.payer_name} → ${item.payee_name} · ${item.group_name}`}
        </Text>
        <Text style={styles.itemTime}>{timeAgo(item.date || item.expense_date || item.payment_date)}</Text>
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const { user }     = useAuth();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data } = await client.get(ENDPOINTS.timeline);
      setItems(data || []);
    } catch {
      // Timeline endpoint might not exist — fallback: fetch from all groups
      try {
        const { data: groups } = await client.get(ENDPOINTS.groups);
        const allItems = [];
        await Promise.all(groups.slice(0, 5).map(async g => {
          try {
            const { data: exps } = await client.get(ENDPOINTS.expenses(g.group_id));
            (exps || []).forEach(e => allItems.push({ ...e, type: 'expense', group_name: g.group_name }));
          } catch {}
        }));
        allItems.sort((a, b) => new Date(b.expense_date || 0) - new Date(a.expense_date || 0));
        setItems(allItems);
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState label="Loading activity…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Activity" />
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.type}-${item.expense_id || item.payment_id || i}`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={() => (
          <EmptyState
            icon="📋"
            title="No activity yet"
            subtitle="Add expenses to see your activity feed here."
          />
        )}
        renderItem={({ item }) => <ActivityItem item={item} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: {
    padding: SPACING.base, gap: 0,
    paddingBottom: SPACING['2xl'],
  },
  item: {
    flexDirection: 'row', gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemDot: {
    width: 42, height: 42, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1, gap: 3 },
  itemTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDesc:    { flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  itemAmount:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  itemMeta:    { fontSize: FONT_SIZE.xs, color: COLORS.text2 },
  itemTime:    { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
});