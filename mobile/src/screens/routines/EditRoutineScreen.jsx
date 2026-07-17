// SplitEase/mobile/src/screens/routines/EditRoutineScreen.jsx
//
// Build a routine by picking existing Quick_Templates in order. Each
// picked template becomes a Routine_Item with a default_included flag
// (whether it's checked by default when running the routine — e.g.
// "maybe e-rickshaw" legs default OFF).

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as routinesApi from '../../api/routines';
import * as quickTemplatesApi from '../../api/quickTemplates';
import ScreenHeader from '../../components/layout/ScreenHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { TemplateIcon, ICON_GROUPS } from '../../constants/templateIcons';
import IconPickerGrid from '../../components/common/IconPickerGrid';
import { LoadingState } from '../../components/common/Ui';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

const DAYS = [
  { key: 1, label: 'Mon' }, { key: 2, label: 'Tue' }, { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' }, { key: 5, label: 'Fri' }, { key: 6, label: 'Sat' }, { key: 7, label: 'Sun' },
];

export default function EditRoutineScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editing = route.params?.routine || null;
  const isEdit = !!editing;

  const [name, setName] = useState(editing?.name || '');
  const [iconName, setIconName] = useState(editing?.icon_name || ICON_GROUPS[0].items[0].key);
  const [activeDays, setActiveDays] = useState(
    editing?.active_days ? editing.active_days.split(',').map(Number) : [1, 2, 3, 4, 5]
  );
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  // selected: array of { template_id, default_included }, order = array order
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      const { data: templates } = await quickTemplatesApi.getTemplates();
      setAllTemplates(templates || []);

      if (isEdit) {
        const { data: detail } = await routinesApi.getRoutine(editing.routine_id);
        setSelected(
          detail.items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((it) => ({ template_id: it.template_id, default_included: !!it.default_included }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  function toggleDay(day) {
    setActiveDays((p) => (p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort()));
  }

  function isSelected(templateId) {
    return selected.some((s) => s.template_id === templateId);
  }

  function toggleTemplate(templateId) {
    setSelected((p) => {
      if (p.some((s) => s.template_id === templateId)) {
        return p.filter((s) => s.template_id !== templateId);
      }
      return [...p, { template_id: templateId, default_included: true }];
    });
  }

  function toggleDefaultIncluded(templateId) {
    setSelected((p) => p.map((s) =>
      s.template_id === templateId ? { ...s, default_included: !s.default_included } : s
    ));
  }

  function moveItem(templateId, dir) {
    setSelected((p) => {
      const idx = p.findIndex((s) => s.template_id === templateId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= p.length) return p;
      const copy = [...p];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  async function submit() {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (selected.length === 0) e.items = 'Add at least one template';
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
        active_days: activeDays.join(','),
        items: selected.map((s, i) => ({
          template_id: s.template_id,
          sort_order: i,
          default_included: s.default_included,
        })),
      };
      if (isEdit) {
        await routinesApi.updateRoutine(editing.routine_id, payload);
      } else {
        await routinesApi.createRoutine(payload);
      }
      navigation.goBack();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save routine.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading templates…" />;

  const orderedSelected = selected
    .map((s) => ({ ...s, tpl: allTemplates.find((t) => t.template_id === s.template_id) }))
    .filter((s) => s.tpl);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={isEdit ? 'Edit Routine' : 'New Routine'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. College Day" />

          <View style={styles.field}>
            <Text style={styles.label}>ICON</Text>
            <IconPickerGrid value={iconName} onChange={setIconName} activeColor={COLORS.primary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>USUALLY ON — reminder hint only, run anytime</Text>
            <View style={styles.chipsRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dayChip, activeDays.includes(d.key) && styles.dayChipActive]}
                  onPress={() => toggleDay(d.key)}
                >
                  <Text style={[styles.dayChipText, activeDays.includes(d.key) && styles.dayChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {orderedSelected.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>ORDER & DEFAULTS — tap the checkmark to set whether it's included by default when you run this routine</Text>
              {orderedSelected.map((s, i) => (
                <View key={s.template_id} style={styles.selectedRow}>
                  <View style={styles.reorderCol}>
                    <TouchableOpacity disabled={i === 0} onPress={() => moveItem(s.template_id, -1)}>
                      <Text style={[styles.reorderBtn, i === 0 && styles.reorderBtnDisabled]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={i === orderedSelected.length - 1} onPress={() => moveItem(s.template_id, 1)}>
                      <Text style={[styles.reorderBtn, i === orderedSelected.length - 1 && styles.reorderBtnDisabled]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.selectedIcon}><TemplateIcon name={s.tpl.icon_name} size={16} color={COLORS.primary} /></View>
                  <Text style={styles.selectedName}>{s.tpl.name}</Text>
                  <TouchableOpacity
                    style={[styles.defaultToggle, s.default_included && styles.defaultToggleOn]}
                    onPress={() => toggleDefaultIncluded(s.template_id)}
                  >
                    <Text style={[styles.defaultToggleText, s.default_included && styles.defaultToggleTextOn]}>
                      {s.default_included ? 'Default ON' : 'Default OFF'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleTemplate(s.template_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.removeX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>ADD TEMPLATES TO THIS ROUTINE</Text>
            {allTemplates.length === 0 ? (
              <Text style={styles.hint}>No templates yet — create Quick Templates first, then bundle them here.</Text>
            ) : (
              <View style={styles.chipsRow}>
                {allTemplates.filter((t) => !isSelected(t.template_id)).map((t) => (
                  <TouchableOpacity key={t.template_id} style={styles.addTplChip} onPress={() => toggleTemplate(t.template_id)}>
                    <TemplateIcon name={t.icon_name} size={14} color={COLORS.text2} />
                    <Text style={styles.addTplChipText}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {!!err && <Text style={styles.err}>{err}</Text>}

          <Button
            title={saving ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Routine →'}
            onPress={submit}
            loading={saving}
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
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 60 + TAB_BAR_HEIGHT },
  field: { gap: SPACING.sm },
  label: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text3, letterSpacing: 0.5, lineHeight: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  iconOpt: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconOptActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dayChip: {
    width: 44, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  dayChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  dayChipText: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  dayChipTextActive: { color: COLORS.primary },
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm,
    marginBottom: 6,
  },
  reorderCol: { alignItems: 'center' },
  reorderBtn: { fontSize: 10, color: COLORS.text2, paddingVertical: 1 },
  reorderBtnDisabled: { color: COLORS.text3, opacity: 0.3 },
  selectedIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  selectedName: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  defaultToggle: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  defaultToggleOn: { borderColor: COLORS.success + '80', backgroundColor: 'rgba(16,185,129,0.12)' },
  defaultToggleText: { fontSize: 10, color: COLORS.text3, fontWeight: FONT_WEIGHT.semibold },
  defaultToggleTextOn: { color: COLORS.success },
  removeX: { fontSize: FONT_SIZE.md, color: COLORS.danger },
  addTplChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2,
  },
  addTplChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  err: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
});