// SplitEase/mobile/src/screens/expenses/AddExpenseScreen.jsx


import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as expensesApi from "../../api/expenses";
import * as loansApi from "../../api/loans";
import * as groupsApi from "../../api/groups";
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/icons';
import DatePickerInput from '../../components/common/DatePickerInput';
import PersonSearchField from '../../components/common/PersonSearchField';
import Dropdown from '../../components/common/Dropdown';
import IconPickerField from '../../components/common/IconPickerField';
import { suggestTemplateIconKey } from '../../constants/templateIcons';
import { TAB_BAR_HEIGHT } from "../../constants/theme";


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

function SubmitBtn({ label, color, loading, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.submitBtn, { backgroundColor: color, shadowColor: color }, (disabled || loading) && { opacity: 0.55 }]}
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
function PersonalForm({ onSuccess, editing }) {
  const isEdit = !!editing;
  const [categories,    setCategories]    = useState([]);
  const [catsLoading,   setCatsLoading]   = useState(true);
  const [categoryId,    setCategoryId]    = useState(null);
  const [categoryName,  setCategoryName]  = useState(editing?.category || '');
  const [subcats,       setSubcats]       = useState([]);
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date,   setDate]   = useState(editing?.expense_date || today());
  const [note,   setNote]   = useState(editing?.note || '');
  const [iconName, setIconName] = useState(editing?.icon_name || null);
  const [iconManual, setIconManual] = useState(!!editing?.icon_name);
  const [errs,   setErrs]   = useState({});
  const [saving, setSaving] = useState(false);

  // Categories/Subcategories are global (schema.sql, tables 4-5) — same
  // source as the group-expense picker, not scoped to a group.
  useEffect(() => {
    groupsApi.getCategories()
      .then(async ({ data }) => {
        setCategories(data || []);
        if (isEdit && editing.category) {
          const match = (data || []).find(c => c.category_name === editing.category);
          if (match) {
            setCategoryId(match.category_id);
            try {
              const sub = await groupsApi.getSubcategories(match.category_id);
              setSubcats(sub.data || []);
              if (editing.subcategory_name) {
                const smatch = sub.data?.find(s => s.subcategory_name === editing.subcategory_name);
                if (smatch) setSubcategoryId(smatch.subcategory_id);
              }
            } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  // Auto-suggest an icon whenever category/subcategory/note changes —
  // but never overwrite it once the user has picked one manually via
  // the icon field below.
  useEffect(() => {
    if (iconManual || !categoryName) return;
    const subName = subcats.find(s => s.subcategory_id === subcategoryId)?.subcategory_name;
    setIconName(suggestTemplateIconKey({ category: categoryName, subcategory: subName, description: note }));
  }, [categoryName, subcategoryId, note, iconManual]);

  async function handlePickCategory(cat) {
    setCategoryId(cat.category_id);
    setCategoryName(cat.category_name);
    setSubcategoryId(null);
    setErrs(p => ({...p, category: null}));
    try {
      const { data } = await groupsApi.getSubcategories(cat.category_id);
      setSubcats(data || []);
    } catch {
      setSubcats([]);
    }
  }

  async function submit() {
    const e = {};
    if (!categoryName.trim())      e.category = 'Pick a category';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))       e.date   = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const payload = {
        category: categoryName.trim(),
        subcategory_id: subcategoryId || null,
        amount: parseFloat(amount),
        expense_date: date,
        note: note.trim() || null,
        icon_name: iconName || null,
      };
      if (isEdit) {
        await expensesApi.editPersonalExpense(editing.expense_id, payload);
      } else {
        await expensesApi.addPersonalExpense(payload);
      }
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'add'} expense`);
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <Field label="Category" error={errs.category}>
        {catsLoading ? (
          <ActivityIndicator color={C.danger} />
        ) : (
          <Dropdown
            value={categoryId}
            options={categories.map(c => ({ id: c.category_id, label: c.category_name }))}
            onSelect={(id) => {
              const cat = categories.find(c => c.category_id === id);
              if (cat) handlePickCategory(cat);
            }}
            placeholder="Choose a category"
            activeColor={C.danger}
          />
        )}
      </Field>

      {subcats.length > 0 && (
        <Field label="Subcategory" optional>
          <Dropdown
            value={subcategoryId}
            options={[{ id: null, label: 'None' }, ...subcats.map(s => ({ id: s.subcategory_id, label: s.subcategory_name }))]}
            onSelect={setSubcategoryId}
            placeholder="None"
            activeColor={C.danger}
          />
        </Field>
      )}

      {!!categoryName && (
        <Field label="Icon" optional>
          <IconPickerField
            value={iconName}
            onChange={(k) => { setIconName(k); setIconManual(true); }}
            categoryName={categoryName}
            activeColor={C.danger}
            requireCategory={false}
          />
        </Field>
      )}

      <Field label="Amount" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DatePickerInput value={date} onChange={v => { setDate(v); setErrs(p => ({...p, date: null})); }} accentColor={C.danger} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Any extra details…" multiline />
      </Field>
      <SubmitBtn label={isEdit ? "Save Changes →" : "Add Expense →"} color={C.danger} loading={saving} onPress={submit} />
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
      const rawSource = source.trim().toLowerCase().replace(/\s+/g, '_');
      const VALID = ['salary', 'pocket_money', 'stipend', 'other'];
      const source_type = VALID.includes(rawSource) ? rawSource : 'other';

      await expensesApi.addIncome({
        source_type,
        amount: parseFloat(amount),
        income_date: date,
        note: source.trim() !== source_type ? source.trim() : (note.trim() || null),
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add income');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <Field label="Source Type" error={errs.source}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {['salary', 'pocket_money', 'stipend', 'other'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={{
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: R.full, borderWidth: 1,
                borderColor: source === opt ? C.success + '80' : C.border,
                backgroundColor: source === opt ? C.successLo : C.surface2,
              }}
              onPress={() => { setSource(opt); setErrs(p => ({...p, source: null})); }}
            >
              <Text style={{ fontSize: F.sm, color: source === opt ? C.success : C.text2, fontWeight: source === opt ? W.bold : W.regular }}>
                {opt === 'pocket_money' ? 'Pocket Money' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>
      <Field label="Amount" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DatePickerInput value={date} onChange={v => { setDate(v); setErrs(p => ({...p, date: null})); }} accentColor={C.success} />
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
  const [borrower, setBorrower]   = useState('');
  const [amount,   setAmount]     = useState('');
  const [date,     setDate]       = useState(today());
  const [note,     setNote]       = useState('');
  const [errs,     setErrs]       = useState({});
  const [saving,   setSaving]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  async function submit() {
    const e = {};
    if (!borrower.trim())           e.borrower = 'Borrower name is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))        e.date     = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await loansApi.addLoan({
        borrower_name: borrower.trim(),
        amount: parseFloat(amount),
        loan_date: date,
        note: note.trim() || null,
        linked_user_id: selectedUser?.user_id || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record loan');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <View style={styles.infoBox}>
        <Icons.info size={14} color={C.warning} />
        <Text style={styles.infoText}>Record money you lent to someone. Track repayments from the Expenses timeline.</Text>
      </View>
      <PersonSearchField
        label="Borrower Name"
        value={borrower}
        onChangeName={v => { setBorrower(v); setErrs(p => ({...p, borrower: null})); }}
        selectedUser={selectedUser}
        onSelectUser={u => { setSelectedUser(u); setBorrower(u.name); }}
        onClearUser={() => setSelectedUser(null)}
        placeholder="Search name or add custom…"
        error={errs.borrower}
      />
      <Field label="Amount Lent" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DatePickerInput value={date} onChange={v => { setDate(v); setErrs(p => ({...p, date: null})); }} accentColor={C.warning} />
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
  const [lender, setLender]   = useState('');
  const [amount, setAmount]   = useState('');
  const [date,   setDate]     = useState(today());
  const [note,   setNote]     = useState('');
  const [errs,   setErrs]     = useState({});
  const [saving, setSaving]   = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  async function submit() {
    const e = {};
    if (!lender.trim())             e.lender = 'Lender name is required';
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = 'Enter a valid amount';
    if (!validateDate(date))        e.date   = 'Use YYYY-MM-DD format';
    setErrs(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await loansApi.addBorrow({
        lender_name: lender.trim(),
        amount: parseFloat(amount),
        borrow_date: date,
        note: note.trim() || null,
        linked_user_id: selectedUser?.user_id || null,
      });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record borrow');
    } finally { setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <View style={styles.infoBox}>
        <Icons.info size={14} color={C.purple} />
        <Text style={styles.infoText}>Record money you borrowed from someone. Mark it repaid when you pay them back.</Text>
      </View>
      <PersonSearchField
        label="Lender Name"
        value={lender}
        onChangeName={v => { setLender(v); setErrs(p => ({...p, lender: null})); }}
        selectedUser={selectedUser}
        onSelectUser={u => { setSelectedUser(u); setLender(u.name); }}
        onClearUser={() => setSelectedUser(null)}
        placeholder="Search name or add custom…"
        error={errs.lender}
      />
      <Field label="Amount Borrowed" error={errs.amount}>
        <AmountInput value={amount} onChangeText={v => { setAmount(v); setErrs(p => ({...p, amount: null})); }} />
      </Field>
      <Field label="Date" error={errs.date}>
        <DatePickerInput value={date} onChange={v => { setDate(v); setErrs(p => ({...p, date: null})); }} accentColor={C.purple} />
      </Field>
      <Field label="Note" optional>
        <StyledInput value={note} onChangeText={setNote} placeholder="Purpose, terms…" multiline />
      </Field>
      <SubmitBtn label="Record Borrow →" color={C.purple} loading={saving} onPress={submit} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  // Allow pre-selecting a tab via navigation params
  // e.g. navigation.navigate('AddEntry', { tab: 'income' })
  const initialTab = route.params?.tab || 'personal';
  const [activeTab, setActiveTab] = useState(initialTab);
  const editingPersonal = route.params?.editPersonalExpense || null;
  const isEditMode = !!editingPersonal;

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
          <Icons.back size={20} color={C.text2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Entry' : 'Add Entry'}</Text>
          <Text style={styles.headerSub}>
            {activeTab === 'personal' && 'Personal Expense'}
            {activeTab === 'income'   && 'Income'}
            {activeTab === 'lend'     && 'Lend Money'}
            {activeTab === 'borrow'   && 'Borrow Money'}
          </Text>
        </View>
      </View>

      {/* Tab bar — hidden in edit mode, only Personal applies to edits */}
      {!isEditMode && (
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
      )}

      {/* Active tab description */}
      {!isEditMode && (
      <View style={[styles.tabDesc, { backgroundColor: activeCfg.colorLo, borderColor: activeCfg.color + '40' }]}>
        <Text style={[styles.tabDescText, { color: activeCfg.color }]}>
          {activeTab === 'personal' && 'Track a personal expense not linked to a group'}
          {activeTab === 'income'   && 'Record salary, freelance, or any money received'}
          {activeTab === 'lend'     && 'Record money you lent to someone'}
          {activeTab === 'borrow'   && 'Record money you borrowed from someone'}
        </Text>
      </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'personal' && <PersonalForm onSuccess={onSuccess} editing={editingPersonal} />}
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

  backBtn:     { padding: 2, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.base, paddingTop: 14, paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 10,
  },
  headerTitle: { 
    fontSize: F.xl,           // was F.lg (16) → now 20
    fontWeight: W.heavy,      // was bold → now heavy
    color: C.text, 
    textAlign: 'left',        // left-aligned
    lineHeight: 24,
  },
  headerSub: {
    fontSize: F.xs,
    color: C.text3,
    marginTop: 1,
    fontWeight: W.medium,
  },

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

  tabDesc: {
    marginHorizontal: S.base,
    marginTop: S.md, marginBottom: S.xs,
    paddingHorizontal: S.md, paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    alignSelf: 'flex-start',      // pill hugs content width
    },
  tabDescText: { fontSize: F.xs, fontWeight: W.semibold },

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
    borderWidth: 1, borderColor: C.border2,
    borderRadius: R.lg,              // slightly more rounded — feels premium
    paddingHorizontal: S.base,
    paddingVertical: 4,
    marginBottom: 2,
  },
  amountSymbol: { fontSize: 26, color: C.text3, marginRight: 4, fontWeight: W.medium },
  amountInput:  { flex: 1, fontSize: 28, fontWeight: W.heavy, color: C.text, paddingVertical: 12 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border2,
    padding: S.md,
  },
  infoText: { flex: 1, fontSize: F.sm, color: C.text2, lineHeight: 18 },

  submitBtn: {
    borderRadius: R.lg, paddingVertical: 15,
    alignItems: 'center', marginTop: S.sm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
  },
  submitBtnText: { color: C.white, fontSize: F.md, fontWeight: W.bold, letterSpacing: 0.3 },
});