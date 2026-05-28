// SplitEase/mobile/src/screens/settlements/SettlementsScreen.jsx

/**
 * SettlementsScreen.jsx
 * Global settlements view across all groups.
 * Shows simplified transactions for each group the user is in.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, EmptyState, LoadingState, Badge, Card } from '../../components/common/ui';
import { Icons } from '../../constants/icons';
import ScreenHeader from '../../components/layout/ScreenHeader';

// ── Settlement card ────────────────────────────────────────────────────────
function SettlementCard({ groupName, groupId, settlements, currentUserId, currentUserName, onGoToGroup }) {
  const relevant = settlements.filter(
    s => s.from_id === currentUserId || s.to_id === currentUserId
  );
  if (!relevant.length) return null;

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity style={styles.groupCardHeader} onPress={onGoToGroup} activeOpacity={0.7}>
        <Avatar name={groupName} size={32} />
        <Text style={styles.groupCardName} numberOfLines={1}>{groupName}</Text>
        <Icons.chevronRight size={16} color={COLORS.text3} />
      </TouchableOpacity>

      {relevant.map((s, i) => {
        const isDebtor   = s.from_id === currentUserId;
        const isCreditor = s.to_id   === currentUserId;
        const color = isDebtor ? COLORS.danger : COLORS.success;
        const label = isDebtor
          ? `You owe ${s.to_name}`
          : `${s.from_name} owes you`;

        return (
          <View key={i} style={styles.settleRow}>
            <View style={styles.settleLeft}>
              <Avatar name={isDebtor ? s.to_name : s.from_name} size={36} />
              <View>
                <Text style={styles.settleName}>{label}</Text>
                {isDebtor && s.to_upi && (
                  <Text style={styles.settleUpi}>{s.to_upi}</Text>
                )}
              </View>
            </View>
            <View style={styles.settleRight}>
              <Text style={[styles.settleAmount, { color }]}>
                {isDebtor ? '-' : '+'}₹{parseFloat(s.amount).toFixed(2)}
              </Text>
              {isDebtor && s.to_upi && (
                <Badge label="UPI" variant="primary" />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function SettlementsScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const [data,       setData]       = useState([]);   // [{ group, settlements }]
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Summary numbers
  const totalOwed  = data.reduce((sum, g) =>
    sum + g.settlements
      .filter(s => s.to_id === user.user_id)
      .reduce((a, s) => a + parseFloat(s.amount), 0), 0);

  const totalOwe   = data.reduce((sum, g) =>
    sum + g.settlements
      .filter(s => s.from_id === user.user_id)
      .reduce((a, s) => a + parseFloat(s.amount), 0), 0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data: groups } = await client.get(ENDPOINTS.groups);
      const results = await Promise.all(groups.map(async g => {
        try {
          const { data: settlements } = await client.get(ENDPOINTS.settlements(g.group_id));
          return { group: g, settlements: settlements || [] };
        } catch {
          return { group: g, settlements: [] };
        }
      }));
      // Only include groups with outstanding balances relevant to current user
      setData(results.filter(r =>
        r.settlements.some(s => s.from_id === user.user_id || s.to_id === user.user_id)
      ));
    } catch {
      Alert.alert('Error', 'Failed to load settlements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.user_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Icons.settlements size={32} color={COLORS.text3} />
        <Text style={{ fontSize: FONT_SIZE.base, color: COLORS.text3 }}>Calculating balances…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Settle Up" />

      <FlatList
        data={data}
        keyExtractor={d => String(d.group.group_id)}
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
          <View style={styles.summary}>
            <View style={styles.summaryCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icons.income size={12} color={COLORS.success} />
                <Text style={styles.summaryLabel}>You are owed</Text>
              </View>
              <Text style={[styles.summaryAmt, { color: COLORS.success }]}>
                ₹{totalOwed.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icons.lendMoney size={12} color={COLORS.danger} />
                <Text style={styles.summaryLabel}>You owe</Text>
              </View>
              <Text style={[styles.summaryAmt, { color: COLORS.danger }]}>
                ₹{totalOwe.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingTop: 64, gap: 12 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 20,
              backgroundColor: 'rgba(16,185,129,0.10)',
              borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.checkCircle size={34} color={COLORS.success} />
            </View>
            <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text }}>
              All settled up!
            </Text>
            <Text style={{ fontSize: FONT_SIZE.base, color: COLORS.text3, textAlign: 'center', paddingHorizontal: 32 }}>
              No outstanding balances across any of your groups.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SettlementCard
            groupName={item.group.group_name}
            groupId={item.group.group_id}
            settlements={item.settlements}
            currentUserId={user.user_id}
            currentUserName={user.name}
            onGoToGroup={() => navigation.navigate('Groups', {
              screen: 'GroupDetail',
              params: { groupId: item.group.group_id, groupName: item.group.group_name },
            })}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING['2xl'] },

  summary: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  summaryCard:    { flex: 1, padding: SPACING.lg, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  summaryLabel:   { fontSize: FONT_SIZE.sm, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },
  summaryAmt:     { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold },

  groupCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  groupCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  groupCardName:  { flex: 1, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  groupCardArrow: { color: COLORS.text3, fontSize: FONT_SIZE.lg },

  settleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  settleLeft:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  settleName:   { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  settleUpi:    { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  settleRight:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  settleAmount: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});