// SplitEase/mobile/src/screens/expenses/AddPaymentScreen.jsx
//
// Fixed: POST endpoint is now /payments/:groupId directly,
// matching the web app's api.post(`/payments/${id}`, ...).

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar } from '../../components/common/ui';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';

export default function AddPaymentScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName, members = [] } = route.params;

  const [payerId,  setPayerId]  = useState(user.user_id);
  const [payeeId,  setPayeeId]  = useState(
    members.find(m => m.user_id !== user.user_id)?.user_id || null
  );
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      e.amount = 'Enter a valid amount greater than 0';
    if (!payeeId)
      e.payee = 'Select who received the payment';
    if (payerId === payeeId)
      e.payee = 'Payer and receiver must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      // Matches web: api.post(`/payments/${id}`, { payer_id, payee_id, amount, note, payment_date })
      await client.post(`/payments/${groupId}`, {
        payer_id:     payerId,
        payee_id:     payeeId,
        amount:       parseFloat(amount),
        note:         note.trim() || null,
        payment_date: new Date().toISOString().split('T')[0],
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }

  function MemberSelector({ label, selectedId, onSelect }) {
    return (
      <View style={styles.selector}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <View style={styles.memberChips}>
          {members.map(m => (
            <TouchableOpacity
              key={m.user_id}
              style={[styles.memberChip, selectedId === m.user_id && styles.memberChipActive]}
              onPress={() => onSelect(m.user_id)}
            >
              <Avatar name={m.name} size={28} />
              <Text style={[styles.chipName, selectedId === m.user_id && styles.chipNameActive]}>
                {m.user_id === user.user_id ? 'You' : m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const payerName = members.find(m => m.user_id === payerId)?.name || '—';
  const payeeName = members.find(m => m.user_id === payeeId)?.name || '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Record Payment" subtitle={groupName} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Live preview — mirrors web */}
          {payerId && payeeId && amount ? (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Avatar name={payerName} size={44} />
                <View style={styles.previewArrow}>
                  <Text style={styles.previewAmountText}>
                    ₹{parseFloat(amount || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.arrowLine}>──────→</Text>
                </View>
                <Avatar name={payeeName} size={44} />
              </View>
              <Text style={styles.previewLabel}>
                <Text style={{ color: COLORS.text, fontWeight: FONT_WEIGHT.semibold }}>{payerName}</Text>
                <Text style={{ color: COLORS.text2 }}> pays </Text>
                <Text style={{ color: COLORS.success, fontWeight: FONT_WEIGHT.semibold }}>{payeeName}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.previewCardEmpty}>
              <Text style={styles.previewEmptyText}>Fill in the details below to preview</Text>
            </View>
          )}

          <MemberSelector
            label="WHO PAID (SENDER)"
            selectedId={payerId}
            onSelect={id => { setPayerId(id); setErrors(p => ({...p, payee: null})); }}
          />

          <View>
            <MemberSelector
              label="PAID TO (RECEIVER)"
              selectedId={payeeId}
              onSelect={id => { setPayeeId(id); setErrors(p => ({...p, payee: null})); }}
            />
            {!!errors.payee && <Text style={styles.error}>{errors.payee}</Text>}
          </View>

          <Input
            label="Amount (₹)"
            value={amount}
            onChangeText={v => { setAmount(v); setErrors(p => ({...p, amount: null})); }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.amount}
          />

          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. via GPay, cash…"
            autoCapitalize="sentences"
          />

          <Button
            title={loading ? 'Recording…' : 'Record Payment →'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            variant="success"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING['2xl'] },

  previewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    backgroundColor: 'rgba(16,185,129,0.06)',
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  previewCardEmpty: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    padding: SPACING.xl, alignItems: 'center',
  },
  previewEmptyText: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  previewRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, width: '100%', justifyContent: 'center' },
  previewArrow:     { alignItems: 'center', flex: 1 },
  previewAmountText:{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.heavy, color: COLORS.success },
  arrowLine:        { fontSize: FONT_SIZE.sm, color: COLORS.text3, marginTop: 2 },
  previewLabel:     { fontSize: FONT_SIZE.base },

  selector:      { gap: SPACING.sm },
  selectorLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3, letterSpacing: 1,
  },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  memberChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  chipName:         { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  chipNameActive:   { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  error:            { fontSize: FONT_SIZE.sm, color: COLORS.danger, marginTop: 4 },
});