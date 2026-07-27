// SplitEase/mobile/src/components/quickEntry/EntryForm.jsx
//
// Shared form body used by EntrySheet (modal) and PayBillScreen (full
// screen) — same fields, same validation, same payload shape, so the
// two presentations never drift out of sync with each other.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import client from '../../api/client';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import DatePickerInput from '../common/DatePickerInput';
import Button from '../common/Button';
import { Avatar } from '../common/Ui';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function EntryForm({
  requireAmount, defaultAmount, defaultTime, initialDate,
  isGroup, groupId, onSubmit, onCancel, submitLabel = 'Confirm →',
  beforeFields, contentContainerStyle,
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : '');
  const [date, setDate] = useState(initialDate || todayStr());
  const [showFullDate, setShowFullDate] = useState(false);
  const [note, setNote] = useState('');
  const [members, setMembers] = useState([]);
  const [payerId, setPayerId] = useState(user?.user_id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isGroup && groupId) {
      client.get(ENDPOINTS.groupMembers(groupId))
        .then(({ data }) => setMembers(data || []))
        .catch(() => setMembers([]));
    }
  }, [isGroup, groupId]);

  async function submit() {
    const amt = parseFloat(amount);
    if (requireAmount && (!amount || isNaN(amt) || amt <= 0)) {
      setErr('Enter a valid amount');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await onSubmit({
        amount: amount ? amt : undefined,
        expense_date: date,
        expense_time: defaultTime || undefined,
        payer_id: isGroup ? payerId : undefined,
        note: note.trim() || undefined,
      });
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {beforeFields && <View style={styles.header}>{beforeFields}</View>}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.field}>
        <Text style={styles.label}>AMOUNT</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(v) => { setAmount(v); setErr(''); }}
            placeholder="0.00"
            placeholderTextColor={COLORS.text3}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>DATE</Text>
        {!showFullDate ? (
          <View style={styles.dateToggleRow}>
            <TouchableOpacity
              style={[styles.dateChip, date === todayStr() && styles.dateChipActive]}
              onPress={() => setDate(todayStr())}
            >
              <Text style={[styles.dateChipText, date === todayStr() && styles.dateChipTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateChip, date === yesterdayStr() && styles.dateChipActive]}
              onPress={() => setDate(yesterdayStr())}
            >
              <Text style={[styles.dateChipText, date === yesterdayStr() && styles.dateChipTextActive]}>Yesterday</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateChip} onPress={() => setShowFullDate(true)}>
              <Text style={styles.dateChipText}>Pick date…</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DatePickerInput value={date} onChange={setDate} accentColor={COLORS.primary} />
        )}
      </View>

      {isGroup && members.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>PAID BY</Text>
          <View style={styles.payerRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                style={[styles.payerChip, payerId === m.user_id && styles.payerChipActive]}
                onPress={() => setPayerId(m.user_id)}
              >
                <Avatar name={m.name} size={20} />
                <Text style={[styles.payerChipText, payerId === m.user_id && styles.payerChipTextActive]}>
                  {m.user_id === user.user_id ? 'You' : m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>NOTE — optional</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Any extra details…"
          placeholderTextColor={COLORS.text3}
        />
      </View>

      {!!err && <Text style={styles.err}>{err}</Text>}
      </ScrollView>

      <View style={styles.actions}>
        {onCancel && <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />}
        <Button
          title={saving ? 'Saving…' : submitLabel}
          onPress={submit}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md, gap: SPACING.md },
  field: { gap: SPACING.xs },
  label: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 0.8 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base,
  },
  amountSymbol: { fontSize: 24, color: COLORS.text3, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text, paddingVertical: 10 },
  dateToggleRow: { flexDirection: 'row', gap: SPACING.sm },
  dateChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  dateChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  dateChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  dateChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  payerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  payerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  payerChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  payerChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  payerChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  noteInput: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  err: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  actions: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
});