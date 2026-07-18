// SplitEase/mobile/src/components/dashboard/PendingBillsRow.jsx

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as pendingBillsApi from '../../api/pendingBills';
import { TemplateIcon } from '../../constants/templateIcons';
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
        <TouchableOpacity onPress={() => navigation.navigate('ManageBills')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icons.settings size={16} color={COLORS.text3} />
        </TouchableOpacity>
      </View>
      )}
      {loaded && bills.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={() => navigation.navigate('ManageBills')}>
          <Text style={styles.emptyCardText}>No recurring bills yet — tap to add rent, wifi, electricity…</Text>
        </TouchableOpacity>
      ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {bills.map((b) => {
          return (
            <View key={b.pending_id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}><TemplateIcon name={b.icon_name} size={16} color={COLORS.warning} /></View>
                <TouchableOpacity onPress={() => handleDismiss(b)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icons.close size={14} color={COLORS.text3} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.cardMonth}>{b.generated_for_month?.slice(0, 7)}</Text>
              <TouchableOpacity style={styles.payBtn} onPress={() => setActive(b)}>
                <Text style={styles.payBtnText}>Pay →</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
  row: { paddingHorizontal: SPACING.base, gap: SPACING.sm },
  card: {
    width: 130, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    padding: SPACING.sm, gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, marginTop: 4 },
  cardMonth: { fontSize: 10, color: COLORS.text3 },
  emptyCard: {
    marginHorizontal: SPACING.base, padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyCardText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, textAlign: 'center' },
  payBtn: {
    marginTop: 6, backgroundColor: 'rgba(245,158,11,0.14)',
    borderRadius: RADIUS.sm, paddingVertical: 6, alignItems: 'center',
  },
  payBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.warning },
});