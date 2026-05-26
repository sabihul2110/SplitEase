// SplitEase/mobile/src/screens/groups/GroupDetailScreen.jsx

/**
 * GroupDetailScreen.jsx
 *
 * Three tabs: Expenses | Settlements | Members
 * Floating action button to add expense.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, EmptyState, LoadingState, Badge, Card } from '../../components/common/ui';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';

// ── Expense row ───────────────────────────────────────────────────────────
function ExpenseRow({ expense, currentUserId, onDelete }) {
  const isPayer = expense.payer_id === currentUserId;
  const date = expense.expense_date
    ? new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <View style={styles.expRow}>
      <View style={styles.expLeft}>
        <View style={styles.expIcon}>
          <Text style={{ fontSize: 18 }}>
            {expense.category_name === 'Food & Dining' ? '🍽️'
              : expense.category_name === 'Travel' ? '✈️'
              : expense.category_name === 'Accommodation' ? '🏨'
              : expense.category_name === 'Activities' ? '🎉'
              : expense.category_name === 'Utilities' ? '💡'
              : expense.category_name === 'Groceries' ? '🛒' : '💰'}
          </Text>
        </View>
        <View style={styles.expInfo}>
          <Text style={styles.expDesc} numberOfLines={1}>{expense.description}</Text>
          <Text style={styles.expMeta}>
            {isPayer ? 'You paid' : `${expense.payer_name} paid`} · {date}
          </Text>
        </View>
      </View>
      <View style={styles.expRight}>
        <Text style={styles.expAmount}>₹{parseFloat(expense.total_amount).toFixed(0)}</Text>
        {isPayer && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Delete Expense', 'Remove this expense?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.expense_id) },
              ]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.expDelete}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Settlement row ────────────────────────────────────────────────────────
function SettlementRow({ item, currentUserId }) {
  const isDebtor   = item.from_id === currentUserId;
  const isCreditor = item.to_id   === currentUserId;
  const color = isDebtor ? COLORS.danger : isCreditor ? COLORS.success : COLORS.text2;

  return (
    <View style={styles.settleRow}>
      <View style={styles.settleAvatars}>
        <Avatar name={item.from_name} size={32} />
        <Text style={styles.settleArrow}>→</Text>
        <Avatar name={item.to_name}   size={32} />
      </View>
      <View style={styles.settleInfo}>
        <Text style={styles.settleName}>
          {isDebtor ? 'You' : item.from_name} → {isCreditor ? 'You' : item.to_name}
        </Text>
        <Text style={[styles.settleAmount, { color }]}>
          ₹{parseFloat(item.amount).toFixed(2)}
        </Text>
      </View>
      {isDebtor && item.to_upi && (
        <Badge label="Pay via UPI" variant="primary" />
      )}
    </View>
  );
}

// ── Member row ────────────────────────────────────────────────────────────
function MemberRow({ member }) {
  return (
    <View style={styles.memberRow}>
      <Avatar name={member.name} size={38} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        {member.upi_id && <Text style={styles.memberUpi}>{member.upi_id}</Text>}
      </View>
    </View>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSelect }) {
  return (
    <View style={styles.tabs}>
      {tabs.map(t => (
        <TouchableOpacity
          key={t}
          style={[styles.tab, active === t && styles.tabActive]}
          onPress={() => onSelect(t)}
        >
          <Text style={[styles.tabText, active === t && styles.tabTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
const TABS = ['Expenses', 'Settlements', 'Members'];

export default function GroupDetailScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName } = route.params;

  const [tab,         setTab]         = useState('Expenses');
  const [expenses,    setExpenses]    = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const [expRes, settleRes, memberRes] = await Promise.all([
        client.get(ENDPOINTS.expenses(groupId)),
        client.get(ENDPOINTS.settlements(groupId)),
        client.get(ENDPOINTS.groupMembers(groupId)),
      ]);
      setExpenses(expRes.data    || []);
      setSettlements(settleRes.data || []);
      setMembers(memberRes.data  || []);
    } catch {
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function deleteExpense(expenseId) {
    try {
      await client.delete(ENDPOINTS.delExpense(expenseId));
      setExpenses(prev => prev.filter(e => e.expense_id !== expenseId));
    } catch {
      Alert.alert('Error', 'Failed to delete expense');
    }
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => load(true)}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  );

  function renderContent() {
    if (loading) return <LoadingState />;

    if (tab === 'Expenses') {
      if (!expenses.length) return (
        <EmptyState
          icon="💸"
          title="No expenses yet"
          subtitle="Add the first expense for this group."
        />
      );
      return (
        <FlatList
          data={expenses}
          keyExtractor={e => String(e.expense_id)}
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              currentUserId={user.user_id}
              onDelete={deleteExpense}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={refreshControl}
          scrollEnabled={false} // outer ScrollView handles scrolling
        />
      );
    }

    if (tab === 'Settlements') {
      if (!settlements.length) return (
        <EmptyState icon="✅" title="All settled up!" subtitle="No outstanding balances." />
      );
      return settlements.map((s, i) => (
        <SettlementRow key={i} item={s} currentUserId={user.user_id} />
      ));
    }

    if (tab === 'Members') {
      if (!members.length) return (
        <EmptyState icon="👥" title="No members" subtitle="Invite people to this group." />
      );
      return members.map((m, i) => <MemberRow key={i} member={m} />);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={groupName}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddPayment', { groupId, groupName, members })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.payBtn}>Pay</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />

        <View style={styles.tabContent}>
          {renderContent()}
        </View>
      </ScrollView>

      {/* Floating add expense button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { groupId, groupName, members })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋ Add Expense</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.md,
    alignItems: 'center', borderBottomWidth: 2, borderBottomColor: COLORS.transparent,
  },
  tabActive:     { borderBottomColor: COLORS.primary },
  tabText:       { fontSize: FONT_SIZE.base, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },

  tabContent: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 100 },

  expRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  expLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  expIcon:   {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
  },
  expInfo:   { flex: 1 },
  expDesc:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  expMeta:   { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 3 },
  expRight:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  expAmount: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  expDelete: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  sep:       { height: SPACING.sm },

  settleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.md,
  },
  settleAvatars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settleArrow:   { color: COLORS.text3, fontSize: FONT_SIZE.base },
  settleInfo:    { flex: 1 },
  settleName:    { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  settleAmount:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.md,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  memberUpi:  { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },

  payBtn: {
    color: COLORS.success, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold,
  },

  fab: {
    position: 'absolute', bottom: SPACING.xl, right: SPACING.base, left: SPACING.base,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});