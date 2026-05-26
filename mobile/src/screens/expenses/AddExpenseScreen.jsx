// SplitEase/mobile/src/screens/expenses/AddExpenseScreen.jsx

/**
 * AddExpenseScreen.jsx
 *
 * Add an expense to a group with equal or custom split.
 * Mirrors the web app's AddExpense page.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, Badge, Card, Divider } from '../../components/common/ui';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';

const CATEGORIES = [
  { id: 1, name: 'Travel',          emoji: '✈️' },
  { id: 2, name: 'Accommodation',   emoji: '🏨' },
  { id: 3, name: 'Food & Dining',   emoji: '🍽️' },
  { id: 4, name: 'Activities',      emoji: '🎉' },
  { id: 5, name: 'Utilities',       emoji: '💡' },
  { id: 6, name: 'Groceries',       emoji: '🛒' },
];

export default function AddExpenseScreen() {
  const { user }   = useAuth();
  const navigation = useNavigation();
  const route      = useRoute();
  const { groupId, groupName, members = [] } = route.params;

  const [description,   setDescription]   = useState('');
  const [amount,        setAmount]        = useState('');
  const [categoryId,    setCategoryId]    = useState(3);   // Food & Dining default
  const [splitType,     setSplitType]     = useState('equal');
  const [participants,  setParticipants]  = useState(members.map(m => m.user_id));
  const [customAmounts, setCustomAmounts] = useState({});
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState({});

  // Initialise custom amounts when amount or participants change
  useEffect(() => {
    if (splitType === 'equal' || !amount) return;
    const share = participants.length > 0
      ? (parseFloat(amount) / participants.length).toFixed(2)
      : '0';
    const map = {};
    participants.forEach(id => { map[id] = share; });
    setCustomAmounts(map);
  }, [splitType, amount, participants.join(',')]);

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
    return Object.values(customAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  }

  function validate() {
    const e = {};
    if (!description.trim())      e.description = 'Description is required';
    if (!amount || isNaN(parseFloat(amount))) e.amount = 'Enter a valid amount';
    if (parseFloat(amount) <= 0)  e.amount      = 'Amount must be greater than 0';
    if (participants.length === 0) e.participants = 'Select at least one participant';
    if (splitType === 'custom') {
      const diff = Math.abs(customTotal() - parseFloat(amount));
      if (diff > 0.01) e.custom = `Split total ₹${customTotal().toFixed(2)} doesn't match ₹${parseFloat(amount).toFixed(2)}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const totalAmt = parseFloat(amount);
      const splits   = splitType === 'equal'
        ? participants.map(uid => ({
            user_id:    uid,
            amount_owed: totalAmt / participants.length,
            share_pct:   100 / participants.length,
          }))
        : participants.map(uid => ({
            user_id:     uid,
            amount_owed: parseFloat(customAmounts[uid]) || 0,
            share_pct:   ((parseFloat(customAmounts[uid]) || 0) / totalAmt) * 100,
          }));

      await client.post(ENDPOINTS.addExpense(groupId), {
        payer_id:    user.user_id,
        category_id: categoryId,
        total_amount: totalAmt,
        description:  description.trim(),
        split_type:   splitType,
        splits,
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Add Expense" subtitle={groupName} showBack />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic info */}
          <View style={styles.section}>
            <Input
              label="Description"
              value={description}
              onChangeText={v => { setDescription(v); setErrors(e => ({...e, description: null})); }}
              placeholder="e.g. Dinner at Spice Garden"
              autoCapitalize="sentences"
              error={errors.description}
            />
            <Input
              label="Total Amount (₹)"
              value={amount}
              onChangeText={v => { setAmount(v); setErrors(e => ({...e, amount: null})); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount}
            />
          </View>

          <Divider />

          {/* Category picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, categoryId === cat.id && styles.catChipActive]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.catName, categoryId === cat.id && styles.catNameActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <Divider />

          {/* Split type toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SPLIT TYPE</Text>
            <View style={styles.splitToggle}>
              {['equal', 'custom'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.splitBtn, splitType === type && styles.splitBtnActive]}
                  onPress={() => setSplitType(type)}
                >
                  <Text style={[styles.splitBtnText, splitType === type && styles.splitBtnTextActive]}>
                    {type === 'equal' ? '⚖️ Equal' : '✏️ Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Divider />

          {/* Participants */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PARTICIPANTS</Text>
            {errors.participants && <Text style={styles.error}>{errors.participants}</Text>}
            <View style={styles.participantList}>
              {members.map(member => {
                const isSelected = participants.includes(member.user_id);
                return (
                  <TouchableOpacity
                    key={member.user_id}
                    style={[styles.participantRow, isSelected && styles.participantRowActive]}
                    onPress={() => toggleParticipant(member.user_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.participantLeft}>
                      <Avatar name={member.name} size={32} />
                      <Text style={styles.participantName}>
                        {member.user_id === user.user_id ? `${member.name} (you)` : member.name}
                      </Text>
                    </View>
                    <View style={styles.participantRight}>
                      {splitType === 'equal' ? (
                        <Text style={[styles.shareText, { color: isSelected ? COLORS.success : COLORS.text3 }]}>
                          {isSelected ? `₹${equalShare()}` : '—'}
                        </Text>
                      ) : isSelected ? (
                        <Input
                          value={customAmounts[member.user_id] || ''}
                          onChangeText={v => setCustomAmounts(prev => ({ ...prev, [member.user_id]: v }))}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                          style={styles.customInput}
                          inputStyle={styles.customInputText}
                        />
                      ) : (
                        <Text style={styles.shareText}>—</Text>
                      )}
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {splitType === 'custom' && amount && (
              <View style={styles.customSummary}>
                <Text style={styles.customSummaryText}>
                  Assigned: ₹{customTotal().toFixed(2)} / ₹{parseFloat(amount || 0).toFixed(2)}
                </Text>
                {errors.custom && <Text style={styles.error}>{errors.custom}</Text>}
              </View>
            )}
          </View>

          {/* Submit */}
          <Button
            title={loading ? 'Adding…' : 'Add Expense'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  kav:     { flex: 1 },
  scroll:  { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING['2xl'] },
  section: { gap: SPACING.md },
  sectionLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3, letterSpacing: 1,
  },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm },
  catChip: {
    alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: '#1d3a7a' },
  catEmoji:      { fontSize: 20 },
  catName:       { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  catNameActive: { color: COLORS.primaryH },

  splitToggle:  { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 3 },
  splitBtn:     { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.sm },
  splitBtnActive: { backgroundColor: COLORS.primary },
  splitBtnText:   { fontSize: FONT_SIZE.base, color: COLORS.text2 },
  splitBtnTextActive: { color: COLORS.white, fontWeight: FONT_WEIGHT.semibold },

  participantList: { gap: SPACING.sm },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  participantRowActive: { borderColor: COLORS.primary + '80' },
  participantLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  participantName:  { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  participantRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  shareText:        { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2 },
  customInput:      { width: 80 },
  customInputText:  { fontSize: FONT_SIZE.base, textAlign: 'right' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark:        { color: COLORS.white, fontSize: 12, fontWeight: FONT_WEIGHT.bold },

  customSummary:     { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md },
  customSummaryText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  error:             { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  submitBtn:         { marginTop: SPACING.sm },
});