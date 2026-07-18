// SplitEase/mobile/src/screens/bills/EditBillScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as recurringBillsApi from '../../api/recurringBills';
import * as groupsApi from '../../api/groups';
import client from '../../api/client';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import ScreenHeader from '../../components/layout/ScreenHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Avatar } from '../../components/common/Ui';
import { Icons } from '../../components/icons';
import { ICON_GROUPS } from '../../constants/templateIcons';
import IconPickerGrid from '../../components/common/IconPickerGrid';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

export default function EditBillScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const editing = route.params?.bill || null;
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name || '');
  const [iconName, setIconName] = useState(editing?.icon_name || ICON_GROUPS[0].items[0].key);
  const [groupId, setGroupId] = useState(editing?.group_id || null);
  const [groups, setGroups] = useState([]);
  const [cronDay, setCronDay] = useState(editing ? String(editing.cron_day) : '1');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(editing?.category_id || null);
  const [subcats, setSubcats] = useState([]);
  const [subcategoryId, setSubcategoryId] = useState(editing?.subcategory_id || null);
  const [splitType, setSplitType] = useState(editing?.split_type || 'equal');
  const [members, setMembers] = useState([]);
  const [splitPct, setSplitPct] = useState(
    editing?.split_config
      ? Object.fromEntries(editing.split_config.map((c) => [c.user_id, String(c.share_pct)]))
      : {}
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    groupsApi.getGroups().then(({ data }) => setGroups(data || [])).catch(() => {});
    groupsApi.getCategories().then(({ data }) => {
      setCategories(data || []);
      if (editing?.category_id) loadSubcats(editing.category_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (groupId) {
      client.get(ENDPOINTS.groupMembers(groupId))
        .then(({ data }) => setMembers(data || []))
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
      setSplitType('equal');
    }
  }, [groupId]);

  async function loadSubcats(catId) {
    try {
      const { data } = await groupsApi.getSubcategories(catId);
      setSubcats(data || []);
    } catch { setSubcats([]); }
  }

  function handlePickCategory(cat) {
    setCategoryId(cat.category_id);
    setSubcategoryId(null);
    loadSubcats(cat.category_id);
  }

  function customTotal() {
    return members.reduce((sum, m) => sum + (parseFloat(splitPct[m.user_id]) || 0), 0);
  }

  async function submit() {
    const day = parseInt(cronDay, 10);
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!categoryId) e.category = 'Pick a category';
    if (!day || day < 1 || day > 31) e.cron = 'Day must be 1-31';
    if (groupId && splitType === 'custom' && Math.abs(customTotal() - 100) > 0.5) e.split = 'Percentages must sum to 100';
    if (Object.keys(e).length) {
      setErr(Object.values(e)[0]);
      return;
    }
    setErr('');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        icon_name: iconName,
        group_id: groupId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        cron_day: day,
        split_type: groupId ? splitType : 'equal',
        split_config: groupId && splitType === 'custom'
          ? members.map((m) => ({ user_id: m.user_id, share_pct: parseFloat(splitPct[m.user_id] || 0) }))
          : null,
      };
      if (isEdit) {
        await recurringBillsApi.updateBill(editing.bill_id, payload);
      } else {
        await recurringBillsApi.createBill(payload);
      }
      navigation.goBack();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save bill.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={isEdit ? 'Edit Recurring Bill' : 'New Recurring Bill'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Rent, WiFi, Electricity" />

          <View style={styles.field}>
            <Text style={styles.label}>ICON</Text>
            <IconPickerGrid value={iconName} onChange={setIconName} activeColor={COLORS.warning} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SCOPE</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity style={[styles.chip, !groupId && styles.chipActive]} onPress={() => setGroupId(null)}>
                <Text style={[styles.chipText, !groupId && styles.chipTextActive]}>Personal</Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.group_id}
                  style={[styles.chip, groupId === g.group_id && styles.chipActive]}
                  onPress={() => setGroupId(g.group_id)}
                >
                  <Text style={[styles.chipText, groupId === g.group_id && styles.chipTextActive]}>{g.group_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.chipsRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.category_id}
                  style={[styles.chip, categoryId === cat.category_id && styles.chipActive]}
                  onPress={() => handlePickCategory(cat)}
                >
                  <Text style={[styles.chipText, categoryId === cat.category_id && styles.chipTextActive]}>
                    {cat.category_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {subcats.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>SUBCATEGORY</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, subcategoryId === null && styles.chipActive]}
                  onPress={() => setSubcategoryId(null)}
                >
                  <Text style={[styles.chipText, subcategoryId === null && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {subcats.map((s) => (
                  <TouchableOpacity
                    key={s.subcategory_id}
                    style={[styles.chip, subcategoryId === s.subcategory_id && styles.chipActive]}
                    onPress={() => setSubcategoryId(s.subcategory_id)}
                  >
                    <Text style={[styles.chipText, subcategoryId === s.subcategory_id && styles.chipTextActive]}>
                      {s.subcategory_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>DUE DAY OF MONTH (1-31)</Text>
            <TextInput
              style={styles.dayInput}
              value={cronDay}
              onChangeText={setCronDay}
              placeholder="1"
              placeholderTextColor={COLORS.text3}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.hint}>Short months clamp to their last day automatically.</Text>
          </View>

          {groupId && (
            <View style={styles.field}>
              <Text style={styles.label}>SPLIT</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity style={[styles.chip, splitType === 'equal' && styles.chipActive]} onPress={() => setSplitType('equal')}>
                  <Text style={[styles.chipText, splitType === 'equal' && styles.chipTextActive]}>Equal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, splitType === 'custom' && styles.chipActive]} onPress={() => setSplitType('custom')}>
                  <Text style={[styles.chipText, splitType === 'custom' && styles.chipTextActive]}>Custom %</Text>
                </TouchableOpacity>
              </View>

              {splitType === 'custom' && members.map((m) => (
                <View key={m.user_id} style={styles.splitRow}>
                  <Avatar name={m.name} size={24} />
                  <Text style={styles.splitName}>{m.user_id === user.user_id ? 'You' : m.name}</Text>
                  <TextInput
                    style={styles.splitInput}
                    value={splitPct[m.user_id] || ''}
                    onChangeText={(v) => setSplitPct((p) => ({ ...p, [m.user_id]: v }))}
                    placeholder="0"
                    placeholderTextColor={COLORS.text3}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.splitPct}>%</Text>
                </View>
              ))}
              {splitType === 'custom' && (
                <Text style={[styles.hint, Math.abs(customTotal() - 100) > 0.5 && { color: COLORS.danger }]}>
                  Total: {customTotal().toFixed(1)}% (must equal 100%)
                </Text>
              )}
            </View>
          )}

          {!!err && <Text style={styles.err}>{err}</Text>}

          <Button title={saving ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Bill →'} onPress={submit} loading={saving} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 60 + TAB_BAR_HEIGHT },
  field: { gap: SPACING.sm },
  label: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 0.8 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  iconOpt: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconOptActive: { borderColor: COLORS.warning, backgroundColor: 'rgba(245,158,11,0.12)' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  chipActive: { borderColor: COLORS.warning, backgroundColor: 'rgba(245,158,11,0.12)' },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  chipTextActive: { color: COLORS.warning, fontWeight: FONT_WEIGHT.semibold },
  dayInput: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONT_SIZE.lg, color: COLORS.text, fontWeight: FONT_WEIGHT.bold, width: 90,
  },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 4 },
  splitName: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text },
  splitInput: {
    width: 60, textAlign: 'right', backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border2, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 6, color: COLORS.text, fontSize: FONT_SIZE.sm,
  },
  splitPct: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 4 },
  err: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
});