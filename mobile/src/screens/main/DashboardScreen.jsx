// SplitEase/mobile/src/screens/main/DashboardScreen.jsx

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, LoadingState, EmptyState } from '../../components/common/ui';
import { Icons } from '../../constants/icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Top bar (Avatar → Account, Bell → Notifications) ───────────────────────
function TopBar({ initials, unreadCount = 0, onAvatar, onBell }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topBarBrand}>SplitEase</Text>
      <View style={styles.topBarRight}>
        {/* <TouchableOpacity
          style={styles.topBarIconBtn}
          onPress={onBell}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.bell size={20} color={COLORS.text2} />
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.topBarIconBtn}
          onPress={onBell}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.bell size={20} color={COLORS.text2} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.topBarAvatar} onPress={onAvatar}>
          <Text style={styles.topBarAvatarText}>{initials}</Text>
        </TouchableOpacity> */}
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
function HeroCard({ user, groups, netBalance, owedToYou, youOwe }) {
  const isPositive = netBalance >= 0;
  const netColor   = isPositive ? COLORS.success : COLORS.danger;
  const firstName  = user?.name?.split(' ')[0] || 'You';

  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>YOUR ACCOUNT</Text>
      <Text style={styles.heroName}>{firstName}'s SplitEase</Text>
      <Text style={styles.heroEmail}>{user?.email}</Text>

      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={[styles.heroStatVal, { color: '#93c5fd' }]}>{groups.length}</Text>
          <Text style={styles.heroStatLbl}>GROUPS</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={[styles.heroStatVal, { color: netColor }]}>
            {isPositive ? '+' : '−'}₹{fmt(Math.abs(netBalance))}
          </Text>
          <Text style={styles.heroStatLbl}>NET BALANCE</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={[styles.heroStatVal, { color: COLORS.success }]}>₹{fmt(owedToYou)}</Text>
          <Text style={styles.heroStatLbl}>YOU ARE OWED</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={[styles.heroStatVal, { color: youOwe > 0 ? COLORS.danger : COLORS.text2 }]}>
            ₹{fmt(youOwe)}
          </Text>
          <Text style={styles.heroStatLbl}>YOU OWE</Text>
        </View>
      </View>
    </View>
  );
}

// ── Mini balance card ──────────────────────────────────────────────────────
function MiniCard({ label, value, color, sub }) {
  return (
    <View style={[styles.miniCard, { borderColor: color + '33' }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniVal, { color }]}>₹{fmt(value)}</Text>
      <Text style={styles.miniSub}>{sub}</Text>
    </View>
  );
}

// ── Quick action button ────────────────────────────────────────────────────
function QuickAction({ label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.qaBtn, { backgroundColor: color + '14', borderColor: color + '30' }]}
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
    ? new Date(group.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return (
    <TouchableOpacity style={styles.groupRow} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={group.group_name} size={38} />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{group.group_name}</Text>
        <Text style={styles.groupDate}>{date}</Text>
      </View>
      <Text style={styles.groupChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }     = useAuth();
  const navigation   = useNavigation();
  const [groups,     setGroups]     = useState([]);
  const [owedToYou,  setOwedToYou]  = useState(0);
  const [youOwe,     setYouOwe]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = (user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data: groupList } = await client.get(ENDPOINTS.groups);
      setGroups(groupList || []);

      if (groupList?.length) {
        const { data: bulkResult } = await client.post(ENDPOINTS.settlementsBulk, {
          group_ids: groupList.map(g => g.group_id),
        });
        let owe = 0, owed = 0;
        Object.values(bulkResult).forEach(rows => {
          const myRow = rows.find(s => s.user_id === user?.user_id);
          if (!myRow) return;
          const net = Number(myRow.net_balance);
          if (net < 0) owe  += Math.abs(net);
          if (net > 0) owed += net;
        });
        setOwedToYou(owed);
        setYouOwe(owe);
      } else {
        setOwedToYou(0);
        setYouOwe(0);
      }

      try {
        const { data: nc } = await client.get(ENDPOINTS.notifCount);
        setUnreadCount(nc?.count || 0);
      } catch {}

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.user_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const netBalance = owedToYou - youOwe;
  const isPositive = netBalance >= 0;

  if (loading) return <LoadingState label="Loading dashboard…" />;

  const chips = [
    { label: `${groups.length} active group${groups.length !== 1 ? 's' : ''}`, color: '#3b82f6' },
    { label: user?.role === 'admin' ? 'Admin account' : 'Member account',      color: '#10b981' },
    { label: `Net balance: ${isPositive ? '+' : '−'}₹${fmt(Math.abs(netBalance))}`, color: isPositive ? '#10b981' : '#ef4444' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={groups.slice(0, 6)}
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

            {/* ── Global header bar ── */}
            <TopBar
              initials={initials}
              unreadCount={unreadCount}
              onAvatar={() => navigation.navigate('Account')}
              onBell={() => {
                setUnreadCount(0);
                navigation.navigate('Notifications');
              }}
            />

            {/* Status chips */}
            <View style={styles.chips}>
              {chips.map((c, i) => (
                <View key={i} style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                  <Text style={styles.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {/* Hero */}
              <HeroCard
                user={user}
                groups={groups}
                netBalance={netBalance}
                owedToYou={owedToYou}
                youOwe={youOwe}
              />

              {/* Mini cards */}
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <MiniCard
                    label="YOU ARE OWED"
                    value={owedToYou}
                    color={COLORS.success}
                    sub={owedToYou > 0 ? 'Pending' : 'All clear'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MiniCard
                    label="YOU OWE"
                    value={youOwe}
                    color={youOwe > 0 ? COLORS.danger : COLORS.text2}
                    sub={youOwe > 0 ? 'Pending' : 'All clear'}
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
                    onPress={() => navigation.navigate('Expenses')}
                  />
                  <QuickAction
                    label="View Groups"
                    color="#3b82f6"
                    onPress={() => navigation.navigate('Groups')}
                  />
                  <QuickAction
                    label="Loans"
                    color="#10b981"
                    onPress={() => navigation.navigate('Loans')}
                  />
                  <QuickAction
                    label="Activity"
                    color="#f59e0b"
                    onPress={() => navigation.navigate('More', { screen: 'Activity' })}
                  />
                  <QuickAction
                    label="Settle Up"
                    color="#8b5cf6"
                    onPress={() => navigation.navigate('More', { screen: 'Settlements' })}
                  />
                </View>
              </View>
            </View>

            {/* Recent groups heading */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Groups</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        // ListEmptyComponent={() => (
        //   <View style={{ padding: SPACING.base }}>
        //     <EmptyState
        //       icon="🏘️"
        //       title="No groups yet"
        //       subtitle="Create a group to start splitting."
        //     />
        //   </View>
        // )}
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
            onPress={() => navigation.navigate('Groups', {
              screen: 'GroupDetail',
              params: { groupId: group.group_id, groupName: group.group_name },
            })}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  list:   { paddingBottom: SPACING['2xl'] },
  header: { gap: SPACING.md, paddingTop: SPACING.sm },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
  },
  topBarBrand: {
    fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text, letterSpacing: -0.3,
  },
  topBarRight:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  topBarIconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.bg,
  },
  bellBadgeText: {
    fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: '#fff',
  },

  topBarAvatarText: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white,
  },

  // ── Chips ──
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipDot:  { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },

  grid: { gap: SPACING.sm, paddingHorizontal: SPACING.base },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
    padding: SPACING.xl,
    gap: SPACING.sm,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroLabel:   { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: 'rgba(147,197,253,0.65)', letterSpacing: 1 },
  heroName:    { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold, color: '#93c5fd' },
  heroEmail:   { fontSize: FONT_SIZE.sm, color: 'rgba(147,197,253,0.55)' },
  heroStats: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg,
    marginTop: SPACING.sm, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: 'rgba(37,99,235,0.2)',
  },
  heroStat:    { gap: 3 },
  heroStatVal: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  heroStatLbl: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.8 },

  // ── Mini cards ──
  miniCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, padding: SPACING.base, gap: 4,
  },
  miniLabel: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase' },
  miniVal:   { fontSize: FONT_SIZE['3xl'], fontWeight: FONT_WEIGHT.extrabold },
  miniSub:   { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  // ── Quick actions ──
  quickCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base, gap: SPACING.md,
  },
  quickList: { gap: SPACING.sm },
  qaBtn: {
    paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  qaLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },

  // ── Section head ──
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: SPACING.sm,
  },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  viewAll:      { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primary },

  // ── Group rows ──
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  groupInfo:    { flex: 1 },
  groupName:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  groupDate:    { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  groupChevron: { fontSize: FONT_SIZE.lg, color: COLORS.text3 },
});