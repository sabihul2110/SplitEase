// SplitEase/mobile/src/screens/expenses/AddPaymentScreen.jsx

/**
 * AddPaymentScreen.jsx
 * Record a settlement payment within a group.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
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

  // Pre-select payer as current user
  const otherMembers = members.filter(m => m.user_id !== user.user_id);

  const [payerId,  setPayerId]  = useState(user.user_id);
  const [payeeId,  setPayeeId]  = useState(otherMembers[0]?.user_id || null);
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!amount || isNaN(parseFloat(amount))) e.amount = 'Enter a valid amount';
    if (parseFloat(amount) <= 0)              e.amount = 'Amount must be greater than 0';
    if (!payeeId)                             e.payee  = 'Select who received the payment';
    if (payerId === payeeId)                  e.payee  = 'Payer and payee must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await client.post(ENDPOINTS.settlements(groupId).replace('/simplified', '').replace('/settlements/', '/payments/'), {
        payer_id:     payerId,
        payee_id:     payeeId,
        amount:       parseFloat(amount),
        note:         note.trim() || undefined,
        payment_date: new Date().toISOString().split('T')[0],
      });
      navigation.goBack();
    } catch (err) {
      // Fallback: try the payments endpoint directly
      try {
        await client.post(`/payments/${groupId}`, {
          payer_id:     payerId,
          payee_id:     payeeId,
          amount:       parseFloat(amount),
          note:         note.trim() || undefined,
          payment_date: new Date().toISOString().split('T')[0],
        });
        navigation.goBack();
      } catch (err2) {
        Alert.alert('Error', err2.response?.data?.detail || 'Failed to record payment');
      }
    } finally {
      setLoading(false);
    }
  }

  function MemberSelector({ label, selectedId, onSelect, excludeId }) {
    const opts = members.filter(m => m.user_id !== excludeId);
    return (
      <View style={styles.selector}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <View style={styles.memberChips}>
          {opts.map(m => (
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Record Payment" subtitle={groupName} showBack />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview card */}
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Avatar name={members.find(m => m.user_id === payerId)?.name || ''} size={44} />
              <View style={styles.previewArrow}>
                <Text style={styles.previewArrowLine}>─────────────</Text>
                <Text style={styles.previewAmount}>
                  {amount ? `₹${parseFloat(amount).toFixed(2)}` : '₹—'}
                </Text>
                <Text style={styles.previewArrowHead}>→</Text>
              </View>
              <Avatar name={members.find(m => m.user_id === payeeId)?.name || '?'} size={44} />
            </View>
            <Text style={styles.previewLabel}>
              {members.find(m => m.user_id === payerId)?.name || '—'}
              {' paid '}
              {members.find(m => m.user_id === payeeId)?.name || '—'}
            </Text>
          </View>

          <MemberSelector
            label="WHO PAID"
            selectedId={payerId}
            onSelect={setPayerId}
            excludeId={null}
          />

          <MemberSelector
            label="WHO RECEIVED"
            selectedId={payeeId}
            onSelect={id => { setPayeeId(id); setErrors(e => ({...e, payee: null})); }}
            excludeId={null}
          />
          {errors.payee && <Text style={styles.error}>{errors.payee}</Text>}

          <Input
            label="Amount (₹)"
            value={amount}
            onChangeText={v => { setAmount(v); setErrors(e => ({...e, amount: null})); }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.amount}
          />

          <Input
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Via UPI"
            autoCapitalize="sentences"
          />

          <Button
            title={loading ? 'Recording…' : 'Record Payment'}
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
  kav:    { flex: 1 },
  scroll: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING['2xl'] },

  previewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
  },
  previewRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  previewArrow: { alignItems: 'center', flex: 1 },
  previewArrowLine: { color: COLORS.border2, fontSize: 10 },
  previewArrowHead: { color: COLORS.success, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginTop: -8 },
  previewAmount:    { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.success, marginVertical: 2 },
  previewLabel:     { fontSize: FONT_SIZE.sm, color: COLORS.text2 },

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
  memberChipActive: { borderColor: COLORS.primary, backgroundColor: '#1d3a7a' },
  chipName:         { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  chipNameActive:   { color: COLORS.primaryH },
  error:            { fontSize: FONT_SIZE.sm, color: COLORS.danger },
});