// SplitEase/mobile/src/screens/expenses/AddEntryScreen.jsx
//
// Mobile port of web's AddEntryModal.
// Four tabs: Personal Expense · Income · Lend · Borrow
// Each tab posts to its own endpoint, then navigates back.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../constants/icons';

// ─── Design tokens (same as GroupDetailScreen) ────────────────────────────────
const C = {
  bg:       '#0f1117',
  surface:  '#181c27',
  surface2: '#1e2333',
  surface3: '#252a3a',
  border:   '#2a2f42',
  border2:  '#333a52',
  primary:  '#3b82f6',
  primaryLo:'rgba(59,130,246,0.12)',
  success:  '#10b981',
  successLo:'rgba(16,185,129,0.12)',
  danger:   '#ef4444',
  dangerLo: 'rgba(239,68,68,0.12)',
  warning:  '#f59e0b',
  warningLo:'rgba(245,158,11,0.10)',
  purple:   '#818cf8',
  purpleLo: 'rgba(129,140,248,0.12)',
  text:     '#f1f5f9',
  text2:    '#94a3b8',
  text3:    '#64748b',
  white:    '#ffffff',
};
const F = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20 };
const W = { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' };
const R = { sm: 8, md: 10, lg: 14, xl: 18, full: 999 };
const S = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 28 };

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'personal', label: 'Expense', Icon: Icons.personalExpense, color: C.danger,   colorLo: C.dangerLo  },
  { id: 'income',   label: 'Income',  Icon: Icons.income,          color: C.success,  colorLo: C.successLo },
  { id: 'lend',     label: 'Lend',    Icon: Icons.lendMoney,       color: C.warning,  colorLo: C.warningLo },
  { id: 'borrow',   label: 'Borrow',  Icon: Icons.borrowMoney,     color: C.purple,   colorLo: C.purpleLo  },
];

// ─── Reusable field components ────────────────────────────────────────────────
function Label({ text, optional }) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {optional && <Text style={{ color: C.text3, fontWeight: W.regular }}> — optional</Text>}
    </Text>
  );
}

function Field({ label, optional, error, children }) {
  return (
    <View style={styles.field}>
      <Label text={label} optional={optional} />
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function StyledInput({ value, onChangeText, placeholder, keyboardType = 'default', multiline, ...rest }) {
  return (
    <TextInput
      style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.text3}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize="sentences"
      {...rest}
    />
  );
}

function AmountInput({ value, onChangeText, placeholder = '0.00' }) {
  return (
    <View style={styles.amountWrap}>
      <Text style={styles.amountSymbol}>₹</Text>
      <TextInput
        style={styles.amountInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

function DateInput({ value, onChangeText }) {
  // Simple text input for date — RN DatePicker is platform-specific
  // Shows YYYY-MM-DD and validates on submit
  return (
    <StyledInput
      value={value}
      onChangeText={onChangeText}
      placeholder="YYYY-MM-DD"
      keyboardType="numbers-and-punctuation"
      autoCapitalize="none"
    />
  );
}

function SubmitBtn({ label, color, loading, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.submitBtn, { backgroundColor: color }, (disabled || loading) && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={C.white} size="small" />
        : <Text style={styles.submitBtnText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function validateDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());
}

// ─── Tab forms ────────────────────────────────────────────────────────────────

// Personal Expense
function PersonalForm({ onSuccess }) {
  const [desc,   setDesc]   = useState('');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(today());
  const [note,   setNote]   = useState('');
  const [errs,   setErrs]   = useState({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    const e = {};
    if (!desc.trim())              e.desc   = 'Description is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))       e.date   = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await client.post('/personal-expenses/', {
        description: desc.trim(),
        amount: parseFloat(amount),
        expense_date: date,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add expense');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <Field label="Description" error={errs.desc}>
        <StyledInput value={desc} onChangeText={v => { setDesc(v); setErrs(p => ({...p, desc: null})); }} placeholder="e.g. Coffee, Fuel…" />
      </Field>
      <Field label="Amount" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DateInput value={date} onChangeText={v => { setDate(v); setErrs(p => ({...p, date: null})); }} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Any extra details…" multiline />
      </Field>
      <SubmitBtn label="Add Expense →" color={C.danger} loading={saving} onPress={submit} />
    </View>
  );
}

// Income
function IncomeForm({ onSuccess }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(today());
  const [note,   setNote]   = useState('');
  const [errs,   setErrs]   = useState({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    const e = {};
    if (!source.trim())             e.source = 'Source is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))        e.date   = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await client.post('/income/', {
        source: source.trim(),
        amount: parseFloat(amount),
        income_date: date,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add income');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <Field label="Source" error={errs.source}>
        <StyledInput value={source} onChangeText={v => { setSource(v); setErrs(p => ({...p, source: null})); }} placeholder="e.g. Salary, Freelance…" />
      </Field>
      <Field label="Amount" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DateInput value={date} onChangeText={v => { setDate(v); setErrs(p => ({...p, date: null})); }} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Any extra details…" multiline />
      </Field>
      <SubmitBtn label="Add Income →" color={C.success} loading={saving} onPress={submit} />
    </View>
  );
}

// Lend
function LendForm({ onSuccess }) {
  const [borrower, setBorrower] = useState('');
  const [amount,   setAmount]   = useState('');
  const [date,     setDate]     = useState(today());
  const [note,     setNote]     = useState('');
  const [errs,     setErrs]     = useState({});
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    const e = {};
    if (!borrower.trim())           e.borrower = 'Borrower name is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))        e.date     = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await client.post('/loans/', {
        borrower_name: borrower.trim(),
        amount: parseFloat(amount),
        loan_date: date,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record loan');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>💡 Record money you lent to someone. Track repayments from the Expenses timeline.</Text>
      </View>
      <Field label="Borrower Name" error={errs.borrower}>
        <StyledInput value={borrower} onChangeText={v => { setBorrower(v); setErrs(p => ({...p, borrower: null})); }} placeholder="e.g. Rahul, Priya…" />
      </Field>
      <Field label="Amount Lent" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DateInput value={date} onChangeText={v => { setDate(v); setErrs(p => ({...p, date: null})); }} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Purpose, terms…" multiline />
      </Field>
      <SubmitBtn label="Record Loan →" color={C.warning} loading={saving} onPress={submit} />
    </View>
  );
}

// Borrow
function BorrowForm({ onSuccess }) {
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(today());
  const [note,   setNote]   = useState('');
  const [errs,   setErrs]   = useState({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    const e = {};
    if (!lender.trim())             e.lender = 'Lender name is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))        e.date   = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await client.post('/borrows/', {
        lender_name: lender.trim(),
        amount: parseFloat(amount),
        borrow_date: date,
        note: note.trim() || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record borrow');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>💡 Record money you borrowed from someone. Mark it repaid when you pay them back.</Text>
      </View>
      <Field label="Lender Name" error={errs.lender}>
        <StyledInput value={lender} onChangeText={v => { setLender(v); setErrs(p => ({...p, lender: null})); }} placeholder="e.g. Amit, Mom…" />
      </Field>
      <Field label="Amount Borrowed" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DateInput value={date} onChangeText={v => { setDate(v); setErrs(p => ({...p, date: null})); }} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Purpose, terms…" multiline />
      </Field>
      <SubmitBtn label="Record Borrow →" color={C.purple} loading={saving} onPress={submit} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddEntryScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  // Allow pre-selecting a tab via navigation params
  // e.g. navigation.navigate('AddEntry', { tab: 'income' })
  const initialTab = route.params?.tab || 'personal';
  const [activeTab, setActiveTab] = useState(initialTab);

  function onSuccess() {
    navigation.goBack();
  }

  const activeCfg = TABS.find(t => t.id === activeTab);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Icons.back size={22} color={C.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Entry</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          const iconColor = isActive ? t.color : C.text3;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: t.colorLo, borderColor: t.color + '55' },
              ]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.75}
            >
              <t.Icon size={16} color={iconColor} />
              <Text style={[styles.tabLabel, isActive && { color: t.color, fontWeight: W.bold }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active tab description */}
      <View style={[styles.tabDesc, { borderLeftColor: activeCfg.color }]}>
        <Text style={[styles.tabDescText, { color: activeCfg.color }]}>
          {activeTab === 'personal' && 'Track a personal expense not linked to a group'}
          {activeTab === 'income'   && 'Record salary, freelance, or any money received'}
          {activeTab === 'lend'     && 'Record money you lent to someone'}
          {activeTab === 'borrow'   && 'Record money you borrowed from someone'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'personal' && <PersonalForm onSuccess={onSuccess} />}
          {activeTab === 'income'   && <IncomeForm   onSuccess={onSuccess} />}
          {activeTab === 'lend'     && <LendForm     onSuccess={onSuccess} />}
          {activeTab === 'borrow'   && <BorrowForm   onSuccess={onSuccess} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.base, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  backBtn:     { padding: 2, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: F.lg, fontWeight: W.bold, color: C.text, textAlign: 'center' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    padding: S.sm,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: S.xs,
  },
  tabItem: {
    flex: 1, paddingVertical: 7, paddingHorizontal: 4,
    borderRadius: R.md, borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', gap: 3, flexDirection: 'column',
  },
  tabLabel: { fontSize: F.xs, fontWeight: W.medium, color: C.text3, textAlign: 'center' },

  // Tab description strip
  tabDesc: {
    borderLeftWidth: 3, marginHorizontal: S.base,
    marginTop: S.md, marginBottom: S.xs,
    paddingLeft: S.sm, paddingVertical: 2,
  },
  tabDescText: { fontSize: F.sm, fontWeight: W.medium },

  scroll: { padding: S.base, paddingBottom: 60, gap: S.base },

  // Form layout
  form: { gap: S.md },

  field:       { gap: S.xs },
  fieldLabel:  { fontSize: F.sm, fontWeight: W.semibold, color: C.text3, letterSpacing: 0.5 },
  fieldError:  { fontSize: F.xs, color: C.danger, marginTop: 2 },

  input: {
    backgroundColor: C.surface2,
    borderWidth: 1, borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md, paddingVertical: 11,
    fontSize: F.md, color: C.text,
  },

  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface2,
    borderWidth: 1, borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
  },
  amountSymbol: { fontSize: F.xl, color: C.text3, marginRight: 6 },
  amountInput:  { flex: 1, fontSize: 22, fontWeight: W.heavy, color: C.text, paddingVertical: 10 },

  infoBox: {
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border2,
    padding: S.md,
  },
  infoText: { fontSize: F.sm, color: C.text2, lineHeight: 18 },

  submitBtn: {
    borderRadius: R.lg, paddingVertical: 15,
    alignItems: 'center', marginTop: S.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  submitBtnText: { color: C.white, fontSize: F.md, fontWeight: W.bold, letterSpacing: 0.3 },
});