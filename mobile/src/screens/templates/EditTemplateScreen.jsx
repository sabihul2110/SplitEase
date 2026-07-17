// SplitEase/mobile/src/screens/templates/EditTemplateScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as quickTemplatesApi from '../../api/quickTemplates';
import * as groupsApi from '../../api/groups';
import client from '../../api/client';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import ScreenHeader from '../../components/layout/ScreenHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Avatar } from '../../components/common/Ui';
import { Icons } from '../../components/icons/icons';
import { ICON_PICKER, TemplateIcon } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

export default function EditTemplateScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const editing = route.params?.template || null;
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name || '');
  const [iconName, setIconName] = useState(editing?.icon_name || ICON_PICKER[0].key);
  const [groupId, setGroupId] = useState(editing?.group_id || null);
  const [groups, setGroups] = useState([]);
  const [isFixed, setIsFixed] = useState(editing ? editing.default_amount != null : true);
  const [amount, setAmount] = useState(editing?.default_amount != null ? String(editing.default_amount) : '');
  const [time, setTime] = useState(editing?.default_time?.slice(0, 5) || '09:00');
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

  function equalShareLabel() {
    if (!members.length) return '';
    return `${(100 / members.length).toFixed(1)}% each`;
  }

  function customTotal() {
    return members.reduce((sum, m) => sum + (parseFloat(splitPct[m.user_id]) || 0), 0);
  }

  async function submit() {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!categoryId) e.category = 'Pick a category';
    if (isFixed && (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) e.amount = 'Enter a valid amount';
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
        default_amount: isFixed ? parseFloat(amount) : null,
        default_time: time.length === 5 ? `${time}:00` : time,
        group_id: groupId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        split_type: groupId ? splitType : 'equal',
        split_config: groupId && splitType === 'custom'
          ? members.map((m) => ({ user_id: m.user_id, share_pct: parseFloat(splitPct[m.user_id] || 0) }))
          : null,
      };
      if (isEdit) {
        await quickTemplatesApi.updateTemplate(editing.template_id, payload);
      } else {
        await quickTemplatesApi.createTemplate(payload);
      }
      navigation.goBack();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={isEdit ? 'Edit Template' : 'New Template'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Metro, Lunch, Electrician" />

          <View style={styles.field}>
            <Text style={styles.label}>ICON</Text>
            <View style={styles.iconGrid}>
              {ICON_PICKER.map((opt) => {
                const isActive = iconName === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.iconOpt, isActive && styles.iconOptActive]}
                    onPress={() => setIconName(opt.key)}
                  >
                    <TemplateIcon name={opt.key} size={18} color={isActive ? COLORS.primary : COLORS.text3} />
                  </TouchableOpacity>
                );
              })}
            </View>
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
            <Text style={styles.label}>AMOUNT</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity style={[styles.chip, isFixed && styles.chipActive]} onPress={() => setIsFixed(true)}>
                <Text style={[styles.chipText, isFixed && styles.chipTextActive]}>Fixed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, !isFixed && styles.chipActive]} onPress={() => setIsFixed(false)}>
                <Text style={[styles.chipText, !isFixed && styles.chipTextActive]}>Variable (enter each time)</Text>
              </TouchableOpacity>
            </View>
            {isFixed && (
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.text3}
                keyboardType="decimal-pad"
              />
            )}
          </View>

          <Input label="Default Time (24h)" value={time} onChangeText={setTime} placeholder="HH:MM" />

          {groupId && (
            <View style={styles.field}>
              <Text style={styles.label}>SPLIT</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity style={[styles.chip, splitType === 'equal' && styles.chipActive]} onPress={() => setSplitType('equal')}>
                  <Text style={[styles.chipText, splitType === 'equal' && styles.chipTextActive]}>Equal {equalShareLabel()}</Text>
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

          <Button title={saving ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Template →'} onPress={submit} loading={saving} fullWidth size="lg" />
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
  iconOptActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  chipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  amountInput: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONT_SIZE.lg, color: COLORS.text, fontWeight: FONT_WEIGHT.bold,
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