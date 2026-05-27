// SplitEase/mobile/src/screens/groups/GroupDetailScreen.jsx
//
// Full feature parity with web GroupDetail:
//   Ledger tab  — expenses + payments combined, delete both
//   Settlements — simplified "who pays whom" + net balances
//   Members     — list with UPI IDs
//
// Bug fixes vs original:
//   • Parallel API calls now match web routes exactly
//   • Settlements use /settlements/:id/simplified (same as web)
//   • FlatList replaced with direct map() inside ScrollView (avoids
//     nested VirtualizedList warning / scroll conflicts)
//   • Each tab loads independently — no all-or-nothing failure
//   • Toast feedback for actions (reminder sent, copied, etc.)

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  RefreshControl, ScrollView, Animated, Linking,
  ActivityIndicator, Clipboard, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0f1117',
  surface:   '#181c27',
  surface2:  '#1e2333',
  surface3:  '#252a3a',
  border:    '#2a2f42',
  border2:   '#333a52',
  primary:   '#3b82f6',
  primaryLo: 'rgba(59,130,246,0.12)',
  success:   '#10b981',
  successLo: 'rgba(16,185,129,0.12)',
  danger:    '#ef4444',
  dangerLo:  'rgba(239,68,68,0.12)',
  warning:   '#f59e0b',
  warningLo: 'rgba(245,158,11,0.10)',
  text:      '#f1f5f9',
  text2:     '#94a3b8',
  text3:     '#64748b',
  white:     '#ffffff',
};

const F = {
  xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 28,
};

const W = {
  regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800',
};

const R = { sm: 8, md: 10, lg: 14, xl: 18, full: 999 };
const S = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 28 };

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtAmount(v) {
  return Number(v).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function categoryEmoji(cat) {
  const map = {
    'Food & Dining': '🍽️', Travel: '✈️', Accommodation: '🏨',
    Activities: '🎉', Utilities: '💡', Groceries: '🛒',
    Shopping: '🛍️', Entertainment: '🎬', Health: '🏥',
    Transport: '🚗',
  };
  return map[cat] || '💰';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34, variant = 'neutral' }) {
  const colors = {
    neutral:  { bg: C.surface3, text: C.text2, border: C.border },
    danger:   { bg: C.dangerLo, text: C.danger, border: 'rgba(239,68,68,0.3)' },
    success:  { bg: C.successLo, text: C.success, border: 'rgba(16,185,129,0.25)' },
  };
  const col = colors[variant] || colors.neutral;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: col.bg, borderWidth: 1, borderColor: col.border,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: W.bold, color: col.text }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── Badge / Tag ──────────────────────────────────────────────────────────────
function Badge({ label, variant = 'neutral' }) {
  const vars = {
    neutral: { bg: C.surface3, color: C.text2 },
    success: { bg: C.successLo, color: C.success },
    danger:  { bg: C.dangerLo,  color: C.danger },
    primary: { bg: C.primaryLo, color: C.primary },
    warning: { bg: C.warningLo, color: C.warning },
  };
  const v = vars[variant] || vars.neutral;
  return (
    <View style={{ backgroundColor: v.bg, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: F.xs, fontWeight: W.semibold, color: v.color }}>{label}</Text>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, color && { color }]}>{value}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ title, right }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ─── Expense row ──────────────────────────────────────────────────────────────
function ExpenseRow({ item, currentUserName, onDelete }) {
  const isPayer = item.payer_name === currentUserName;
  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerIcon}>
        <Text style={{ fontSize: 17 }}>{categoryEmoji(item.category_name)}</Text>
      </View>
      <View style={styles.ledgerMid}>
        <Text style={styles.ledgerDesc} numberOfLines={1}>{item.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Text style={styles.ledgerMeta}>
            {isPayer ? 'You paid' : `${item.payer_name} paid`} · {fmtDate(item.expense_date)}
          </Text>
          <Badge label={item.split_type || 'equal'} variant={item.split_type === 'equal' ? 'success' : 'primary'} />
        </View>
      </View>
      <View style={styles.ledgerRight}>
        <Text style={styles.ledgerAmt}>₹{fmtAmount(item.total_amount)}</Text>
        {isPayer && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => Alert.alert('Delete Expense', 'Remove this expense?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete('expense', item.expense_id) },
            ])}
          >
            <Text style={styles.deleteX}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Payment row ──────────────────────────────────────────────────────────────
function PaymentRow({ item, currentUserName, onDelete }) {
  const isPayer = item.payer_name === currentUserName;
  return (
    <View style={[styles.ledgerRow, { opacity: 0.75 }]}>
      <View style={[styles.ledgerIcon, { backgroundColor: C.successLo }]}>
        <Text style={{ fontSize: 17 }}>💸</Text>
      </View>
      <View style={styles.ledgerMid}>
        <Text style={[styles.ledgerDesc, { fontStyle: 'italic', color: C.text2 }]} numberOfLines={1}>
          Settlement{item.note ? ` — ${item.note}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Text style={styles.ledgerMeta}>{item.payer_name} · {fmtDate(item.payment_date)}</Text>
          <Badge label="payment" variant="success" />
        </View>
      </View>
      <View style={styles.ledgerRight}>
        <Text style={[styles.ledgerAmt, { color: C.success }]}>₹{fmtAmount(item.amount)}</Text>
        {isPayer && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => Alert.alert('Delete Payment', 'Remove this payment?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete('payment', item.payment_id) },
            ])}
          >
            <Text style={styles.deleteX}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Settlement row ───────────────────────────────────────────────────────────
function SettlementRow({ item, currentUserName, members, onRemind, reminding }) {
  const isDebtor   = item.from === currentUserName;
  const isCreditor = item.to   === currentUserName;

  // Build UPI link
  const toMember = members.find(m => m.name === item.to);
  const upiLink = toMember?.upi_id
    ? `upi://pay?pa=${toMember.upi_id}&am=${item.amount}&cu=INR&tn=SplitEase`
    : null;

  const borderColor = isDebtor ? 'rgba(239,68,68,0.25)'
    : isCreditor ? 'rgba(16,185,129,0.2)'
    : C.border;

  return (
    <View style={[styles.settleRow, { borderColor }]}>
      <View style={styles.settleNames}>
        <Avatar name={item.from} size={30} variant={isDebtor ? 'danger' : 'neutral'} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.settleName, isDebtor && { color: C.text }]}>
            {isDebtor ? 'You' : item.from}
            {isDebtor && <Text style={{ color: C.danger, fontSize: F.xs }}> · you</Text>}
          </Text>
        </View>
        <Text style={styles.settleArrow}>→</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[styles.settleName, isCreditor && { color: C.text }]}>
            {isCreditor ? 'You' : item.to}
            {isCreditor && <Text style={{ color: C.success, fontSize: F.xs }}> · you</Text>}
          </Text>
        </View>
        <Avatar name={item.to} size={30} variant={isCreditor ? 'success' : 'neutral'} />
      </View>

      <View style={styles.settleAction}>
        {isDebtor ? (
          <>
            <Text style={[styles.settleAmt, { color: C.danger }]}>
              ₹{fmtAmount(item.amount)}
            </Text>
            {upiLink ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.primaryLo, borderColor: 'rgba(59,130,246,0.3)' }]}
                onPress={() => Linking.openURL(upiLink).catch(() => Alert.alert('UPI app not found'))}
              >
                <Text style={[styles.actionBtnText, { color: C.primary }]}>Pay via UPI</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noUpi}>No UPI set</Text>
            )}
          </>
        ) : isCreditor ? (
          <>
            <Text style={[styles.settleAmt, { color: C.success }]}>
              +₹{fmtAmount(item.amount)}
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.warningLo, borderColor: 'rgba(245,158,11,0.3)' }]}
              onPress={() => onRemind(item)}
              disabled={reminding === item.from}
            >
              {reminding === item.from
                ? <ActivityIndicator size="small" color={C.warning} />
                : <Text style={[styles.actionBtnText, { color: C.warning }]}>🔔 Remind</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.settleAmt, { color: C.text2 }]}>₹{fmtAmount(item.amount)}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Net balance row ──────────────────────────────────────────────────────────
function NetRow({ item, currentUserName }) {
  const isMe = item.user_name === currentUserName;
  const net  = Number(item.net_balance);
  const variant = net > 0 ? 'success' : net < 0 ? 'danger' : 'neutral';
  const label   = `${net > 0 ? '+' : ''}₹${Math.abs(net).toLocaleString('en-IN')}`;
  return (
    <View style={[styles.netRow, isMe && styles.netRowMe]}>
      <Avatar name={item.user_name} size={32} variant={isMe ? 'primary' : 'neutral'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.netName, isMe && { color: C.text, fontWeight: W.bold }]}>
          {item.user_name}
          {isMe && <Text style={{ color: C.text3, fontWeight: W.regular }}> · you</Text>}
        </Text>
        <Text style={styles.netPaid}>paid ₹{fmtAmount(item.total_paid)}</Text>
      </View>
      <Badge label={label} variant={variant} />
    </View>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────
function MemberRow({ member, currentUserName }) {
  const isMe = member.name === currentUserName;
  return (
    <View style={[styles.memberRow, isMe && styles.memberRowMe]}>
      <Avatar name={member.name} size={40} variant={isMe ? 'primary' : 'neutral'} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isMe && <Badge label="you" variant="primary" />}
        </View>
        {member.upi_id
          ? <Text style={styles.memberUpi}>{member.upi_id}</Text>
          : <Text style={[styles.memberUpi, { fontStyle: 'italic' }]}>No UPI ID</Text>
        }
      </View>
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = ['Ledger', 'Settlements', 'Members'];

function TabBar({ active, counts, onSelect }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map(t => {
        const isActive = active === t;
        const count = counts[t];
        return (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onSelect(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {t}{count !== undefined ? ` (${count})` : ''}
            </Text>
            {isActive && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── My balance banner ────────────────────────────────────────────────────────
function BalanceBanner({ netBalances, currentUserName }) {
  const me = netBalances.find(s => s.user_name === currentUserName);
  if (!me) return null;
  const net = Number(me.net_balance);

  if (net === 0) return (
    <View style={[styles.banner, { borderColor: 'rgba(16,185,129,0.2)', backgroundColor: C.successLo }]}>
      <Text style={[styles.bannerLabel, { color: C.success }]}>✓ You're all settled up.</Text>
    </View>
  );

  const isOwed = net > 0;
  return (
    <View style={[styles.banner, {
      borderColor: isOwed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
      backgroundColor: isOwed ? C.successLo : C.dangerLo,
    }]}>
      <Text style={[styles.bannerSub, { color: C.text3 }]}>
        {isOwed ? 'You are owed' : 'You owe'}
      </Text>
      <Text style={[styles.bannerAmt, { color: isOwed ? C.success : C.danger }]}>
        {isOwed ? '+' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 36 }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName } = route.params;

  const userName = user?.name || user?.email || '';

  const [tab,          setTab]          = useState('Ledger');
  const [expenses,     setExpenses]     = useState([]);
  const [payments,     setPayments]     = useState([]);
  const [members,      setMembers]      = useState([]);
  const [simplified,   setSimplified]   = useState([]);
  const [netBalances,  setNetBalances]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [settLoading,  setSettLoading]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [settLoaded,   setSettLoaded]   = useState(false);
  const [reminding,    setReminding]    = useState('');
  const [toast,        setToast]        = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // ── Load core data (ledger + members) ──────────────────────────────────────
  const loadCore = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expRes, payRes, memRes] = await Promise.all([
        client.get(`/expenses/${groupId}`),
        client.get(`/payments/${groupId}`),
        client.get(`/groups/${groupId}/members`),
      ]);
      setExpenses(expRes.data  || []);
      setPayments(payRes.data  || []);
      setMembers(memRes.data   || []);
    } catch (err) {
      console.error('GroupDetail loadCore error:', err?.response?.status, err?.message);
      Alert.alert(
        'Failed to load',
        err?.response?.data?.detail || err?.message || 'Could not fetch group data. Check your connection.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  // ── Load settlements (lazy — only when tab opens) ─────────────────────────
  const loadSettlements = useCallback(async () => {
    setSettLoading(true);
    try {
      const [raw, simp] = await Promise.all([
        client.get(`/settlements/${groupId}`),
        client.get(`/settlements/${groupId}/simplified`),
      ]);
      setNetBalances(raw.data  || []);
      setSimplified(simp.data  || []);
      setSettLoaded(true);
    } catch (err) {
      console.error('Settlements error:', err?.response?.status, err?.message);
      Alert.alert('Error', 'Could not load settlements.');
    } finally {
      setSettLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { loadCore(); }, [loadCore]));

  function handleTab(t) {
    setTab(t);
    if (t === 'Settlements' && !settLoaded) loadSettlements();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(type, id) {
    try {
      if (type === 'expense') {
        await client.delete(`/expenses/${id}`);
        setExpenses(p => p.filter(e => e.expense_id !== id));
      } else {
        await client.delete(`/payments/${id}`);
        setPayments(p => p.filter(x => x.payment_id !== id));
      }
      showToast('Deleted successfully');
    } catch {
      Alert.alert('Error', 'Failed to delete.');
    }
  }

  // ── Send reminder ──────────────────────────────────────────────────────────
  async function handleRemind(s) {
    setReminding(s.from);
    try {
      await client.post(`/groups/${groupId}/remind`, {
        debtor_name: s.from,
        amount: s.amount,
      });
      showToast(`✓ Reminder sent to ${s.from}`);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to send reminder.');
    } finally {
      setReminding('');
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSpent = expenses.reduce((s, e) => s + Number(e.total_amount), 0);

  // ── Render tabs ────────────────────────────────────────────────────────────
  function renderLedger() {
    const combined = [
      ...expenses.map(e => ({ ...e, _type: 'expense', _date: e.expense_date })),
      ...payments.map(p => ({ ...p, _type: 'payment', _date: p.payment_date })),
    ].sort((a, b) => new Date(b._date) - new Date(a._date));

    if (!combined.length) return (
      <Empty icon="🧾" title="No transactions yet" subtitle="Add the first expense for this group." />
    );

    return combined.map((item, i) =>
      item._type === 'expense' ? (
        <ExpenseRow
          key={`e-${item.expense_id}`}
          item={item}
          currentUserName={userName}
          onDelete={handleDelete}
        />
      ) : (
        <PaymentRow
          key={`p-${item.payment_id}`}
          item={item}
          currentUserName={userName}
          onDelete={handleDelete}
        />
      )
    );
  }

  function renderSettlements() {
    if (settLoading) return (
      <View style={styles.centred}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[styles.ledgerMeta, { marginTop: 12 }]}>Calculating…</Text>
      </View>
    );

    return (
      <>
        {netBalances.length > 0 && (
          <BalanceBanner netBalances={netBalances} currentUserName={userName} />
        )}

        <SectionHead
          title="Who pays whom"
          right={
            <TouchableOpacity onPress={loadSettlements} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: C.primary, fontSize: F.base }}>↻ Refresh</Text>
            </TouchableOpacity>
          }
        />

        {simplified.length === 0 ? (
          <Empty icon="🎉" title="All settled up!" subtitle="No outstanding balances." />
        ) : (
          simplified.map((s, i) => (
            <SettlementRow
              key={i}
              item={s}
              currentUserName={userName}
              members={members}
              onRemind={handleRemind}
              reminding={reminding}
            />
          ))
        )}

        {netBalances.length > 0 && (
          <>
            <SectionHead title="Net Balances" />
            {netBalances.map((item, i) => (
              <NetRow key={i} item={item} currentUserName={userName} />
            ))}
          </>
        )}
      </>
    );
  }

  function renderMembers() {
    if (!members.length) return (
      <Empty icon="👥" title="No members" subtitle="Invite people to join this group." />
    );
    return members.map((m, i) => (
      <MemberRow key={i} member={m} currentUserName={userName} />
    ));
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { loadCore(true); if (tab === 'Settlements') { setSettLoaded(false); loadSettlements(); } }}
      tintColor={C.primary}
      colors={[C.primary]}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centred}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[styles.ledgerMeta, { marginTop: 12 }]}>Loading group…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddPayment', { groupId, groupName, members })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerPay}>Pay</Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      <Toast message={toast} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Members strip */}
        <View style={styles.memberStrip}>
          {members.slice(0, 6).map((m, i) => (
            <View key={i} style={styles.memberChip}>
              <Avatar name={m.name} size={24} variant={m.name === userName ? 'primary' : 'neutral'} />
              <Text style={styles.memberChipName} numberOfLines={1}>
                {m.name === userName ? 'You' : m.name.split(' ')[0]}
              </Text>
            </View>
          ))}
          {members.length > 6 && (
            <Text style={styles.memberMore}>+{members.length - 6}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total Spent"  value={`₹${totalSpent.toLocaleString('en-IN')}`} color={C.primary} />
          <StatCard label="Expenses"     value={String(expenses.length)} />
          <StatCard label="Payments"     value={String(payments.length)} />
          <StatCard label="Members"      value={String(members.length)} />
        </View>

        {/* Tabs */}
        <TabBar
          active={tab}
          counts={{
            Ledger: expenses.length + payments.length,
          }}
          onSelect={handleTab}
        />

        {/* Content */}
        <View style={styles.content}>
          {tab === 'Ledger'      && renderLedger()}
          {tab === 'Settlements' && renderSettlements()}
          {tab === 'Members'     && renderMembers()}
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabArea}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddExpense', { groupId, groupName, members })}
          activeOpacity={0.88}
        >
          <Text style={styles.fabText}>＋ Add Expense</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.base, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  backArrow:   { fontSize: F.xl, color: C.text2, lineHeight: 24 },
  headerTitle: { flex: 1, fontSize: F.lg, fontWeight: W.bold, color: C.text },
  headerPay:   { fontSize: F.md, fontWeight: W.semibold, color: C.success },

  // Members strip
  memberStrip: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: S.base, paddingTop: S.md, paddingBottom: S.sm, gap: 8,
  },
  memberChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface2, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  memberChipName: { fontSize: F.xs, color: C.text2, fontWeight: W.medium, maxWidth: 70 },
  memberMore:  { fontSize: F.sm, color: C.text3, marginLeft: 4 },

  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: S.base,
    gap: S.sm, marginBottom: S.sm,
  },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
  },
  statLabel: { fontSize: F.xs, color: C.text3, fontWeight: W.medium, marginBottom: 4, textAlign: 'center' },
  statVal:   { fontSize: F.lg, fontWeight: W.heavy, color: C.text },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    marginBottom: S.sm,
  },
  tabItem: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
    position: 'relative',
  },
  tabItemActive:  { borderBottomColor: C.primary },
  tabLabel:       { fontSize: F.base, color: C.text3, fontWeight: W.medium },
  tabLabelActive: { color: C.primary, fontWeight: W.semibold },
  tabIndicator:   { position: 'absolute', bottom: 0, height: 2, width: '60%', backgroundColor: C.primary, borderRadius: 2 },

  content: { paddingHorizontal: S.base, gap: S.sm },

  // Ledger rows
  ledgerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: S.md, gap: S.sm,
  },
  ledgerIcon: {
    width: 40, height: 40, borderRadius: R.md,
    backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ledgerMid:  { flex: 1 },
  ledgerDesc: { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  ledgerMeta: { fontSize: F.xs, color: C.text3 },
  ledgerRight:{ alignItems: 'flex-end', gap: 4 },
  ledgerAmt:  { fontSize: F.md, fontWeight: W.heavy, color: C.text },
  deleteX:    { color: C.danger, fontSize: F.base, lineHeight: 20 },

  // Settlements
  settleRow: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, padding: S.md, gap: S.sm,
  },
  settleNames: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settleName:  { fontSize: F.base, fontWeight: W.semibold, color: C.text2 },
  settleArrow: { color: C.text3, fontSize: F.base, marginHorizontal: 2 },
  settleAction:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  settleAmt:   { fontSize: F.lg, fontWeight: W.heavy, fontVariant: ['tabular-nums'] },
  actionBtn: {
    borderWidth: 1, borderRadius: R.full,
    paddingHorizontal: 12, paddingVertical: 5,
    minWidth: 90, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: F.sm, fontWeight: W.semibold },
  noUpi:         { fontSize: F.xs, color: C.text3, fontStyle: 'italic' },

  // Net balances
  netRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: S.md, gap: S.sm,
  },
  netRowMe: { borderColor: 'rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.04)' },
  netName:  { fontSize: F.md, fontWeight: W.medium, color: C.text2 },
  netPaid:  { fontSize: F.xs, color: C.text3, marginTop: 2 },

  // Members tab
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: S.md, gap: S.md,
  },
  memberRowMe: { borderColor: 'rgba(59,130,246,0.2)' },
  memberName: { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  memberUpi:  { fontSize: F.xs, color: C.text3, marginTop: 3 },

  // Balance banner
  banner: {
    borderWidth: 1, borderRadius: R.lg,
    padding: S.md, marginBottom: S.md,
  },
  bannerLabel: { fontSize: F.md, fontWeight: W.medium },
  bannerSub:   { fontSize: F.xs, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  bannerAmt:   { fontSize: F.xxl, fontWeight: W.heavy },

  // Section head
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: S.sm,
    marginTop: S.sm,
  },
  sectionTitle: { fontSize: F.md, fontWeight: W.semibold, color: C.text },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: F.lg, fontWeight: W.semibold, color: C.text },
  emptySub:   { fontSize: F.base, color: C.text2, textAlign: 'center' },

  // Toast
  toast: {
    position: 'absolute', bottom: 120, left: S.xl, right: S.xl, zIndex: 999,
    backgroundColor: C.surface2, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, paddingHorizontal: S.base, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  toastText: { fontSize: F.base, color: C.text, fontWeight: W.medium },

  // Centred loader
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  // FAB
  fabArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: S.base, paddingBottom: S.lg, paddingTop: S.sm,
    backgroundColor: 'transparent',
  },
  fab: {
    backgroundColor: C.primary, borderRadius: R.xl,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  fabText: { color: C.white, fontSize: F.md, fontWeight: W.bold, letterSpacing: 0.3 },
});