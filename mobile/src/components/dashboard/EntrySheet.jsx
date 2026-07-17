// SplitEase/mobile/src/components/dashboard/EntrySheet.jsx

import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
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

export default function EntrySheet({
  title, requireAmount, defaultAmount, defaultTime,
  isGroup, groupId, onClose, onSubmit,
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : '');
  const [date, setDate] = useState(todayStr());
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.sheetContainer}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>{title}</Text>

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

              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                <Button
                  title={saving ? 'Saving…' : 'Confirm →'}
                  onPress={submit}
                  loading={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    maxHeight: '85%',
  },
  scrollContent: { padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 40 : 30, gap: SPACING.md },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
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
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});