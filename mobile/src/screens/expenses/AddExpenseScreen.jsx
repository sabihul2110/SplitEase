// SplitEase/mobile/src/screens/expenses/AddExpenseScreen.jsx
//
// Fixed vs original:
//   • Endpoint: client.post(`/expenses/${groupId}`, ...) — matches web exactly
//   • Categories + subcategories fetched from API (/groups/categories,
//     /groups/subcategories/:id), with hardcoded fallback if API unavailable
//   • payer_id defaults to current user but is selectable (matches web)
//   • expense_date field added (missing from original)
//   • Removed dependency on ENDPOINTS helper for this call

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Icons, CATEGORY_ICONS } from '../../constants/icons';
import { Modal } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar } from '../../components/common/ui';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';

// Fallback categories if API unavailable
const FALLBACK_CATEGORIES = [
  { category_id: 1, category_name: 'Travel',        emoji: '✈️' },
  { category_id: 2, category_name: 'Accommodation', emoji: '🏨' },
  { category_id: 3, category_name: 'Food & Dining', emoji: '🍽️' },
  { category_id: 4, category_name: 'Activities',    emoji: '🎉' },
  { category_id: 5, category_name: 'Utilities',     emoji: '💡' },
  { category_id: 6, category_name: 'Groceries',     emoji: '🛒' },
  { category_id: 7, category_name: 'Shopping',      emoji: '🛍️' },
  { category_id: 8, category_name: 'Transport',     emoji: '🚗' },
];

// Fallback icon color for unknown categories
const DEFAULT_CAT_COLOR = '#94a3b8'; // COLORS.text2

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function AddExpenseScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName, members = [], editExpense = null } = route.params;
  const isEdit = !!editExpense;

  // Form state
  const [description,   setDescription]   = useState(editExpense?.description   || '');
  const [amount,        setAmount]        = useState(editExpense ? String(editExpense.total_amount) : '');
  const [payerId,       setPayerId]       = useState(editExpense ? (members.find(m => m.name === editExpense.payer_name)?.user_id ?? user.user_id) : user.user_id);
  const [categoryId,    setCategoryId]    = useState(3);   // will be refined below
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [splitType,     setSplitType]     = useState(editExpense?.split_type    || 'equal');
  const [expenseDate,   setExpenseDate]   = useState(editExpense?.expense_date  || todayStr());
  // const [participants,  setParticipants]  = useState(members.map(m => m.user_id));
  // const [customAmounts, setCustomAmounts] = useState({});
  const editSplits = editExpense?.splits || [];
  const initialParticipants = editSplits.length > 0
    ? editSplits.map(s => s.user_id)
    : members.map(m => m.user_id);
  const initialCustomAmounts = editSplits.length > 0
    ? Object.fromEntries(editSplits.map(s => [s.user_id, String(s.amount_owed)]))
    : {};

  const [participants,  setParticipants]  = useState(initialParticipants);
  const [customAmounts, setCustomAmounts] = useState(initialCustomAmounts);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth,    setPickerMonth]    = useState(() => {
    const d = new Date(expenseDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Category data
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [subcats,    setSubcats]    = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      setCatsLoading(true);
      try {
        const { data } = await client.get('/groups/categories');
        if (data?.length) {
          setCategories(data);
          if (editExpense) {
            const match = data.find(c => c.category_name === editExpense.category_name);
            if (match) {
              setCategoryId(match.category_id);
              // load subcategories for this category
              try {
                const sub = await client.get(`/groups/subcategories/${match.category_id}`);
                setSubcats(sub.data || []);
                if (editExpense.subcategory_name) {
                  const smatch = sub.data?.find(s => s.subcategory_name === editExpense.subcategory_name);
                  if (smatch) setSubcategoryId(smatch.subcategory_id);
                }
              } catch {}
            }
          }
        }
      } catch {
        // keep fallback
      } finally {
        setCatsLoading(false);
      }
    }
    loadCategories();
  }, []);

  async function handleCategoryChange(id) {
    setCategoryId(id);
    setSubcategoryId(null);
    setSubcats([]);
    try {
      const { data } = await client.get(`/groups/subcategories/${id}`);
      setSubcats(data || []);
    } catch {}
  }

  // Auto-fill custom amounts when switching to custom
  useEffect(() => {
    if (splitType !== 'custom' || !amount) return;
    const share = participants.length > 0
      ? (parseFloat(amount) / participants.length).toFixed(2)
      : '0';
    const map = {};
    participants.forEach(id => { map[id] = customAmounts[id] || share; });
    setCustomAmounts(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType]);

  function toggleParticipant(userId) {
    setParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  function equalShare() {
    if (!amount || !participants.length) return '0.00';
    return (parseFloat(amount) / participants.length).toFixed(2);
  }

  function customTotal() {
    return participants.reduce((sum, id) => sum + (parseFloat(customAmounts[id]) || 0), 0);
  }

  function validate() {
    const e = {};
    if (!description.trim())                          e.description = 'Description is required';
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
                                                      e.amount      = 'Enter a valid amount';
    if (participants.length === 0)                    e.participants = 'Select at least one participant';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate))   e.date        = 'Use YYYY-MM-DD format';
    if (splitType === 'custom') {
      const diff = Math.abs(customTotal() - parseFloat(amount));
      if (diff > 0.01)
        e.custom = `Split total ₹${customTotal().toFixed(2)} doesn't match ₹${parseFloat(amount).toFixed(2)}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const totalAmt = parseFloat(amount);
      const splits = splitType === 'equal'
        ? participants.map(uid => ({
            user_id:     uid,
            amount_owed: parseFloat((totalAmt / participants.length).toFixed(2)),
            share_pct:   parseFloat((100 / participants.length).toFixed(2)),
          }))
        : participants.map(uid => ({
            user_id:     uid,
            amount_owed: parseFloat(customAmounts[uid] || 0),
            share_pct:   totalAmt
              ? parseFloat(((parseFloat(customAmounts[uid] || 0) / totalAmt) * 100).toFixed(2))
              : null,
          }));

      // Matches web: api.post(`/expenses/${id}`, { payer_id, category_id, subcategory_id, total_amount, description, split_type, expense_date, splits })
      const payload = {
        payer_id:       payerId,
        category_id:    categoryId,
        subcategory_id: subcategoryId || null,
        total_amount:   totalAmt,
        description:    description.trim(),
        split_type:     splitType,
        expense_date:   expenseDate,
        splits,
      };
      if (isEdit) {
        await client.put(`/expenses/${editExpense.expense_id}`, payload);
      } else {
        await client.post(`/expenses/${groupId}`, payload);
      }

      // navigation.goBack();
      navigation.navigate('GroupDetail', { 
        groupId, 
        groupName, 
        refreshStamp: Date.now() 
      });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  }

  const total = parseFloat(amount || 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={isEdit ? 'Edit Expense' : 'Add Expense'} subtitle={groupName} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Amount ── */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>TOTAL AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={v => { setAmount(v); setErrors(p => ({...p, amount: null})); }}
                placeholder="0.00"
                placeholderTextColor={COLORS.text3}
                keyboardType="decimal-pad"
              />
            </View>
            {!!errors.amount && <Text style={styles.err}>{errors.amount}</Text>}
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <Input
              label="What was this for?"
              value={description}
              onChangeText={v => { setDescription(v); setErrors(p => ({...p, description: null})); }}
              placeholder="e.g. Hotel booking, Dinner…"
              autoCapitalize="sentences"
              error={errors.description}
            />
          </View>

          {/* ── Details card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>

            {/* Who paid */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WHO PAID</Text>
              <View style={styles.chips}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[styles.chip, payerId === m.user_id && styles.chipActive]}
                    onPress={() => setPayerId(m.user_id)}
                  >
                    <Avatar name={m.name} size={22} />
                    <Text style={[styles.chipText, payerId === m.user_id && styles.chipTextActive]}>
                      {m.user_id === user.user_id ? 'You' : m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.catRow}>
                  {categories.map(cat => {
                    const isActive = categoryId === (cat.category_id || cat.id);
                    const id = cat.category_id || cat.id;
                    const name = cat.category_name || cat.name;
                    const catCfg = CATEGORY_ICONS[name];
                    const iconColor = isActive
                      ? (catCfg?.color || DEFAULT_CAT_COLOR)
                      : COLORS.text3;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.catChip, isActive && styles.catChipActive]}
                        onPress={() => handleCategoryChange(id)}
                      >
                        {catCfg
                          ? <catCfg.Icon size={20} color={iconColor} />
                          : <Icons.expenses size={20} color={iconColor} />
                        }
                        <Text style={[styles.catName, isActive && { color: catCfg?.color || DEFAULT_CAT_COLOR }]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Subcategory */}
            {subcats.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SUBCATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.catRow}>
                    <TouchableOpacity
                      style={[styles.subChip, subcategoryId === null && styles.subChipActive]}
                      onPress={() => setSubcategoryId(null)}
                    >
                      <Text style={[styles.subChipText, subcategoryId === null && styles.subChipTextActive]}>None</Text>
                    </TouchableOpacity>
                    {subcats.map(s => (
                      <TouchableOpacity
                        key={s.subcategory_id}
                        style={[styles.subChip, subcategoryId === s.subcategory_id && styles.subChipActive]}
                        onPress={() => setSubcategoryId(s.subcategory_id)}
                      >
                        <Text style={[styles.subChipText, subcategoryId === s.subcategory_id && styles.subChipTextActive]}>
                          {s.subcategory_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => {
                  const d = new Date(expenseDate);
                  setPickerMonth({ year: d.getFullYear(), month: d.getMonth() });
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Icons.calendarDays size={16} color={COLORS.text2} />
                <Text style={styles.datePickerText}>
                  {new Date(expenseDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </Text>
                <Icons.chevronRight size={14} color={COLORS.text3} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {!!errors.date && <Text style={styles.err}>{errors.date}</Text>}
            </View>

            {/* Custom date picker modal */}
            <Modal
              visible={showDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              >
                <TouchableOpacity activeOpacity={1} style={styles.calendarModal}>
                  {/* Month navigation */}
                  <View style={styles.calMonthRow}>
                    <TouchableOpacity
                      onPress={() => setPickerMonth(p => {
                        const d = new Date(p.year, p.month - 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icons.chevronLeft size={20} color={COLORS.text2} />
                    </TouchableOpacity>
                    <Text style={styles.calMonthLabel}>
                      {new Date(pickerMonth.year, pickerMonth.month).toLocaleDateString('en-IN', {
                        month: 'long', year: 'numeric'
                      })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const next = new Date(pickerMonth.year, pickerMonth.month + 1);
                        const now  = new Date();
                        if (next <= now) {
                          setPickerMonth({ year: next.getFullYear(), month: next.getMonth() });
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icons.chevronRight size={20} color={COLORS.text2} />
                    </TouchableOpacity>
                  </View>

                  {/* Day-of-week headers */}
                  <View style={styles.calDowRow}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <Text key={d} style={styles.calDow}>{d}</Text>
                    ))}
                  </View>

                  {/* Day grid */}
                  {(() => {
                    const { year, month } = pickerMonth;
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    const selected = new Date(expenseDate);
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    while (cells.length % 7 !== 0) cells.push(null);
                    const weeks = [];
                    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
                    return weeks.map((week, wi) => (
                      <View key={wi} style={styles.calWeekRow}>
                        {week.map((day, di) => {
                          if (!day) return <View key={di} style={styles.calDayCell} />;
                          const thisDate = new Date(year, month, day);
                          const isFuture = thisDate > today;
                          const isSelected =
                            selected.getFullYear() === year &&
                            selected.getMonth() === month &&
                            selected.getDate() === day;
                          return (
                            <TouchableOpacity
                              key={di}
                              style={[
                                styles.calDayCell,
                                isSelected && styles.calDaySelected,
                                isFuture  && styles.calDayDisabled,
                              ]}
                              onPress={() => {
                                if (isFuture) return;
                                const iso = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                setExpenseDate(iso);
                                setErrors(p => ({ ...p, date: null }));
                                setShowDatePicker(false);
                              }}
                              disabled={isFuture}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.calDayText,
                                isSelected && styles.calDayTextSelected,
                                isFuture   && { color: COLORS.text3 },
                              ]}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* ── Split strategy ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Split Strategy</Text>
            <View style={styles.splitToggle}>
              {['equal', 'custom'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.splitBtn, splitType === type && styles.splitBtnActive]}
                  onPress={() => setSplitType(type)}
                >
                  <Text style={[styles.splitBtnText, splitType === type && styles.splitBtnTextActive]}>
                    {type === 'equal' ? ' Equal' : '️  Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Participants ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Participants</Text>
            {!!errors.participants && <Text style={styles.err}>{errors.participants}</Text>}

            {members.map(member => {
              const isSelected = participants.includes(member.user_id);
              const isMe       = member.user_id === user.user_id;
              const share      = isSelected
                ? splitType === 'equal'
                  ? `₹${equalShare()}`
                  : `₹${parseFloat(customAmounts[member.user_id] || 0).toFixed(2)}`
                : '—';

              return (
                <View key={member.user_id}>
                  <TouchableOpacity
                    style={[styles.participantRow, isSelected && styles.participantRowActive]}
                    onPress={() => toggleParticipant(member.user_id)}
                    activeOpacity={0.7}
                  >
                    <Avatar name={member.name} size={32} />
                    <Text style={styles.participantName}>
                      {isMe ? `${member.name} (you)` : member.name}
                    </Text>
                    <View style={styles.participantRight}>
                      <Text style={[styles.shareText, { color: isSelected ? COLORS.success : COLORS.text3 }]}>
                        {share}
                      </Text>
                      <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Custom amount input — shown inline below the row */}
                  {splitType === 'custom' && isSelected && (
                    <View style={styles.customInputRow}>
                      <Text style={styles.customInputLabel}>Amount for {isMe ? 'you' : member.name}:</Text>
                      <TextInput
                        style={styles.customInput}
                        value={customAmounts[member.user_id] || ''}
                        onChangeText={v => setCustomAmounts(p => ({...p, [member.user_id]: v}))}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.text3}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
              );
            })}

            {/* Custom split summary */}
            {splitType === 'custom' && total > 0 && (
              <View style={[
                styles.splitSummary,
                Math.abs(customTotal() - total) < 0.02
                  ? { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)' }
                  : { borderColor: 'rgba(239,68,68,0.3)',  backgroundColor: 'rgba(239,68,68,0.06)'  },
              ]}>
                <Text style={styles.splitSummaryText}>
                  Assigned: ₹{customTotal().toFixed(2)}
                  {'  ·  '}
                  Target: ₹{total.toFixed(2)}
                  {Math.abs(customTotal() - total) < 0.02
                    ? <Text style={{ color: COLORS.success }}>  ✓ Matches</Text>
                    : null
                  }
                </Text>
                {!!errors.custom && <Text style={styles.err}>{errors.custom}</Text>}
              </View>
            )}
          </View>

          {/* ── Live split preview ── */}
          {total > 0 && participants.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Split Preview</Text>
              {members.filter(m => participants.includes(m.user_id)).map(m => {
                const isPayer = m.user_id === payerId;
                const amt = splitType === 'equal'
                  ? total / participants.length
                  : parseFloat(customAmounts[m.user_id] || 0);
                const pct = total ? ((amt / total) * 100).toFixed(1) : '0.0';
                return (
                  <View key={m.user_id} style={styles.previewRow}>
                    <Avatar name={m.name} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName}>
                        {m.user_id === user.user_id ? 'You' : m.name}
                      </Text>
                      <Text style={{ fontSize: FONT_SIZE.xs, color: isPayer ? COLORS.success : COLORS.danger, marginTop: 1 }}>
                        {isPayer ? `Paid ₹${total.toFixed(2)}` : `Owes ₹${amt.toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.previewAmt}>₹{amt.toFixed(2)}</Text>
                      <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text3 }}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
              <View style={styles.previewTotal}>
                <Text style={styles.previewTotalLabel}>Total Allocated</Text>
                <Text style={styles.previewTotalAmt}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Button
            title={loading ? (isEdit ? 'Saving…' : 'Recording…') : (isEdit ? 'Save Changes →' : 'Record Expense →')}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            disabled={
              !amount || !participants.length ||
              (splitType === 'custom' && Math.abs(customTotal() - total) > 0.01)
            }
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 60 },

  // Amount hero
  amountCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base,
  },
  amountLabel:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 1, marginBottom: 8 },
  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountSymbol: { fontSize: 28, color: COLORS.text3 },
  amountInput:  { flex: 1, fontSize: 32, fontWeight: FONT_WEIGHT.heavy, color: COLORS.text, padding: 0 },

  // Generic card
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, gap: SPACING.md,
  },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },

  section: { gap: SPACING.sm },

  field:      { gap: SPACING.sm },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 0.8 },

  // Payer chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  chipActive:     { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  chipText:       { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },

  // Categories
  catRow: { flexDirection: 'row', gap: SPACING.sm },
  catChip: {
    alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, minWidth: 72,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  catEmoji:      { /* removed — using SVG icons */ },
  catName:       { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' },
  catNameActive: { color: COLORS.primary },

  // Subcategory
  subChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  subChipActive:     { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  subChipText:       { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  subChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },

  // Split toggle
  splitToggle:        { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 3 },
  splitBtn:           { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: RADIUS.sm - 1 },
  splitBtnActive:     { backgroundColor: COLORS.primary },
  splitBtnText:       { fontSize: FONT_SIZE.base, color: COLORS.text2 },
  splitBtnTextActive: { color: COLORS.white, fontWeight: FONT_WEIGHT.semibold },

  // Participants
  participantRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.sm,
  },
  participantRowActive: { borderColor: COLORS.primary + '70', backgroundColor: 'rgba(59,130,246,0.05)' },
  participantName:      { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  participantRight:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  shareText:            { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  checkbox:             { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn:           { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark:            { color: COLORS.white, fontSize: 12, fontWeight: FONT_WEIGHT.bold },

  // Custom amount input row
  customInputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 4, marginBottom: 4, paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  customInputLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text3, flex: 1 },
  customInput: {
    width: 100, paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border2,
    color: COLORS.text, fontSize: FONT_SIZE.md,
    textAlign: 'right', fontWeight: FONT_WEIGHT.semibold,
  },

  // Split summary
  splitSummary: {
    borderWidth: 1, borderRadius: RADIUS.md,
    padding: SPACING.md, gap: 4,
  },
  splitSummaryText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },

  // Preview
  previewRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  previewName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  previewAmt:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.heavy, color: COLORS.text },
  previewTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 10,
  },
  previewTotalLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  previewTotalAmt:   { fontSize: 18, fontWeight: FONT_WEIGHT.heavy, color: COLORS.text },

  err: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
  },
  datePickerText: {
    flex: 1,
    fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: FONT_WEIGHT.medium,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  calendarModal: {
    backgroundColor: '#111520',
    borderRadius: 18,
    borderWidth: 1, borderColor: '#242a3d',
    padding: 20, width: '100%',
  },
  calMonthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  calMonthLabel: {
    fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text,
  },
  calDowRow: {
    flexDirection: 'row', marginBottom: 6,
  },
  calDow: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3, paddingVertical: 4,
  },
  calWeekRow: {
    flexDirection: 'row',
  },
  calDayCell: {
    flex: 1, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, margin: 1,
  },
  calDaySelected: {
    backgroundColor: '#3b82f6',
  },
  calDayDisabled: {
    opacity: 0.3,
  },
  calDayText: {
    fontSize: FONT_SIZE.base, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium,
  },
  calDayTextSelected: {
    color: '#ffffff', fontWeight: FONT_WEIGHT.bold,
  },
});