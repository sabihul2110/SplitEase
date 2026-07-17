// SplitEase/mobile/src/components/dashboard/QuickTapRow.jsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as quickTemplatesApi from '../../api/quickTemplates';
import { Icons } from '../icons/icons';
import { TemplateIcon } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import EntrySheet from './EntrySheet';

export default function QuickTapRow() {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await quickTemplatesApi.getTemplates();
      setTemplates(data || []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSubmit(payload) {
    await quickTemplatesApi.executeTemplate(active.template_id, payload);
    setActive(null);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>QUICK ENTRIES</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ManageTemplates')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icons.settings size={16} color={COLORS.text3} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {templates.map((t) => (
            <TouchableOpacity key={t.template_id} style={styles.chip} onPress={() => setActive(t)} activeOpacity={0.75}>
              <View style={styles.iconBox}><TemplateIcon name={t.icon_name} size={18} color={COLORS.primary} /></View>
              <Text style={styles.chipLabel} numberOfLines={1}>{t.name}</Text>
              {t.default_amount != null && <Text style={styles.chipAmt}>₹{Number(t.default_amount).toFixed(0)}</Text>}
            </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.chip, styles.addChip]} onPress={() => navigation.navigate('EditTemplate')} activeOpacity={0.75}>
          <Icons.plus size={18} color={COLORS.text3} />
          <Text style={[styles.chipLabel, { color: COLORS.text3 }]}>New</Text>
        </TouchableOpacity>
      </ScrollView>

      {active && (
        <EntrySheet
          title={active.name}
          requireAmount={active.default_amount == null}
          defaultAmount={active.default_amount}
          defaultTime={active.default_time}
          isGroup={!!active.group_id}
          groupId={active.group_id}
          onClose={() => setActive(null)}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base },
  title: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase' },
  row: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  chip: {
    width: 78, alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: SPACING.sm, paddingHorizontal: 6,
  },
  addChip: { borderStyle: 'dashed' },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipLabel: { fontSize: FONT_SIZE.xs, color: COLORS.text, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' },
  chipAmt: { fontSize: 10, color: COLORS.text3 },
});