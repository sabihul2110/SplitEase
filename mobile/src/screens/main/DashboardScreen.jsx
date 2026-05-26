// SplitEase/mobile/src/screens/main/DashboardScreen.jsx

/**
 * DashboardScreen.jsx
 *
 * Home screen. Shows:
 * - Net balance hero card (how much you're owed / owe overall)
 * - Groups summary with per-group balances
 * - Quick actions
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Card, LoadingState, EmptyState, Avatar } from '../../components/common/ui';

// ── Balance hero card ─────────────────────────────────────────────────────
function BalanceHero({ netBalance }) {
  const isPositive = netBalance > 0;
  const isNeutral  = netBalance === 0;
  const color = isNeutral ? COLORS.text2 : isPositive ? COLORS.success : COLORS.danger;
  const label = isNeutral ? 'All settled up!' : isPositive ? 'You are owed' : 'You owe';

  return (
    <View style={[styles.hero, { borderColor: color + '40' }]}>
      <View style={[styles.heroDot, { backgroundColor: color + '22' }]}>
        <Text style={{ fontSize: 28 }}>{isNeutral ? '✓' : isPositive ? '↑' : '↓'}</Text>
      </View>
      <Text style={[styles.heroLabel, { color: COLORS.text2 }]}>{label}</Text>
      <Text style={[styles.heroAmount, { color }]}>
        ₹{Math.abs(netBalance).toFixed(2)}
      </Text>
      {!isNeutral && (
        <Text style={styles.heroSub}>
          {isPositive ? 'across all your groups' : 'across all your groups'}
        </Text>
      )}
    </View>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────
function GroupRow({ group, balance, onPress }) {
  const val    = parseFloat(balance) || 0;
  const color  = val > 0 ? COLORS.success : val < 0 ? COLORS.danger : COLORS.text3;
  const prefix = val > 0 ? '+' : '';

  return (
    <TouchableOpacity style={styles.groupRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.groupLeft}>
        <Avatar name={group.group_name} size={40} />
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>{group.group_name}</Text>
          <Text style={styles.groupMeta}>
            {group.member_count || 0} members
          </Text>
        </View>
      </View>
      <View style={styles.groupRight}>
        <Text style={[styles.groupBalance, { color }]}>
          {val === 0 ? 'Settled' : `${prefix}₹${Math.abs(val).toFixed(0)}`}
        </Text>
        <Text style={styles.groupArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }     = useAuth();
  const navigation   = useNavigation();
  const [groups,     setGroups]     = useState([]);
  const [balances,   setBalances]   = useState({});   // { group_id: net_balance }
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data } = await client.get(ENDPOINTS.groups);
      setGroups(data);

      // Fetch simplified settlements for each group to compute per-group balance
      const balanceMap = {};
      await Promise.all(data.map(async (g) => {
        try {
          const { data: sData } = await client.get(ENDPOINTS.settlements(g.group_id));
          // Find what current user owes/is owed in this group
          let net = 0;
          (sData || []).forEach(s => {
            if (s.from_id === user.user_id) net -= parseFloat(s.amount);
            if (s.to_id   === user.user_id) net += parseFloat(s.amount);
          });
          balanceMap[g.group_id] = net;
        } catch {
          balanceMap[g.group_id] = 0;
        }
      }));
      setBalances(balanceMap);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.user_id]);

  // Reload whenever the tab gains focus (e.g. after adding expense)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const netBalance = Object.values(balances).reduce((a, b) => a + b, 0);

  if (loading) return <LoadingState label="Loading dashboard…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={groups}
        keyExtractor={g => String(g.group_id)}
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
            {/* Topbar */}
            <View style={styles.topbar}>
              <View>
                <Text style={styles.greeting}>
                  Hello, {user?.name?.split(' ')[0]} 👋
                </Text>
                <Text style={styles.date}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <Avatar name={user?.name} size={40} />
            </View>

            {/* Balance hero */}
            <BalanceHero netBalance={netBalance} />

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => navigation.navigate('Groups', { screen: 'GroupsList', params: { openCreate: true } })}
                activeOpacity={0.7}
              >
                <Text style={styles.qaIcon}>＋</Text>
                <Text style={styles.qaLabel}>New Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => navigation.navigate('Settle')}
                activeOpacity={0.7}
              >
                <Text style={styles.qaIcon}>⇄</Text>
                <Text style={styles.qaLabel}>Settle Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => navigation.navigate('Activity')}
                activeOpacity={0.7}
              >
                <Text style={styles.qaIcon}>◎</Text>
                <Text style={styles.qaLabel}>Activity</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>YOUR GROUPS</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="🏘️"
            title="No groups yet"
            subtitle="Create a group and start splitting expenses with friends."
          />
        )}
        renderItem={({ item: group }) => (
          <GroupRow
            group={group}
            balance={balances[group.group_id] ?? 0}
            onPress={() => navigation.navigate('Groups', {
              screen: 'GroupDetail',
              params: { groupId: group.group_id, groupName: group.group_name },
            })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  list:    { paddingBottom: SPACING['2xl'] },
  header:  { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, gap: SPACING.base },

  topbar:  {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingBottom: SPACING.sm,
  },
  greeting:{ fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  date:    { fontSize: FONT_SIZE.sm, color: COLORS.text3, marginTop: 2 },

  hero: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm,
  },
  heroDot: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs,
  },
  heroLabel:  { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium },
  heroAmount: { fontSize: FONT_SIZE['4xl'], fontWeight: FONT_WEIGHT.extrabold },
  heroSub:    { fontSize: FONT_SIZE.sm, color: COLORS.text3 },

  quickActions: { flexDirection: 'row', gap: SPACING.sm },
  qaBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, gap: 4,
  },
  qaIcon:  { fontSize: 20, color: COLORS.primary },
  qaLabel: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },

  sectionTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3, letterSpacing: 1, marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },

  groupRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  groupLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  groupInfo:    { flex: 1 },
  groupName:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  groupMeta:    { fontSize: FONT_SIZE.sm, color: COLORS.text3, marginTop: 2 },
  groupRight:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  groupBalance: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  groupArrow:   { fontSize: FONT_SIZE.lg, color: COLORS.text3 },
  separator:    { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.base },
});