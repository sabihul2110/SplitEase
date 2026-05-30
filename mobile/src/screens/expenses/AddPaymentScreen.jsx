// SplitEase/mobile/src/screens/expenses/AddPaymentScreen.jsx
//
// Rebuilt for Option E settlement architecture:
//   - Shows unpaid splits from payer → payee
//   - User selects which expenses this payment covers
//   - Amount auto-fills from selections, or can be overridden (partial)
//   - Submits allocations alongside payment

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../constants/icons';

const C = {
  bg:        '#0a0d14',
  surface:   '#111520',
  surface2:  '#171c2c',
  surface3:  '#1e2438',
  border:    '#242a3d',
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
};
const R = { sm: 8, md: 10, lg: 14, xl: 18, full: 999 };
const F = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20 };
const W = { medium: '500', semibold: '600', bold: '700', heavy: '800' };

const AVATAR_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6'];
function avatarColor(name = '') {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MemberAvatar({ name, size = 38 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: avatarColor(name),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: W.bold, color: '#fff' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export default function AddPaymentScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName, members = [] } = route.params;

  // The current user is always the payer (they are settling up)
  const me = members.find(m => m.user_id === user.user_id) || { user_id: user.user_id, name: user.name || user.email };

  const [payeeId,        setPayeeId]        = useState(null);
  const [pendingSplits,  setPendingSplits]  = useState([]);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [netOwed,        setNetOwed]        = useState(0);
  const [amount,         setAmount]         = useState('');
  const [amountOverride, setAmountOverride] = useState(false);
  const [note,           setNote]           = useState('');
  const [paymentDate,    setPaymentDate]    = useState(new Date().toISOString().split('T')[0]);
  const [loading,        setLoading]        = useState(false);
  const [splitsLoading,  setSplitsLoading]  = useState(false);
  const [showCal,        setShowCal]        = useState(false);
  const [calMonth,       setCalMonth]       = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });

  const otherMembers = members.filter(m => m.user_id !== user.user_id);

  useEffect(() => {
    if (!payeeId) return;
    loadPendingSplits();
  }, [payeeId]);

  async function loadPendingSplits() {
    setSplitsLoading(true);
    try {
      // Fetch both pending splits AND net balances in parallel
      const [splitsRes, settlementsRes] = await Promise.all([
        client.get(`/payments/pending-splits/${groupId}?debtor_id=${user.user_id}&creditor_id=${payeeId}`),
        client.get(`/settlements/${groupId}`),
      ]);

      const splits = splitsRes.data || [];
      setPendingSplits(splits);
      setSelectedIds(new Set(splits.map(s => s.expense_id)));

      // Compute net owed from me to this payee
      const balances = settlementsRes.data || [];
      const myRow    = balances.find(b => b.user_id === user.user_id);
      const theirRow = balances.find(b => b.user_id === payeeId);

      // Net I owe = what they are owed minus what I am owed
      // Simpler: use simplified debts logic — find the transaction me → payeeId
      // We re-derive it: if my net_balance < 0 and their net_balance > 0, I owe them
      const myNet    = myRow    ? parseFloat(myRow.net_balance)    : 0;
      const theirNet = theirRow ? parseFloat(theirRow.net_balance) : 0;

      // Actual amount I owe this specific person (not group-wide net)
      // Fetch from simplified endpoint for accuracy
      const simpRes  = await client.get(`/settlements/${groupId}/simplified`);
      const simpList = simpRes.data || [];
      const myDebt   = simpList.find(
        t => t.from_user_id === user.user_id && t.to_user_id === payeeId
      );
      const suggested = myDebt ? myDebt.amount : 0;

      setNetOwed(suggested);
      setAmount(suggested > 0 ? suggested.toFixed(2) : '');
      setAmountOverride(false);
    } catch {
      Alert.alert('Error', 'Could not load pending expenses.');
    } finally {
      setSplitsLoading(false);
    }
  }

  function toggleSplit(expenseId, remaining) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(expenseId)) next.delete(expenseId);
      else next.add(expenseId);
      // Recalculate amount unless user has manually overridden
      if (!amountOverride) {
        const total = pendingSplits
          .filter(s => next.has(s.expense_id))
          .reduce((sum, s) => sum + s.remaining, 0);
        setAmount(total > 0 ? total.toFixed(2) : '');
      }
      return next;
    });
  }

  function selectAll() {
    const all = new Set(pendingSplits.map(s => s.expense_id));
    setSelectedIds(all);
    if (!amountOverride) {
      const total = pendingSplits.reduce((sum, s) => sum + s.remaining, 0);
      setAmount(total > 0 ? total.toFixed(2) : '');
    }
  }

  function deselectAll() {
    setSelectedIds(new Set());
    if (!amountOverride) setAmount('');
  }

  async function handleSubmit() {
    if (!payeeId) return Alert.alert('Select payee', 'Choose who you are paying.');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert('Invalid amount', 'Enter a valid payment amount.');
    if (selectedIds.size === 0) return Alert.alert('Select expenses', 'Select at least one expense to settle.');

    // Build allocations — distribute amount across selected splits proportionally
    // if amount < sum of selected, otherwise 1:1
    const selectedSplits = pendingSplits.filter(s => selectedIds.has(s.expense_id));
    const selectedTotal  = selectedSplits.reduce((sum, s) => sum + s.remaining, 0);
    let allocations;

    if (amt >= selectedTotal - 0.005) {
      // Full payment: allocate each split exactly
      allocations = selectedSplits.map(s => ({
        expense_id:    s.expense_id,
        allocated_amt: s.remaining,
      }));
    } else {
      // Partial payment: distribute proportionally
      allocations = selectedSplits.map(s => ({
        expense_id:    s.expense_id,
        allocated_amt: parseFloat(((s.remaining / selectedTotal) * amt).toFixed(2)),
      }));
    }

    setLoading(true);
    try {
      await client.post(`/payments/${groupId}`, {
        payer_id:     user.user_id,
        payee_id:     payeeId,
        amount:       amt,
        note:         note.trim() || null,
        payment_date: paymentDate,
        allocations,
      });
      navigation.navigate('GroupDetail', {
        groupId, groupName, refreshStamp: Date.now(),
      });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  }

  const selectedTotal = pendingSplits
    .filter(s => selectedIds.has(s.expense_id))
    .reduce((sum, s) => sum + s.remaining, 0);

  const amt = parseFloat(amount) || 0;
  const isPartial = amt < selectedTotal - 0.005 && amt > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icons.close size={22} color={C.text2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Record Payment</Text>
        <Text style={s.headerSub}>{groupName}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>

        {/* From → To */}
        <View style={s.card}>
          <Text style={s.label}>FROM</Text>
          <View style={s.partyRow}>
            <MemberAvatar name={me.name} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={s.partyName}>{me.name}</Text>
              <Text style={s.partySub}>paying</Text>
            </View>
            <Icons.chevronRight size={16} color={C.text3} />
          </View>

          <Text style={[s.label, { marginTop: 14 }]}>TO</Text>
          <View style={s.chips}>
            {otherMembers.map(m => (
              <TouchableOpacity
                key={m.user_id}
                style={[s.memberChip, payeeId === m.user_id && s.memberChipActive]}
                onPress={() => { setPayeeId(m.user_id); setPendingSplits([]); setSelectedIds(new Set()); setAmount(''); }}
              >
                <MemberAvatar name={m.name} size={28} />
                <Text style={[s.chipText, payeeId === m.user_id && s.chipTextActive]}>
                  {m.name.split(' ')[0]}
                </Text>
                {payeeId === m.user_id && <Icons.check size={12} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending expenses to settle */}
        {payeeId && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={s.cardTitle}>Select expenses to settle</Text>
              {pendingSplits.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={selectAll}>
                    <Text style={{ fontSize: F.xs, color: C.primary, fontWeight: W.semibold }}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deselectAll}>
                    <Text style={{ fontSize: F.xs, color: C.text3, fontWeight: W.semibold }}>None</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {splitsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.text3, fontSize: F.sm, marginTop: 8 }}>Loading pending expenses…</Text>
              </View>
            ) : pendingSplits.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Icons.checkCircle size={28} color={C.success} />
                <Text style={{ color: C.success, fontSize: F.md, fontWeight: W.semibold, marginTop: 8 }}>All settled up!</Text>
                <Text style={{ color: C.text3, fontSize: F.sm, marginTop: 4 }}>No pending expenses with this person.</Text>
              </View>
            ) : (
              pendingSplits.map(split => {
                const isSelected = selectedIds.has(split.expense_id);
                return (
                  <TouchableOpacity
                    key={split.expense_id}
                    style={[s.splitRow, isSelected && s.splitRowActive]}
                    onPress={() => toggleSplit(split.expense_id, split.remaining)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.checkbox, isSelected && s.checkboxOn]}>
                      {isSelected && <Icons.check size={10} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.splitDesc} numberOfLines={1}>{split.description}</Text>
                      <Text style={s.splitDate}>{fmtDate(split.expense_date)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.splitAmt, isSelected && { color: C.primary }]}>
                        ₹{split.remaining.toLocaleString('en-IN')}
                      </Text>
                      {split.already_paid > 0 && (
                        <Text style={s.splitPartial}>
                          ₹{split.already_paid.toFixed(2)} already paid
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {netOwed > 0 && (
              <View style={s.netBanner}>
                <View>
                  <Text style={s.netBannerLabel}>Net you owe</Text>
                  <Text style={s.netBannerAmt}>₹{netOwed.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={s.netBannerNote}>
                  After offsetting what they owe you
                </Text>
              </View>
            )}
            {pendingSplits.length > 0 && (
              <View style={s.splitSummaryRow}>
                <Text style={s.splitSummaryLabel}>Gross expense splits</Text>
                <Text style={s.splitSummaryAmt}>
                  ₹{pendingSplits.reduce((sum, sp) => sum + sp.remaining, 0).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Amount */}
        {payeeId && selectedIds.size > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Payment Amount</Text>
            {isPartial && (
              <View style={s.partialBanner}>
                <Icons.info size={14} color={C.warning} />
                <Text style={s.partialBannerText}>
                  Partial payment — ₹{(selectedTotal - amt).toFixed(2)} will remain unpaid
                </Text>
              </View>
            )}
            <View style={s.amountRow}>
              <Text style={s.amtSymbol}>₹</Text>
              <TextInput
                style={s.amtInput}
                value={amount}
                onChangeText={v => { setAmount(v); setAmountOverride(true); }}
                placeholder="0.00"
                placeholderTextColor={C.text3}
                keyboardType="decimal-pad"
              />
              {amountOverride && (
                <TouchableOpacity
                  onPress={() => {
                    setAmount(netOwed > 0 ? netOwed.toFixed(2) : '');
                    setAmountOverride(false);
                  }}
                  style={s.resetAmtBtn}
                >
                  <Icons.refresh size={13} color={C.primary} />
                  <Text style={{ fontSize: F.xs, color: C.primary }}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Date picker */}
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => {
                const d = new Date(paymentDate);
                setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
                setShowCal(true);
              }}
            >
              <Icons.calendarDays size={15} color={C.text2} />
              <Text style={s.dateBtnText}>
                {new Date(paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {/* Note */}
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note (optional)"
              placeholderTextColor={C.text3}
              multiline
            />
          </View>
        )}

        {/* Submit */}
        {payeeId && selectedIds.size > 0 && (
          <TouchableOpacity
            style={[s.submitBtn, (loading || !amount) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={loading || !amount}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Icons.sendMoney size={16} color="#fff" />
                  <Text style={s.submitBtnText}>Record Payment →</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Calendar modal */}
      <Modal visible={showCal} transparent animationType="fade" onRequestClose={() => setShowCal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.calModal}>
            <View style={s.calMonthRow}>
              <TouchableOpacity onPress={() => setCalMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>
                <Icons.chevronLeft size={20} color={C.text2} />
              </TouchableOpacity>
              <Text style={s.calMonthLabel}>
                {new Date(calMonth.year, calMonth.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => { const next = new Date(calMonth.year, calMonth.month + 1); if (next <= new Date()) setCalMonth({ year: next.getFullYear(), month: next.getMonth() }); }}>
                <Icons.chevronRight size={20} color={C.text2} />
              </TouchableOpacity>
            </View>
            <View style={s.calDowRow}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={s.calDow}>{d}</Text>
              ))}
            </View>
            {(() => {
              const { year, month } = calMonth;
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const selected = new Date(paymentDate);
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              return weeks.map((week, wi) => (
                <View key={wi} style={s.calWeekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={s.calDayCell} />;
                    const thisDate = new Date(year, month, day);
                    const isFuture = thisDate > today;
                    const isSel = selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
                    return (
                      <TouchableOpacity
                        key={di}
                        style={[s.calDayCell, isSel && s.calDaySel, isFuture && { opacity: 0.3 }]}
                        onPress={() => {
                          if (isFuture) return;
                          setPaymentDate(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
                          setShowCal(false);
                        }}
                        disabled={isFuture}
                      >
                        <Text style={[s.calDayText, isSel && s.calDayTextSel]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: '#242a3d', gap: 12 },
  headerTitle: { flex: 1, fontSize: F.lg, fontWeight: W.bold, color: C.text },
  headerSub:   { fontSize: F.sm, color: C.text3 },
  card:        { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: '#242a3d', padding: 16, gap: 8 },
  cardTitle:   { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  label:       { fontSize: F.xs, fontWeight: W.semibold, color: C.text3, letterSpacing: 0.8 },
  partyRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyName:   { fontSize: F.md, fontWeight: W.bold, color: C.text },
  partySub:    { fontSize: F.xs, color: C.text3, marginTop: 2 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.surface2, borderRadius: 999, borderWidth: 1, borderColor: '#242a3d', paddingHorizontal: 10, paddingVertical: 7 },
  memberChipActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)' },
  chipText:    { fontSize: F.sm, color: C.text2, fontWeight: W.medium },
  chipTextActive: { color: '#3b82f6', fontWeight: W.semibold },
  splitRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface2, borderRadius: 12, borderWidth: 1, borderColor: '#242a3d', padding: 12, marginBottom: 6 },
  splitRowActive: { borderColor: 'rgba(59,130,246,0.4)', backgroundColor: 'rgba(59,130,246,0.06)' },
  checkbox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#4a5578', alignItems: 'center', justifyContent: 'center' },
  checkboxOn:  { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  splitDesc:   { fontSize: F.md, fontWeight: W.semibold, color: C.text },
  splitDate:   { fontSize: F.xs, color: C.text3, marginTop: 2 },
  splitAmt:    { fontSize: F.md, fontWeight: W.heavy, color: C.text },
  splitPartial:{ fontSize: F.xs, color: C.warning, marginTop: 2 },
  splitSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#242a3d', paddingTop: 10, marginTop: 4 },
  splitSummaryLabel: { fontSize: F.sm, color: C.text2 },
  splitSummaryAmt:   { fontSize: F.lg, fontWeight: W.heavy, color: C.text },
  partialBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', padding: 10 },
  partialBannerText: { flex: 1, fontSize: F.xs, color: C.warning },
  amountRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#242a3d', borderRadius: 12, paddingHorizontal: 14, backgroundColor: C.surface2 },
  amtSymbol:   { fontSize: 22, color: C.text3 },
  amtInput:    { flex: 1, fontSize: 28, fontWeight: W.heavy, color: C.text, paddingVertical: 12 },
  resetAmtBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: C.primaryLo, borderRadius: 8 },
  dateBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: 12, borderWidth: 1, borderColor: '#242a3d', paddingHorizontal: 14, paddingVertical: 12 },
  dateBtnText: { fontSize: F.md, color: C.text, fontWeight: W.medium },
  noteInput:   { backgroundColor: C.surface2, borderRadius: 12, borderWidth: 1, borderColor: '#242a3d', paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: F.md, minHeight: 60 },
  submitBtn:   { backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontSize: F.md, fontWeight: W.bold },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  calModal:    { backgroundColor: '#111520', borderRadius: 18, borderWidth: 1, borderColor: '#242a3d', padding: 20, width: '100%' },
  calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calMonthLabel: { fontSize: F.md, fontWeight: W.bold, color: C.text },
  calDowRow:   { flexDirection: 'row', marginBottom: 6 },
  calDow:      { flex: 1, textAlign: 'center', fontSize: F.xs, fontWeight: W.semibold, color: C.text3, paddingVertical: 4 },
  calWeekRow:  { flexDirection: 'row' },
  calDayCell:  { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: 1 },
  calDaySel:   { backgroundColor: '#3b82f6' },
  calDayText:  { fontSize: F.base, color: C.text2, fontWeight: W.medium },
  calDayTextSel: { color: '#fff', fontWeight: W.bold },
  netBanner: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  netBannerLabel: { fontSize: F.xs, color: C.text3, marginBottom: 2 },
  netBannerAmt:   { fontSize: F.xl, fontWeight: W.heavy, color: C.danger },
  netBannerNote:  { fontSize: F.xs, color: C.text3, maxWidth: 140, textAlign: 'right' },
});