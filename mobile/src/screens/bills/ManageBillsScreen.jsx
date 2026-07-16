// SplitEase/mobile/src/screens/bills/ManageBillsScreen.jsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as recurringBillsApi from '../../api/recurringBills';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { LoadingState, EmptyState } from '../../components/common/Ui';
import { Icons } from '../../components/icons/icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

export default function ManageBillsScreen() {
  const navigation = useNavigation();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await recurringBillsApi.getBills();
      setBills(data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(b) {
    Alert.alert('Delete Recurring Bill', `Delete "${b.name}"? Past pending entries stay; future ones stop generating.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await recurringBillsApi.deleteBill(b.bill_id);
          load();
        },
      },
    ]);
  }

  if (loading) return <LoadingState label="Loading bills…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Recurring Bills"
        showBack
        actions={
          <TouchableOpacity onPress={() => navigation.navigate('EditBill')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icons.plus size={22} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={bills}
        keyExtractor={(b) => String(b.bill_id)}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: TAB_BAR_HEIGHT, gap: SPACING.sm }}
        ListEmptyComponent={
          <EmptyState icon="calendarDays" title="No recurring bills" subtitle="Add rent, wifi, electricity…" />
        }
        renderItem={({ item }) => {
          const IconComp = Icons[item.icon_name] || Icons.zap;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('EditBill', { bill: item })}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}><IconComp size={18} color={COLORS.warning} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.group_id ? 'Group' : 'Personal'} · Day {item.cron_day} of month
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icons.trash size={18} color={COLORS.text3} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
});