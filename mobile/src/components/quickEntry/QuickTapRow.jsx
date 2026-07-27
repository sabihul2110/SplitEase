// SplitEase/mobile/src/components/quickEntry/QuickTapRow.jsx

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as quickTemplatesApi from '../../api/quickTemplates';
import { TemplateIcon, ICON_CHIP_BG, ICON_CHIP_COLOR } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { Icons } from '../icons';
import EntrySheet from './EntrySheet';

export default function QuickTapRow({ embedded = false }) {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await quickTemplatesApi.getTemplates();
      setTemplates(data || []);
    } catch {} finally { setLoaded(true); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSubmit(payload) {
    await quickTemplatesApi.executeTemplate(active.template_id, payload);
    setActive(null);
  }

  return (
    <View style={styles.wrap}>
      {!embedded && (
      <View style={styles.head}>
        <Text style={styles.title}>QUICK ENTRIES</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ManageTemplates')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icons.settings size={16} color={COLORS.text3} />
        </TouchableOpacity>
      </View>
      )}

      {loaded && templates.length === 0 ? (
        <TouchableOpacity style={styles.emptyRow} onPress={() => navigation.navigate('EditTemplate')}>
          <Text style={styles.emptyRowText}>Save a repeat expense — like your daily canteen lunch — to log it in one tap.</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {templates.map((t, i) => (
            <TouchableOpacity
              key={t.template_id}
              style={[styles.itemRow, i < templates.length - 1 && styles.itemRowDivider]}
              onPress={() => setActive(t)}
              activeOpacity={0.75}
            >
              <View style={styles.itemIcon}><TemplateIcon name={t.icon_name} size={18} color={ICON_CHIP_COLOR} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{t.name}</Text>
                {t.default_amount != null && (
                  <Text style={styles.itemAmt}>₹{Number(t.default_amount).toFixed(0)}</Text>
                )}
              </View>
              <View style={styles.tapPill}>
                <Text style={styles.tapPillText}>Log</Text>
                <Icons.chevronRight size={12} color={COLORS.success} />
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={() => navigation.navigate('EditTemplate')} activeOpacity={0.75}>
            <Icons.plus size={16} color={COLORS.text3} />
            <Text style={styles.addRowText}>New quick entry</Text>
          </TouchableOpacity>
        </View>
      )}

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
  emptyRow: {
    padding: SPACING.md, backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyRowText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, textAlign: 'center' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: ICON_CHIP_BG, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  itemAmt: { fontSize: 11, color: COLORS.text3, marginTop: 1 },
  tapPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tapPillText: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: FONT_WEIGHT.bold },
  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  addRowText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },
});