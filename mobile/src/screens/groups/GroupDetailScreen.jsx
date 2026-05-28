// SplitEase/mobile/src/screens/groups/GroupDetailScreen.jsx
//
// Full redesign:
//   • Double tab indicator fixed (removed redundant tabIndicator View)
//   • All emojis replaced with SVG icons from icons.jsx
//   • Modern card layout, refined typography, professional aesthetic
//   • Expense icon uses CATEGORY_ICONS SVGs not emoji text

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  RefreshControl, ScrollView, Linking, ActivityIndicator, Platform, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Icons, CATEGORY_ICONS } from '../../constants/icons';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0d14',
  surface:   '#111520',
  surface2:  '#171c2c',
  surface3:  '#1e2438',
  border:    '#242a3d',
  border2:   '#2e3650',
  primary:   '#3b82f6',
  primaryLo: 'rgba(59,130,246,0.10)',
  success:   '#10b981',
  successLo: 'rgba(16,185,129,0.10)',
  danger:    '#ef4444',
  dangerLo:  'rgba(239,68,68,0.10)',
  warning:   '#f59e0b',
  warningLo: 'rgba(245,158,11,0.10)',
  text:      '#f0f4ff',
  text2:     '#8892b0',
  text3:     '#4a5578',
  white:     '#ffffff',
};
const F = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 28 };
const W = { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' };
const R = { sm: 8, md: 10, lg: 14, xl: 18, xxl: 22, full: 999 };
const SP = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b',
  '#ec4899','#8b5cf6','#06b6d4','#f97316',
];
function avatarColor(name = '') {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, variant = 'auto' }) {
  const bg = variant === 'auto'
    ? avatarColor(name)
    : variant === 'success' ? C.success
    : variant === 'danger'  ? C.danger
    : variant === 'primary' ? C.primary
    : C.surface3;

  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg + (variant === 'auto' ? '' : '28'),
      borderWidth: variant === 'auto' ? 0 : 1,
      borderColor: bg + '55',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Text style={{
        fontSize: size * 0.36, fontWeight: W.bold,
        color: variant === 'auto' ? '#fff' : bg,
      }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, variant = 'neutral' }) {
  const map = {
    neutral: { bg: C.surface3,   color: C.text2   },
    success: { bg: C.successLo,  color: C.success  },
    danger:  { bg: C.dangerLo,   color: C.danger   },
    primary: { bg: C.primaryLo,  color: C.primary  },
    warning: { bg: C.warningLo,  color: C.warning  },
  };
  const v = map[variant] || map.neutral;
  return (
    <View style={{ backgroundColor: v.bg, borderRadius: R.full, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: F.xs, fontWeight: W.semibold, color: v.color }}>{label}</Text>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <Icons.check size={14} color={C.success} />
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

// ─── Section head ─────────────────────────────────────────────────────────────
function SectionHead({ title, right }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ─── Category icon for expense rows ──────────────────────────────────────────
function CategoryIcon({ categoryName, size = 40 }) {
  const cfg = CATEGORY_ICONS[categoryName];
  const color = cfg?.color || C.text3;
  const IconComp = cfg?.Icon || Icons.receipt;
  return (
    <View style={[styles.ledgerIcon, { backgroundColor: color + '18' }]}>
      <IconComp size={20} color={color} />
    </View>
  );
}

// ─── Expense row ──────────────────────────────────────────────────────────────
function ExpenseRow({ item, currentUserName, onDelete, onEdit }) {
  const isPayer = item.payer_name === currentUserName;
  return (
    <View style={styles.ledgerRow}>
      <CategoryIcon categoryName={item.category_name} />
      <View style={styles.ledgerMid}>
        <Text style={styles.ledgerDesc} numberOfLines={1}>{item.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          <Text style={styles.ledgerMeta}>
            {isPayer ? 'You paid' : `${item.payer_name} paid`} · {fmtDate(item.expense_date)}
          </Text>
          <Badge label={item.split_type || 'equal'} variant={item.split_type === 'equal' ? 'success' : 'primary'} />
        </View>
      </View>
      <View style={styles.ledgerRight}>
        <Text style={styles.ledgerAmt}>₹{fmtAmount(item.total_amount)}</Text>
        {isPayer && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => onEdit(item)}
            >
              <Icons.edit size={14} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => Alert.alert('Delete Expense', 'Remove this expense?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete('expense', item.expense_id) },
              ])}
            >
              <Icons.trash size={14} color={C.danger} />
            </TouchableOpacity>
          </View>
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
        <Icons.settlement size={20} color={C.success} />
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
            <Icons.trash size={14} color={C.danger} />
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

  const toMember = members.find(m => m.name === item.to);
  const upiLink  = toMember?.upi_id
    ? `upi://pay?pa=${toMember.upi_id}&am=${item.amount}&cu=INR&tn=SplitEase`
    : null;

  const cardBorder = isDebtor ? C.danger + '28' : isCreditor ? C.success + '22' : C.border;
  const cardBg     = isDebtor ? 'rgba(239,68,68,0.04)' : isCreditor ? 'rgba(16,185,129,0.04)' : 'transparent';

  return (
    <View style={[styles.settleCard, { borderColor: cardBorder, backgroundColor: cardBg }]}>

      {/* ── Who → Who row ── */}
      <View style={styles.settleFlow}>
        {/* From */}
        <View style={styles.settleParty}>
          <Avatar name={item.from} size={38} variant={isDebtor ? 'danger' : 'auto'} />
          <Text style={[styles.settlePartyName, isDebtor && { color: C.text, fontWeight: W.bold }]} numberOfLines={1}>
            {isDebtor ? 'You' : item.from.split(' ')[0]}
          </Text>
          <Text style={[styles.settlePartyRole, { color: isDebtor ? C.danger : C.text3 }]}>pays</Text>
        </View>

        {/* Directional arrow — always left-to-right (from=debtor, to=creditor) */}
        <View style={styles.settleArrow}>
          <View style={styles.settleArrowLine} />
          <Icons.chevronRight size={14} color={C.text3} />
        </View>

        {/* To */}
        <View style={[styles.settleParty, { alignItems: 'flex-end' }]}>
          <Avatar name={item.to} size={38} variant={isCreditor ? 'success' : 'auto'} />
          <Text style={[styles.settlePartyName, isCreditor && { color: C.text, fontWeight: W.bold }]} numberOfLines={1}>
            {isCreditor ? 'You' : item.to.split(' ')[0]}
          </Text>
          <Text style={[styles.settlePartyRole, { color: isCreditor ? C.success : C.text3 }]}>receives</Text>
        </View>
      </View>

      {/* ── Amount + Action ── */}
      <View style={styles.settleFooter}>
        <Text style={[styles.settleAmt, {
          color: isDebtor ? C.danger : isCreditor ? C.success : C.text2
        }]}>
          {isDebtor ? '−' : isCreditor ? '+' : ''}₹{fmtAmount(item.amount)}
        </Text>

        {isDebtor && upiLink && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.primaryLo, borderColor: C.primary + '40' }]}
            onPress={() => Linking.openURL(upiLink).catch(() => Alert.alert('UPI app not found'))}
          >
            <Icons.upi size={13} color={C.primary} />
            <Text style={[styles.actionBtnText, { color: C.primary }]}>Pay via UPI</Text>
          </TouchableOpacity>
        )}
        {isDebtor && !upiLink && (
          <Text style={styles.noUpi}>No UPI set</Text>
        )}
        {isCreditor && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.warningLo, borderColor: C.warning + '40' }]}
            onPress={() => {
              const fromMember = members.find(m => m.name === item.from);
              onRemind({ ...item, from_user_id: fromMember?.user_id });
            }}
            disabled={reminding === item.from}
          >
            {reminding === item.from
              ? <ActivityIndicator size="small" color={C.warning} />
              : <><Icons.bell size={13} color={C.warning} /><Text style={[styles.actionBtnText, { color: C.warning }]}>Remind</Text></>
            }
          </TouchableOpacity>
        )}
        {!isDebtor && !isCreditor && (
          <Text style={styles.noUpi}>No action needed</Text>
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
      <Avatar name={item.user_name} size={34} />
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
      <Avatar name={member.name} size={42} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={styles.memberName}>{member.name}</Text>
          {isMe && <Badge label="you" variant="primary" />}
        </View>
        {member.upi_id ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Icons.upi size={11} color={C.text3} />
            <Text style={styles.memberUpi}>{member.upi_id}</Text>
          </View>
        ) : (
          <Text style={[styles.memberUpi, { fontStyle: 'italic' }]}>No UPI ID</Text>
        )}
      </View>
      {isMe && <Icons.check size={16} color={C.primary} />}
    </View>
  );
}

// ─── Tab bar — FIXED: single indicator only ───────────────────────────────────
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
            {/* Single indicator — NO borderBottomWidth on tabItem */}
            {isActive && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Balance banner ───────────────────────────────────────────────────────────
function BalanceBanner({ netBalances, currentUserName }) {
  const me = netBalances.find(s => s.user_name === currentUserName);
  if (!me) return null;
  const net = Number(me.net_balance);

  if (net === 0) return (
    <View style={[styles.banner, { borderColor: C.success + '30', backgroundColor: C.successLo }]}>
      <Icons.checkCircle size={18} color={C.success} />
      <Text style={[styles.bannerLabel, { color: C.success }]}>You're all settled up.</Text>
    </View>
  );

  const isOwed = net > 0;
  return (
    <View style={[styles.banner, {
      borderColor: (isOwed ? C.success : C.danger) + '30',
      backgroundColor: isOwed ? C.successLo : C.dangerLo,
    }]}>
      <View>
        <Text style={[styles.bannerSub, { color: C.text3 }]}>
          {isOwed ? 'You are owed' : 'You owe'}
        </Text>
        <Text style={[styles.bannerAmt, { color: isOwed ? C.success : C.danger }]}>
          {isOwed ? '+' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
        </Text>
      </View>
      {isOwed
        ? <Icons.income size={28} color={C.success} />
        : <Icons.lendMoney size={28} color={C.danger} />
      }
    </View>
  );
}

// ─── Empty state — SVG icon, no emoji ────────────────────────────────────────
function Empty({ icon: IconComp, iconColor = C.text3, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconBox, { backgroundColor: iconColor + '14', borderColor: iconColor + '25' }]}>
        <IconComp size={32} color={iconColor} />
      </View>
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

  const [tab,         setTab]         = useState('Ledger');
  const [expenses,    setExpenses]    = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [members,     setMembers]     = useState([]);
  const [simplified,  setSimplified]  = useState([]);
  const [netBalances, setNetBalances] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [settLoading, setSettLoading] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [settLoaded,  setSettLoaded]  = useState(false);
  const [reminding,   setReminding]   = useState('');
  const [toast,       setToast]       = useState('');
  const [inviting, setInviting] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const loadCore = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setSettLoaded(false);
      const [expRes, payRes, memRes] = await Promise.all([
        client.get(`/expenses/${groupId}`),
        client.get(`/payments/${groupId}`),
        client.get(`/groups/${groupId}/members`),
      ]);
      setExpenses(expRes.data  || []);
      setPayments(payRes.data  || []);
      setMembers(memRes.data   || []);
    } catch (err) {
      Alert.alert('Failed to load',
        err?.response?.data?.detail || err?.message || 'Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

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
    } catch {
      Alert.alert('Error', 'Could not load settlements.');
    } finally {
      setSettLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    loadCore(); // Always refetch the ledger

    if (tab === 'Settlements') {
      // If we are currently looking at settlements, fetch them immediately!
      loadSettlements();
    } else {
      // Otherwise, just mark it dirty so it fetches next time they click the tab
      setSettLoaded(false); 
    }
  }, [loadCore, loadSettlements, tab])); 

  // Listen for the refreshStamp from AddExpenseScreen
  React.useEffect(() => {
    if (route.params?.refreshStamp) {
      loadCore(); // Refetch ledger instantly
      
      if (tab === 'Settlements') {
        loadSettlements(); // Refetch settlements instantly if we are on that tab
      } else {
        setSettLoaded(false); // Otherwise, mark it dirty for the next tab click
      }
      
      // Clear the stamp so we don't loop
      navigation.setParams({ refreshStamp: undefined });
    }
  }, [route.params?.refreshStamp]);

  function handleTab(t) {
    setTab(t);
    if (t === 'Settlements' && !settLoaded) loadSettlements();
  }

  async function handleDelete(type, id) {
    try {
      if (type === 'expense') {
        await client.delete(`/expenses/${id}`);
        setExpenses(p => p.filter(e => e.expense_id !== id));
      } else {
        await client.delete(`/payments/${id}`);
        setPayments(p => p.filter(x => x.payment_id !== id));
      }
      showToast('Deleted');
    } catch { Alert.alert('Error', 'Failed to delete.'); }
  }

  async function handleRemind(s) {
    setReminding(s.from);
    try {
      await client.post(`/groups/${groupId}/remind`, { debtor_user_id: s.from_user_id, amount: s.amount });
      showToast(`Reminder sent to ${s.from}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(
        Array.isArray(detail)   ? detail[0]?.msg :
        typeof detail === 'string' ? detail        :
        'Failed to send reminder.'
      );
    } finally { setReminding(''); }
  }

  async function handleDeleteGroup(force = false) {
    try {
      await client.delete(`/groups/${groupId}${force ? '?force=true' : ''}`);
      navigation.goBack();
    } catch (err) {
      const s      = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (s === 409) {
        Alert.alert(
          'Unsettled Balances',
          `${detail}\n\nDelete anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete Anyway', style: 'destructive', onPress: () => handleDeleteGroup(true) },
          ]
        );
      } else if (s === 403) {
        Alert.alert('Not Allowed', detail || 'Only the group creator or admin can do this.');
      } else {
        Alert.alert('Error', detail || 'Failed to delete group.');
      }
    }
  }

  async function handleLeaveGroup() {
    try {
      await client.delete(`/groups/${groupId}/members/${user.user_id}`);
      navigation.goBack();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      Alert.alert('Cannot Leave', typeof detail === 'string' ? detail : 'Failed to leave group.');
    }
  }

  async function handleInvite() {
    setInviting(true);
    try {
      const { data } = await client.post(`/groups/${groupId}/invite`);
      const link = data.invite_url || `https://splitease.app/join/${data.token}`;
      await Share.share({
        message: `Join "${groupName}" on SplitEase:\n${link}`,
        title: 'Invite to Group',
      });
    } catch {
      Alert.alert('Error', 'Could not generate invite link.');
    } finally {
      setInviting(false);
    }
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.total_amount), 0);

  // ── Tab content ──────────────────────────────────────────────────────────
  function renderLedger() {
    const combined = [
      ...expenses.map(e => ({ ...e, _type: 'expense', _date: e.expense_date })),
      ...payments.map(p => ({ ...p, _type: 'payment', _date: p.payment_date })),
    ].sort((a, b) => new Date(b._date) - new Date(a._date));

    if (!combined.length) return (
      <Empty
        icon={Icons.receipt}
        iconColor={C.text3}
        title="No transactions yet"
        subtitle="Add the first expense for this group."
      />
    );
    return combined.map(item =>
      item._type === 'expense' ? (
        <ExpenseRow key={`e-${item.expense_id}`} item={item} currentUserName={userName} onDelete={handleDelete} onEdit={(exp) => navigation.navigate('AddExpense', { groupId, groupName, members, editExpense: exp })} />
      ) : (
        <PaymentRow key={`p-${item.payment_id}`} item={item} currentUserName={userName} onDelete={handleDelete} />
      )
    );
  }

  function renderSettlements() {
    if (settLoading) return (
      <View style={styles.centred}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={styles.centredText}>Calculating…</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icons.refresh size={13} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: F.sm, fontWeight: W.medium }}>Refresh</Text>
              </View>
            </TouchableOpacity>
          }
        />
        {simplified.length === 0 ? (
          <Empty
            icon={Icons.checkCircle}
            iconColor={C.success}
            title="All settled up!"
            subtitle="No outstanding balances in this group."
          />
        ) : (
          simplified.map((s, i) => (
            <SettlementRow
              key={i} item={s} currentUserName={userName}
              members={members} onRemind={handleRemind} reminding={reminding}
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
      <Empty
        icon={Icons.users}
        iconColor={C.text3}
        title="No members"
        subtitle="Invite people to join this group."
      />
    );

    return (
      <>
        {members.map((m, i) => (
          <MemberRow key={i} member={m} currentUserName={userName} />
        ))}
        <TouchableOpacity
          style={[styles.leaveBtn]}
          onPress={() =>
            Alert.alert('Leave Group', 'Are you sure you want to leave this group? You must have a zero balance.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: handleLeaveGroup },
            ])
          }
        >
          <Icons.trash size={15} color={C.danger} />
          <Text style={styles.leaveBtnText}>Leave Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteGroupBtn}
          onPress={() =>
            Alert.alert(
              'Delete Group',
              `Permanently delete "${groupName}" and all its data?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteGroup() },
              ]
            )
          }
        >
          <Icons.trash size={14} color={C.danger} />
          <Text style={styles.deleteGroupBtnText}>Delete Group</Text>
        </TouchableOpacity>
      </>
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        loadCore(true);
        if (tab === 'Settlements') { setSettLoaded(false); loadSettlements(); }
      }}
      tintColor={C.primary}
      colors={[C.primary]}
    />
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.back size={22} color={C.text2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centred}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.centredText}>Loading group…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icons.back size={22} color={C.text2} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
        
        <TouchableOpacity
          style={styles.headerInviteBtn}
          onPress={handleInvite}
          disabled={inviting}
          activeOpacity={0.7}
        >
          {inviting ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <>
              <Icons.userPlus size={14} color={C.primary} />
              <Text style={styles.headerInviteText}>Invite</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => navigation.navigate('AddPayment', { groupId, groupName, members })}
        >
          <Icons.settlements size={13} color={C.success} />
          <Text style={styles.payBtnText}>Pay</Text>
        </TouchableOpacity>
      </View>

      <Toast message={toast} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Member strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.memberStrip}
        >
          {members.map((m, i) => (
            <View key={i} style={styles.memberChip}>
              <Avatar name={m.name} size={24} />
              <Text style={styles.memberChipName} numberOfLines={1}>
                {m.name === userName ? 'You' : m.name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total Spent"  value={`₹${totalSpent.toLocaleString('en-IN')}`} color={C.primary} />
          <StatCard label="Expenses"     value={String(expenses.length)} />
          <StatCard label="Payments"     value={String(payments.length)} />
          <StatCard label="Members"      value={String(members.length)} />
        </View>

        {/* Tab bar */}
        <TabBar
          active={tab}
          counts={{ Ledger: expenses.length + payments.length }}
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
          <Icons.plus size={18} color="#fff" />
          <Text style={styles.fabText}>Add Expense</Text>
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
    paddingHorizontal: SP.base, paddingVertical: 13,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: F.lg, fontWeight: W.bold, color: C.text, letterSpacing: -0.2 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.successLo, borderRadius: R.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.success + '30',
  },
  payBtnText: { fontSize: F.sm, fontWeight: W.bold, color: C.success },

  // Member strip
  memberStrip: {
    paddingHorizontal: SP.base, paddingVertical: SP.md, gap: 8,
    flexDirection: 'row',
  },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface2, borderRadius: R.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  memberChipName: { fontSize: F.xs, color: C.text2, fontWeight: W.medium, maxWidth: 70 },

  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: SP.base,
    gap: SP.sm, marginBottom: SP.sm,
  },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: C.text3, fontWeight: W.medium, marginBottom: 4, textAlign: 'center' },
  statVal:   { fontSize: F.lg, fontWeight: W.heavy, color: C.text },

  // ── Tab bar — single indicator approach ──────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    marginBottom: SP.sm,
  },
  tabItem: {
    // NO borderBottomWidth here — that caused the double line
    flex: 1, paddingVertical: 13, alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {
    // Nothing — indicator View below handles it
  },
  tabLabel:       { fontSize: F.base, color: C.text3, fontWeight: W.medium },
  tabLabelActive: { color: C.primary, fontWeight: W.bold },
  // Single indicator — absolutely positioned at bottom
  tabIndicator: {
    position: 'absolute', bottom: 0,
    left: '20%', right: '20%',
    height: 2.5, backgroundColor: C.primary, borderRadius: 2,
  },

  content: { paddingHorizontal: SP.base, gap: SP.sm },

  // Ledger rows
  ledgerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    padding: SP.md, gap: SP.md,
  },
  ledgerIcon: {
    width: 42, height: 42, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ledgerMid:  { flex: 1, minWidth: 0 },
  ledgerDesc: { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  ledgerMeta: { fontSize: F.xs, color: C.text3 },
  ledgerRight:{ alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  ledgerAmt:  { fontSize: F.md, fontWeight: W.heavy, color: C.text },


  // ── Settlement card ──
  settleCard: {
    borderRadius: R.xl, borderWidth: 1,
    padding: SP.base, gap: SP.md,
  },
  settleFlow: {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
  },
  settleParty: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  settlePartyName: {
    fontSize: F.sm, fontWeight: W.semibold, color: C.text2,
    textAlign: 'center',
  },
  settlePartyRole: {
    fontSize: F.xs, fontWeight: W.medium,
  },
  settleArrow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 2,
  },
  settleArrowLine: {
    width: 18, height: 1.5,
    backgroundColor: C.text3, opacity: 0.4,
  },
  settleFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SP.sm,
    borderTopWidth: 1, borderTopColor: C.border,
  },

  settleAmt: { fontSize: F.lg, fontWeight: W.heavy },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: R.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  actionBtnText: { fontSize: F.sm, fontWeight: W.semibold },
  noUpi:         { fontSize: F.xs, color: C.text3, fontStyle: 'italic' },

  // Net balances
  netRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    padding: SP.md, gap: SP.md,
  },
  netRowMe: { borderColor: C.primary + '30', backgroundColor: C.primaryLo },
  netName:  { fontSize: F.md, fontWeight: W.medium, color: C.text2 },
  netPaid:  { fontSize: F.xs, color: C.text3, marginTop: 2 },

  // Members tab
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    padding: SP.md, gap: SP.md,
  },
  memberRowMe: { borderColor: C.primary + '25', backgroundColor: C.primaryLo },
  memberName: { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  memberUpi:  { fontSize: F.xs, color: C.text3, marginTop: 3 },

  // Balance banner
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: R.xl,
    padding: SP.base, marginBottom: SP.md, gap: SP.md,
  },
  bannerLabel: { fontSize: F.md, fontWeight: W.semibold },
  bannerSub:   { fontSize: F.xs, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  bannerAmt:   { fontSize: F.xxl, fontWeight: W.heavy, letterSpacing: -0.5 },

  // Section head
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SP.sm, marginTop: SP.sm,
  },
  sectionTitle: { fontSize: F.md, fontWeight: W.bold, color: C.text },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 22,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: F.lg, fontWeight: W.bold, color: C.text },
  emptySub:   { fontSize: F.base, color: C.text2, textAlign: 'center', lineHeight: 20 },

  // Toast
  toast: {
    position: 'absolute', bottom: 120, left: SP.xl, right: SP.xl, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface2, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 11, paddingHorizontal: SP.base,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  toastText: { fontSize: F.base, color: C.text, fontWeight: W.medium },

  // Centred loader
  centred:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  centredText: { fontSize: F.base, color: C.text3 },

  // FAB
  fabArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SP.base, paddingBottom: SP.lg, paddingTop: SP.sm,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.xl,
    paddingVertical: 15,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  fabText: { color: C.white, fontSize: F.md, fontWeight: W.bold, letterSpacing: 0.2 },

  iconBtn: {
    width: 34, height: 34, borderRadius: R.md,
    backgroundColor: C.primaryLo, borderWidth: 1, borderColor: C.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Header Invite Pill ───
  headerInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryLo,            
    borderWidth: 1,
    borderColor: C.primary + '40',                
    borderRadius: R.full,                    
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerInviteText: {
    fontSize: F.sm,                        
    fontWeight: W.bold,
    color: C.primary,
  },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: SP.lg, borderWidth: 1, borderColor: C.danger + '40',
    borderRadius: R.xl, paddingVertical: 14,
    backgroundColor: C.dangerLo,
  },
  leaveBtnText: { color: C.danger, fontSize: F.md, fontWeight: W.bold },

  deleteGroupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: SP.sm, borderWidth: 1, borderColor: C.danger + '18',
    borderRadius: R.xl, paddingVertical: 12,
    opacity: 0.6,
  },
  deleteGroupBtnText: { color: C.danger, fontSize: F.sm, fontWeight: W.medium },
});