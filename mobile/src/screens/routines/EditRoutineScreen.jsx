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
import IconPickerField from '../../components/common/IconPickerField';
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
  const [expandedModifierItem, setExpandedModifierItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function makeBlankModifier(type) {
    const id = `mod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return type === 'toggle'
      ? { id, type, label: '', default: false, condition: null, effect: { if_true: {}, if_false: {} } }
      : { id, type, label: '', unit: '', min: 0, max: 10, step: 1, default: 1, condition: null, effect: { multiply_base_by: 'value' } };
  }

  function toggleModifierEditor(templateId) {
    setExpandedModifierItem((p) => (p === templateId ? null : templateId));
  }

  function addModifier(templateId, type) {
    setSelected((p) => p.map((s) => (
      s.template_id === templateId
        ? { ...s, modifier_schema: [...(s.modifier_schema || []), makeBlankModifier(type)] }
        : s
    )));
  }

  function updateModifier(templateId, modId, patch) {
    setSelected((p) => p.map((s) => (
      s.template_id === templateId
        ? { ...s, modifier_schema: s.modifier_schema.map((m) => (m.id === modId ? { ...m, ...patch } : m)) }
        : s
    )));
  }

  function updateModifierEffect(templateId, modId, branch, field, value) {
    setSelected((p) => p.map((s) => {
      if (s.template_id !== templateId) return s;
      return {
        ...s,
        modifier_schema: s.modifier_schema.map((m) => {
          if (m.id !== modId) return m;
          const num = value === '' ? undefined : parseFloat(value);
          const nextBranch = { ...(m.effect[branch] || {}) };
          if (num === undefined || isNaN(num)) delete nextBranch[field];
          else nextBranch[field] = num;
          return { ...m, effect: { ...m.effect, [branch]: nextBranch } };
        }),
      };
    }));
  }

  function setCounterMethod(templateId, modId, method) {
    setSelected((p) => p.map((s) => {
      if (s.template_id !== templateId) return s;
      return {
        ...s,
        modifier_schema: s.modifier_schema.map((m) => (
          m.id === modId
            ? { ...m, effect: method === 'multiply' ? { multiply_base_by: 'value' } : { add_per_unit: 0 } }
            : m
        )),
      };
    }));
  }

  function removeModifier(templateId, modId) {
    setSelected((p) => p.map((s) => (
      s.template_id === templateId
        ? { ...s, modifier_schema: s.modifier_schema.filter((m) => m.id !== modId) }
        : s
    )));
  }

  function toggleModifierDay(templateId, modId, day) {
    setSelected((p) => p.map((s) => {
      if (s.template_id !== templateId) return s;
      return {
        ...s,
        modifier_schema: s.modifier_schema.map((m) => {
          if (m.id !== modId) return m;
          const days = m.condition?.day_of_week || [];
          const nextDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
          return { ...m, condition: nextDays.length ? { day_of_week: nextDays } : null };
        }),
      };
    }));
  }

  useEffect(() => {
    async function load() {
      const { data: templates } = await quickTemplatesApi.getTemplates();
      setAllTemplates(templates || []);

      if (isEdit) {
        const { data: detail } = await routinesApi.getRoutine(editing.routine_id);
        setSelected(
          detail.items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((it) => ({
              template_id: it.template_id,
              default_included: !!it.default_included,
              modifier_schema: it.modifier_schema || [],
            }))
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
      return [...p, { template_id: templateId, default_included: true, modifier_schema: [] }];
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
          modifier_schema: s.modifier_schema && s.modifier_schema.length ? s.modifier_schema : null,
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
            <IconPickerField
              value={iconName}
              onChange={setIconName}
              activeColor={COLORS.primary}
              requireCategory={false}
            />
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
                <View key={s.template_id} style={styles.selectedBlock}>
                  <View style={styles.selectedRow}>
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

                  <TouchableOpacity style={styles.modifierToggleBtn} onPress={() => toggleModifierEditor(s.template_id)}>
                    <Text style={styles.modifierToggleText}>
                      {(s.modifier_schema || []).length > 0
                        ? `⚙ ${s.modifier_schema.length} modifier${s.modifier_schema.length > 1 ? 's' : ''}`
                        : '+ Add execution-time modifier'}
                    </Text>
                  </TouchableOpacity>

                  {expandedModifierItem === s.template_id && (
                    <View style={styles.modifierCard}>
                      {(s.modifier_schema || []).map((mod) => (
                        <View key={mod.id} style={styles.modifierEditRow}>
                          <View style={styles.modifierEditHeader}>
                            <View style={styles.modTypeChip}>
                              <Text style={styles.modTypeChipText}>{mod.type === 'toggle' ? 'Toggle' : 'Counter'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeModifier(s.template_id, mod.id)}>
                              <Text style={styles.removeX}>✕</Text>
                            </TouchableOpacity>
                          </View>

                          <Input
                            value={mod.label}
                            onChangeText={(v) => updateModifier(s.template_id, mod.id, { label: v })}
                            placeholder={mod.type === 'toggle' ? 'e.g. Entered Metro before 8:30?' : 'e.g. Quantity (L)'}
                          />

                          {mod.type === 'toggle' ? (
                            <View style={styles.modBranchGroup}>
                              <Text style={styles.modBranchLabel}>WHEN YES</Text>
                              <View style={styles.modBranchRow}>
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={mod.effect.if_true?.set_amount != null ? String(mod.effect.if_true.set_amount) : ''}
                                  onChangeText={(v) => updateModifierEffect(s.template_id, mod.id, 'if_true', 'set_amount', v)}
                                  placeholder="Set amount ₹"
                                  placeholderTextColor={COLORS.text3}
                                  keyboardType="decimal-pad"
                                />
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={mod.effect.if_true?.add_amount != null ? String(mod.effect.if_true.add_amount) : ''}
                                  onChangeText={(v) => updateModifierEffect(s.template_id, mod.id, 'if_true', 'add_amount', v)}
                                  placeholder="Add amount ₹"
                                  placeholderTextColor={COLORS.text3}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              <Text style={styles.modBranchLabel}>WHEN NO</Text>
                              <View style={styles.modBranchRow}>
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={mod.effect.if_false?.set_amount != null ? String(mod.effect.if_false.set_amount) : ''}
                                  onChangeText={(v) => updateModifierEffect(s.template_id, mod.id, 'if_false', 'set_amount', v)}
                                  placeholder="Set amount ₹"
                                  placeholderTextColor={COLORS.text3}
                                  keyboardType="decimal-pad"
                                />
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={mod.effect.if_false?.add_amount != null ? String(mod.effect.if_false.add_amount) : ''}
                                  onChangeText={(v) => updateModifierEffect(s.template_id, mod.id, 'if_false', 'add_amount', v)}
                                  placeholder="Add amount ₹"
                                  placeholderTextColor={COLORS.text3}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                            </View>
                          ) : (
                            <View style={styles.modBranchGroup}>
                              <View style={styles.modBranchRow}>
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={mod.unit}
                                  onChangeText={(v) => updateModifier(s.template_id, mod.id, { unit: v })}
                                  placeholder="Unit (e.g. L)"
                                  placeholderTextColor={COLORS.text3}
                                />
                                <TextInput
                                  style={styles.modBranchInput}
                                  value={String(mod.step)}
                                  onChangeText={(v) => updateModifier(s.template_id, mod.id, { step: parseFloat(v) || 0 })}
                                  placeholder="Step"
                                  placeholderTextColor={COLORS.text3}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              <View style={styles.modBranchRow}>
                                <TouchableOpacity
                                  style={[styles.modMethodChip, mod.effect.multiply_base_by && styles.modMethodChipActive]}
                                  onPress={() => setCounterMethod(s.template_id, mod.id, 'multiply')}
                                >
                                  <Text style={styles.modMethodChipText}>× base price</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.modMethodChip, mod.effect.add_per_unit != null && styles.modMethodChipActive]}
                                  onPress={() => setCounterMethod(s.template_id, mod.id, 'add_per_unit')}
                                >
                                  <Text style={styles.modMethodChipText}>+ ₹ per unit</Text>
                                </TouchableOpacity>
                              </View>
                              {mod.effect.add_per_unit != null && (
                                <Input
                                  value={String(mod.effect.add_per_unit)}
                                  onChangeText={(v) => updateModifier(s.template_id, mod.id, { effect: { add_per_unit: parseFloat(v) || 0 } })}
                                  placeholder="₹ per unit"
                                  keyboardType="decimal-pad"
                                />
                              )}
                            </View>
                          )}

                          <Text style={styles.modBranchLabel}>ONLY ON — leave all off to apply every day</Text>
                          <View style={styles.chipsRow}>
                            {DAYS.map((d) => {
                              const active = (mod.condition?.day_of_week || []).includes(d.key);
                              return (
                                <TouchableOpacity
                                  key={d.key}
                                  style={[styles.daySmallChip, active && styles.dayChipActive]}
                                  onPress={() => toggleModifierDay(s.template_id, mod.id, d.key)}
                                >
                                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))}

                      <View style={styles.chipsRow}>
                        <Button title="+ Toggle" variant="surface" size="sm" onPress={() => addModifier(s.template_id, 'toggle')} />
                        <Button title="+ Counter" variant="surface" size="sm" onPress={() => addModifier(s.template_id, 'counter')} />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>ADD TEMPLATES TO THIS ROUTINE</Text>
            {allTemplates.length === 0 ? (
              <TouchableOpacity style={styles.emptyTplBox} onPress={() => navigation.navigate('EditTemplate')}>
                <Text style={styles.hint}>No templates yet — tap to create one first, then come back to bundle it here.</Text>
              </TouchableOpacity>
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
  selectedBlock: { marginBottom: 6, gap: 6 },
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm,
  },
  modifierToggleBtn: { paddingHorizontal: SPACING.sm },
  modifierToggleText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  modifierCard: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.md,
  },
  modifierEditRow: {
    gap: SPACING.sm, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modifierEditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modTypeChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  modTypeChipText: { fontSize: 10, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  modifierInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 8,
    fontSize: FONT_SIZE.sm, color: COLORS.text,
  },
  modBranchGroup: { gap: 6 },
  modBranchLabel: { fontSize: 10, color: COLORS.text3, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.5 },
  modBranchRow: { flexDirection: 'row', gap: SPACING.sm },
  modBranchInput: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border2,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 8,
    fontSize: FONT_SIZE.sm, color: COLORS.text,
  },
  modMethodChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modMethodChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(59,130,246,0.12)' },
  modMethodChipText: { fontSize: FONT_SIZE.xs, color: COLORS.text2 },
  daySmallChip: {
    width: 36, paddingVertical: 6, borderRadius: RADIUS.full, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
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
  emptyTplBox: {
    padding: SPACING.md, backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  err: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
});