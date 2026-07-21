// SplitEase/mobile/src/screens/admin/AdminTransactionsScreen.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllGroupsAdmin } from '../../api/adminGroups';
import { getExpenses } from '../../api/expenses';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, TAB_BAR_HEIGHT } from '../../constants/theme';
import { Icons } from '../../components/icons';
import { Receipt, ChevronLeft } from 'lucide-react-native';

export default function AdminTransactionsScreen() {
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: groups } = await getAllGroupsAdmin();
      const all = [];
      await Promise.all(groups.map(async g => {
        try {
          const e = await getExpenses(g.group_id);
          e.data.forEach(x => all.push({ ...x, group_name: g.group_name }));
        } catch {}
      }));
      all.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
      setExpenses(all);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Transactions</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + SPACING.xl }}>
        <Text style={styles.count}>{loading ? 'Loading…' : `${expenses.length} expenses across all groups`}</Text>
        <View style={styles.group}>
          {expenses.length === 0 && !loading ? (
            <Text style={styles.empty}>No transactions yet.</Text>
          ) : expenses.map((e, i) => (
            <View key={e.expense_id} style={[styles.row, i === expenses.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}>
                <Receipt size={16} color={COLORS.text2} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{e.description}</Text>
                <Text style={styles.rowSub}>{e.group_name} · {e.payer_name} · {e.subcategory_name || e.category_name}</Text>
              </View>
              <Text style={styles.amt}>₹{Number(e.total_amount).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  count: { fontSize: FONT_SIZE.sm, color: COLORS.text3, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  group: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: 13, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  amt: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  empty: { textAlign: 'center', color: COLORS.text3, padding: 32, fontSize: FONT_SIZE.sm },
});