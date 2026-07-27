// SplitEase/mobile/src/components/quickEntry/PendingBillsRow.jsx

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as pendingBillsApi from '../../api/pendingBills';
import { TemplateIcon, ICON_CHIP_BG, ICON_CHIP_COLOR } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { Icons } from '../icons';
import EntrySheet from './EntrySheet';

export default function PendingBillsRow({ embedded = false }) {
  const navigation = useNavigation();
  const [bills, setBills] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await pendingBillsApi.getPendingBills();
      setBills(data || []);
    } catch {} finally { setLoaded(true); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSubmit(payload) {
    await pendingBillsApi.payPendingBill(active.pending_id, payload);
    setActive(null);
    load();
  }

  async function handleDismiss(bill) {
    await pendingBillsApi.dismissPendingBill(bill.pending_id);
    load();
  }

  return (
    <View style={styles.wrap}>
      {!embedded && (
      <View style={styles.head}>
        <Text style={styles.title}>PENDING BILLS</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Expenses', { screen: 'ManageBills' })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.settings size={16} color={COLORS.text3} />
        </TouchableOpacity>
      </View>
      )}

      {loaded && bills.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => navigation.navigate('Expenses', { screen: 'ManageBills' })}
        >
          <Text style={styles.emptyCardText}>No recurring bills yet — tap to add rent, wifi, electricity…</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {bills.map((b, i) => (
            <View key={b.pending_id} style={[styles.itemRow, i < bills.length - 1 && styles.itemRowDivider]}>
              <View style={styles.itemIcon}><TemplateIcon name={b.icon_name} size={18} color={ICON_CHIP_COLOR} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{b.name}</Text>
                <Text style={styles.itemMonth}>{b.generated_for_month?.slice(0, 7)}</Text>
              </View>
              <TouchableOpacity style={styles.payPill} onPress={() => setActive(b)}>
                <Text style={styles.payPillText}>Pay</Text>
                <Icons.chevronRight size={12} color={COLORS.warning} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDismiss(b)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 4 }}>
                <Icons.close size={16} color={COLORS.text3} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {active && (
        <EntrySheet
          title={`Pay: ${active.name}`}
          requireAmount
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
  emptyCard: {
    padding: SPACING.md, backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyCardText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, textAlign: 'center' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: ICON_CHIP_BG, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  itemMonth: { fontSize: 10, color: COLORS.text3, marginTop: 1 },
  payPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(245,158,11,0.14)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  payPillText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: FONT_WEIGHT.bold },
});