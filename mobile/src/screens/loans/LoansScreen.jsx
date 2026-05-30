// mobile/src/screens/loans/LoansScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { EmptyState, LoadingState } from '../../components/common/ui';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { Icons } from '../../constants/icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function SumCard({ label, value, color, sub }) {
  return (
    <View style={styles.sumCard}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumVal, { color }]}>₹{fmt(value)}</Text>
      <Text style={styles.sumSub}>{sub}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeRepaid]}>
      <View style={[styles.badgeDot, { backgroundColor: isActive ? '#f59e0b' : '#10b981' }]} />
      <Text style={[styles.badgeText, { color: isActive ? '#f59e0b' : '#10b981' }]}>
        {isActive ? 'Active' : 'Settled'}
      </Text>
    </View>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function LoanCard({ item, isLent, onRefresh, idx }) {
  const [repayAmt, setRepayAmt] = useState('');
  const [repayErr, setRepayErr] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const accentColor = isLent ? '#f59e0b' : '#818cf8';
  const btnColor    = isLent ? COLORS.success : '#6366f1';
  const personLabel = isLent ? item.borrower_name : item.lender_name;
  const dateField   = isLent ? item.loan_date     : item.borrow_date;
  const idField     = isLent ? item.loan_id       : item.borrow_id;
  const repayEndpt  = isLent ? ENDPOINTS.loanRepay(idField)  : ENDPOINTS.borrowRepay(idField);
  const deleteEndpt = isLent ? ENDPOINTS.delLoan(idField)    : ENDPOINTS.delBorrow(idField);
  const dirLabel    = isLent ? 'Lent to'     : 'Borrowed from';
  const dateLbl     = isLent ? 'Lent on'     : 'Borrowed on';
  const amtLabel    = isLent ? 'Amount Lent' : 'Amount Borrowed';

  const pct = item.amount > 0
    ? Math.round(((item.amount - item.remaining_amount) / item.amount) * 100)
    : 100;

  const dateStr = dateField
    ? new Date(dateField + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  async function handleRepay() {
    setRepayErr('');
    const amt = parseFloat(repayAmt);
    if (isNaN(amt) || amt <= 0) { setRepayErr('Enter a valid amount'); return; }
    if (amt > item.remaining_amount) {
      setRepayErr(`Max ₹${item.remaining_amount.toLocaleString('en-IN')}`);
      return;
    }
    setSaving(true);
    try {
      await client.post(repayEndpt, { repayment_amount: amt });
      setRepayAmt('');
      onRefresh();
    } catch (ex) {
      setRepayErr(ex?.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try { await client.delete(deleteEndpt); onRefresh(); }
          catch { setDeleting(false); }
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View>
          <Text style={styles.cardDir}>{dirLabel}</Text>
          <Text style={styles.cardPerson}>{personLabel}</Text>
          <View style={{ marginTop: 6 }}>
            <StatusBadge status={item.status} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmtLabel}>{amtLabel}</Text>
          <Text style={[styles.cardAmt, { color: accentColor }]}>₹{fmt(item.amount)}</Text>
        </View>
      </View>

      {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}

      <View>
        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>
            {item.status === 'repaid' ? 'Fully settled' : `${pct}% recovered`}
          </Text>
          <Text style={[styles.progressRight, { color: item.status === 'repaid' ? COLORS.success : accentColor }]}>
            {item.status === 'repaid' ? 'Done' : `₹${item.remaining_amount.toLocaleString('en-IN')} left`}
          </Text>
        </View>
        <ProgressBar pct={pct} color={item.status === 'repaid' ? COLORS.success : accentColor} />
      </View>

      <Text style={styles.cardDate}>{dateLbl} {dateStr}</Text>

      {item.status === 'active' && (
        <View style={styles.repaySection}>
          <View style={styles.repayRow}>
            <TextInput
              style={styles.repayInput}
              value={repayAmt}
              onChangeText={v => { setRepayAmt(v); setRepayErr(''); }}
              placeholder={`Max ₹${item.remaining_amount.toLocaleString('en-IN')}`}
              placeholderTextColor={COLORS.text3}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.repayBtn, { backgroundColor: btnColor, opacity: (saving || !repayAmt) ? 0.5 : 1 }]}
              onPress={handleRepay}
              disabled={saving || !repayAmt}
            >
              <Text style={styles.repayBtnText}>{saving ? '…' : isLent ? 'Record' : 'Repay'}</Text>
            </TouchableOpacity>
          </View>
          {repayErr ? <Text style={styles.repayErr}>{repayErr}</Text> : null}
        </View>
      )}

      <View style={{ alignItems: 'flex-end' }}>
        <TouchableOpacity style={styles.delBtn} onPress={handleDelete} disabled={deleting}>
          <Text style={styles.delText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddLoanModal({ visible, onClose, isLent, onSuccess }) {
  const [personName, setPersonName] = useState('');
  const [amount,     setAmount]     = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [note,       setNote]       = useState('');
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      setPersonName(''); setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote(''); setError('');
    }
  }, [visible]);

  async function handleSubmit() {
    if (!personName.trim()) { setError(`${isLent ? 'Borrower' : 'Lender'} name is required`); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Enter a valid amount'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Use YYYY-MM-DD format'); return; }
    setSaving(true); setError('');
    try {
      if (isLent) {
        await client.post('/loans/', {
          borrower_name: personName.trim(),
          amount:        parseFloat(amount),
          loan_date:     date,
          note:          note.trim() || null,
        });
      } else {
        await client.post('/borrows/', {
          lender_name: personName.trim(),
          amount:      parseFloat(amount),
          borrow_date: date,
          note:        note.trim() || null,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        Array.isArray(detail)      ? detail[0]?.msg :
        typeof detail === 'string' ? detail          :
        'Failed to save'
      );
    } finally { setSaving(false); }
  }

  const accentColor   = isLent ? '#f59e0b' : '#818cf8';
  const personLabel   = isLent ? 'BORROWER NAME' : 'LENDER NAME';
  const personPHolder = isLent ? 'e.g. Rahul, Priya…' : 'e.g. Amit, Mom…';
  const submitLabel   = isLent ? 'Record Loan' : 'Record Borrow';
  const IconComp      = isLent ? Icons.sendMoney : Icons.receiveMoney;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={addStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={addStyles.sheet}>
          <View style={addStyles.handle} />

          {/* Header */}
          <View style={addStyles.header}>
            <View style={[addStyles.headerIcon, { backgroundColor: accentColor + '20' }]}>
              <IconComp size={18} color={accentColor} />
            </View>
            <Text style={addStyles.title}>{isLent ? 'Record a Loan' : 'Record a Borrow'}</Text>
            <TouchableOpacity style={addStyles.closeBtn} onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.back size={20} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={addStyles.scroll}
          >
            {!!error && (
              <View style={addStyles.errorBanner}>
                <Text style={addStyles.errorText}>{error}</Text>
              </View>
            )}

            {/* Person name */}
            <View style={addStyles.field}>
              <Text style={addStyles.label}>{personLabel}</Text>
              <View style={addStyles.inputRow}>
                <Icons.users size={15} color={COLORS.text3} />
                <TextInput
                  style={addStyles.inputText}
                  value={personName}
                  onChangeText={v => { setPersonName(v); setError(''); }}
                  placeholder={personPHolder}
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            {/* Amount */}
            <View style={addStyles.field}>
              <Text style={addStyles.label}>AMOUNT</Text>
              <View style={addStyles.amountWrap}>
                <Text style={[addStyles.currencySymbol, { color: accentColor }]}>₹</Text>
                <TextInput
                  style={[addStyles.amountInput, { color: accentColor }]}
                  value={amount}
                  onChangeText={v => { setAmount(v); setError(''); }}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Date */}
            <View style={addStyles.field}>
              <Text style={addStyles.label}>DATE</Text>
              <View style={addStyles.inputRow}>
                <Icons.activity size={15} color={COLORS.text3} />
                <TextInput
                  style={addStyles.inputText}
                  value={date}
                  onChangeText={v => { setDate(v); setError(''); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Note */}
            <View style={addStyles.field}>
              <Text style={addStyles.label}>
                NOTE{'  '}
                <Text style={{ color: COLORS.text3, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>
                  — optional
                </Text>
              </Text>
              <View style={[addStyles.inputRow, { alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[addStyles.inputText, { height: 64, textAlignVertical: 'top' }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Purpose, terms, context…"
                  placeholderTextColor={COLORS.text3}
                  multiline
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={addStyles.footer}>
            <TouchableOpacity style={addStyles.cancelBtn} onPress={onClose}>
              <Text style={addStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                addStyles.submitBtn,
                { backgroundColor: accentColor },
                (!personName.trim() || !amount || saving) && { opacity: 0.55 },
              ]}
              onPress={handleSubmit}
              disabled={!personName.trim() || !amount || saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Icons.plus size={15} color="#fff" /><Text style={addStyles.submitText}>{submitLabel}</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const addStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.border, maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: SPACING.lg },
  field:  { gap: SPACING.xs },
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  inputText:      { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: { fontSize: FONT_SIZE.xl, marginRight: SPACING.sm },
  amountInput:    { flex: 1, fontSize: 28, fontWeight: FONT_WEIGHT.extrabold, paddingVertical: 10 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: SPACING.md,
  },
  errorText:  { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  footer: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2 },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: RADIUS.lg,
  },
  submitText:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

export default function LoansScreen() {
  const [loans,      setLoans]      = useState([]);
  const [borrows,    setBorrows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTab,    setPageTab]    = useState('lent');  // lent | borrowed
  const [filterTab,  setFilterTab]  = useState('all');   // all | active | repaid
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const [lR, bR] = await Promise.all([
        client.get(ENDPOINTS.loans),
        client.get(ENDPOINTS.borrows),
      ]);
      setLoans(lR.data   || []);
      setBorrows(bR.data || []);
    } catch {
      setLoans([]); setBorrows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isLent  = pageTab === 'lent';
  const items   = isLent ? loans : borrows;

  const visible = items.filter(i =>
    filterTab === 'all'    ? true
    : filterTab === 'active' ? i.status === 'active'
    : i.status === 'repaid'
  );

  const totalLent         = loans.reduce((s, l) => s + l.amount, 0);
  const outstandingLent   = loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining_amount, 0);
  const recoveredLent     = totalLent - loans.reduce((s, l) => s + l.remaining_amount, 0);
  const totalBorrow       = borrows.reduce((s, b) => s + b.amount, 0);
  const outstandingBorrow = borrows.filter(b => b.status === 'active').reduce((s, b) => s + b.remaining_amount, 0);
  const repaidBorrow      = totalBorrow - borrows.reduce((s, b) => s + b.remaining_amount, 0);

  const sumCards = isLent
    ? [
        { label: 'TOTAL LENT',  value: totalLent,       color: '#f59e0b', sub: `${loans.length} loan${loans.length !== 1 ? 's' : ''}` },
        { label: 'OUTSTANDING', value: outstandingLent, color: COLORS.danger, sub: `${loans.filter(l => l.status === 'active').length} active` },
        { label: 'RECOVERED',   value: recoveredLent,   color: COLORS.success, sub: `${loans.filter(l => l.status === 'repaid').length} fully repaid` },
      ]
    : [
        { label: 'TOTAL BORROWED',  value: totalBorrow,       color: '#818cf8', sub: `${borrows.length} borrow${borrows.length !== 1 ? 's' : ''}` },
        { label: 'STILL TO REPAY', value: outstandingBorrow, color: COLORS.danger, sub: `${borrows.filter(b => b.status === 'active').length} active` },
        { label: 'ALREADY REPAID', value: repaidBorrow,      color: COLORS.success, sub: `${borrows.filter(b => b.status === 'repaid').length} fully repaid` },
      ];

  const filterCounts = {
    all:    items.length,
    active: items.filter(i => i.status === 'active').length,
    repaid: items.filter(i => i.status === 'repaid').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
      title="Loans"
      actions={
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Icons.plus size={15} color="#fff" />
          <Text style={styles.addHeaderBtnText}>{isLent ? 'Add Loan' : 'Add Borrow'}</Text>
        </TouchableOpacity>
      }
    />

      {/* Page tabs */}
      <View style={styles.pageTabs}>
        {[
          { id: 'lent',     label: '↑ Money Lent' },
          { id: 'borrowed', label: '↓ Money Borrowed' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.pageTab, pageTab === t.id && styles.pageTabActive]}
            onPress={() => { setPageTab(t.id); setFilterTab('all'); }}
          >
            <Text style={[styles.pageTabText, pageTab === t.id && styles.pageTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={loading ? [] : visible}
        keyExtractor={item => String(isLent ? item.loan_id : item.borrow_id)}
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
            <View style={styles.sumRow}>
              {sumCards.map(c => <SumCard key={c.label} {...c} />)}
            </View>
            <View style={styles.filterTabs}>
              {[
                { id: 'all',    label: `All (${filterCounts.all})` },
                { id: 'active', label: `Active (${filterCounts.active})` },
                { id: 'repaid', label: `Settled (${filterCounts.repaid})` },
              ].map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.filterTab, filterTab === t.id && styles.filterTabActive]}
                  onPress={() => setFilterTab(t.id)}
                >
                  <Text style={[styles.filterTabText, filterTab === t.id && styles.filterTabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        // ListEmptyComponent={() =>
        //   loading
        //     ? <LoadingState label={`Loading ${isLent ? 'loans' : 'borrows'}…`} />
        //     : (
        //       <EmptyState
        //         icon={isLent ? '🤝' : '🏦'}
        //         title={filterTab === 'all' ? `No ${isLent ? 'loans' : 'borrows'} yet` : `No ${filterTab} entries`}
        //         subtitle={filterTab === 'all' ? 'Record loans from the web app\'s "+ Add Entry" button.' : ''}
        //       />
        //     )
        // }
        ListEmptyComponent={() =>
          loading ? (
            <LoadingState label={`Loading ${isLent ? 'loans' : 'borrows'}…`} />
          ) : (
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIconWrap, {
                backgroundColor: isLent ? 'rgba(245,158,11,0.12)' : 'rgba(129,140,248,0.12)',
                borderColor:     isLent ? 'rgba(245,158,11,0.25)' : 'rgba(129,140,248,0.25)',
              }]}>
                {isLent
                  ? <Icons.sendMoney  size={36} color="#f59e0b" />
                  : <Icons.receiveMoney size={36} color="#818cf8" />
                }
              </View>
              <Text style={styles.emptyTitle}>
                {filterTab === 'all'
                  ? `No ${isLent ? 'loans' : 'borrows'} yet`
                  : `No ${filterTab} ${isLent ? 'loans' : 'borrows'}`
                }
              </Text>
              <Text style={styles.emptySub}>
                {filterTab === 'all'
                  ? isLent
                    ? 'Record money you lend to friends and track when you get it back.'
                    : 'Record money you borrow and keep track of what you owe.'
                  : `You have no ${filterTab} entries here.`
                }
              </Text>
              {filterTab === 'all' && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: isLent ? '#f59e0b' : '#818cf8' }]}
                  onPress={() => setShowAdd(true)}
                  activeOpacity={0.85}
                >
                  <Icons.plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>
                    {isLent ? 'Record First Loan' : 'Record First Borrow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <LoanCard item={item} isLent={isLent} onRefresh={load} idx={index} />
        )}
        contentContainerStyle={styles.list}
      />
      <AddLoanModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        isLent={isLent}
        onSuccess={() => load()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: SPACING.base, gap: SPACING.md, paddingBottom: SPACING['2xl'] },

  pageTabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: COLORS.border },
  pageTab: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: COLORS.transparent, marginBottom: -2,
  },
  pageTabActive:      { borderBottomColor: COLORS.primary },
  pageTabText:        { fontSize: FONT_SIZE.base, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  pageTabTextActive:  { color: COLORS.text, fontWeight: FONT_WEIGHT.semibold },

  listHeader: { gap: SPACING.base },

  sumRow:  { flexDirection: 'row', gap: SPACING.sm },
  sumCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4,
  },
  sumLabel: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase' },
  sumVal:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold },
  sumSub:   { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  filterTabs: {
    flexDirection: 'row', gap: 4,
    backgroundColor: COLORS.surface2, padding: 4,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  filterTab:          { paddingVertical: 5, paddingHorizontal: 14, borderRadius: RADIUS.sm },
  filterTabActive:    { backgroundColor: COLORS.surface },
  filterTabText:      { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  filterTabTextActive:{ color: COLORS.text },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base, gap: SPACING.md,
  },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDir:      { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginBottom: 3 },
  cardPerson:   { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  cardAmtLabel: { fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  cardAmt:      { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  cardNote:     { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  cardDate:     { fontSize: FONT_SIZE.sm, color: COLORS.text3 },

  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  badgeActive: { backgroundColor: 'rgba(245,158,11,0.12)' },
  badgeRepaid: { backgroundColor: 'rgba(16,185,129,0.10)' },
  badgeDot:    { width: 6, height: 6, borderRadius: 3 },
  badgeText:   { fontSize: 10, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.8, textTransform: 'uppercase' },

  progressHead:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: FONT_SIZE.xs, color: COLORS.text3, fontWeight: FONT_WEIGHT.semibold },
  progressRight: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  progressWrap:  { height: 5, borderRadius: 3, backgroundColor: COLORS.surface3, overflow: 'hidden' },
  progressBar:   { height: '100%', borderRadius: 3 },

  repaySection: { gap: 5 },
  repayRow:     { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  repayInput: {
    flex: 1, paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2, color: COLORS.text, fontSize: FONT_SIZE.sm,
  },
  repayBtn:     { paddingVertical: 7, paddingHorizontal: 14, borderRadius: RADIUS.md },
  repayBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  repayErr:     { fontSize: FONT_SIZE.xs, color: COLORS.danger },

  delBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  delText: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  addHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  addHeaderBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  emptyBox: {
    alignItems: 'center', paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, textAlign: 'center' },
  emptySub:   { fontSize: FONT_SIZE.base, color: COLORS.text2, textAlign: 'center', lineHeight: 21 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: 13,
    marginTop: SPACING.sm,
  },
  emptyBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});