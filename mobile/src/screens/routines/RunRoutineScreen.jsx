// SplitEase/mobile/src/screens/routines/RunRoutineScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as routinesApi from '../../api/routines';
import ScreenHeader from '../../components/layout/ScreenHeader';
import Button from '../../components/common/Button';
import DatePickerInput from '../../components/common/DatePickerInput';
import { TemplateIcon } from '../../constants/templateIcons';
import { LoadingState } from '../../components/common/Ui';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function RunRoutineScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { routineId } = route.params;

  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [showFullDate, setShowFullDate] = useState(false);
  const [state, setState] = useState({}); // { [template_id]: { include, amount } }
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    routinesApi.getRoutine(routineId).then(({ data }) => {
      setRoutine(data);
      const init = {};
      data.items.forEach((it) => {
        init[it.template_id] = {
          include: !!it.default_included,
          amount: it.default_amount != null ? String(it.default_amount) : '',
        };
      });
      setState(init);
      setLoading(false);
    });
  }, [routineId]);

  function toggle(templateId) {
    setState((p) => ({ ...p, [templateId]: { ...p[templateId], include: !p[templateId].include } }));
  }

  function setAmount(templateId, v) {
    setState((p) => ({ ...p, [templateId]: { ...p[templateId], amount: v } }));
  }

  async function submit() {
    setSaving(true);
    try {
      const items = routine.items.map((it) => ({
        template_id: it.template_id,
        include: !!state[it.template_id]?.include,
        amount: state[it.template_id]?.amount ? parseFloat(state[it.template_id].amount) : null,
      }));
      const { data } = await routinesApi.executeRoutine(routineId, { expense_date: date, items });
      setResult(data);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !routine) return <LoadingState label="Loading routine…" />;

  if (routine.items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader title={routine.name} showBack />
        <View style={styles.resultWrap}>
          <Text style={styles.resultTitle}>No templates left in this routine</Text>
          <Text style={styles.emptyBodyText}>
            Every template in "{routine.name}" has been deleted. Edit the routine to add templates back, or delete it.
          </Text>
          <Button title="Edit Routine" onPress={() => navigation.replace('EditRoutine', { routine })} fullWidth size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  const includedCount = Object.values(state).filter((s) => s.include).length;

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Done" showBack />
        <View style={styles.resultWrap}>
          <Text style={styles.resultTitle}>Logged {result.created.length} entries</Text>
          {result.errors.length > 0 && (
            <View style={styles.errBox}>
              {result.errors.map((e, i) => <Text key={i} style={styles.errLine}>{e}</Text>)}
            </View>
          )}
          <Button title="Done" onPress={() => navigation.navigate('ExpensesHome')} fullWidth size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={routine.name} subtitle={`${includedCount} of ${routine.items.length} selected`} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>DATE</Text>
            {!showFullDate ? (
              <View style={styles.dateToggleRow}>
                <TouchableOpacity style={[styles.dateChip, date === todayStr() && styles.dateChipActive]} onPress={() => setDate(todayStr())}>
                  <Text style={[styles.dateChipText, date === todayStr() && styles.dateChipTextActive]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateChip, date === yesterdayStr() && styles.dateChipActive]} onPress={() => setDate(yesterdayStr())}>
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

          {routine.items.map((it) => {
            const s = state[it.template_id] || { include: false, amount: '' };
            const isFixed = it.default_amount != null;
            return (
              <TouchableOpacity
                key={it.template_id}
                style={[styles.itemRow, s.include && styles.itemRowActive]}
                onPress={() => toggle(it.template_id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, s.include && styles.checkboxOn]}>
                  {s.include && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemIcon}><TemplateIcon name={it.icon_name} size={16} color={COLORS.primary} /></View>
                <Text style={styles.itemName}>{it.name}</Text>
                {s.include && (
                  isFixed ? (
                    <Text style={styles.itemAmtFixed}>₹{it.default_amount}</Text>
                  ) : (
                    <TextInput
                      style={styles.itemAmtInput}
                      value={s.amount}
                      onChangeText={(v) => setAmount(it.template_id, v)}
                      placeholder="₹0.00"
                      placeholderTextColor={COLORS.text3}
                      keyboardType="decimal-pad"
                    />
                  )
                )}
              </TouchableOpacity>
            );
          })}

          <Button
            title={saving ? 'Logging…' : `Confirm ${includedCount} entries →`}
            onPress={submit}
            loading={saving}
            disabled={includedCount === 0}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 60 + TAB_BAR_HEIGHT },
  field: { gap: SPACING.sm, marginBottom: SPACING.sm },
  label: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 0.8 },
  dateToggleRow: { flexDirection: 'row', gap: SPACING.sm },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  dateChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  dateChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  dateChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  itemRowActive: { borderColor: COLORS.primary + '70', backgroundColor: 'rgba(59,130,246,0.05)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 12, fontWeight: FONT_WEIGHT.bold },
  itemIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  itemAmtFixed: { fontSize: FONT_SIZE.sm, color: COLORS.text3, fontWeight: FONT_WEIGHT.semibold },
  itemAmtInput: {
    width: 80, textAlign: 'right', backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border2, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 6, color: COLORS.text, fontSize: FONT_SIZE.sm,
  },
  resultWrap: { padding: SPACING.lg, gap: SPACING.md },
  resultTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  emptyBodyText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, lineHeight: 19 },
  errBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  errLine: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
});