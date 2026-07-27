// SplitEase/mobile/src/screens/bills/PayBillScreen.jsx


import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as pendingBillsApi from '../../api/pendingBills';
import ScreenHeader from '../../components/layout/ScreenHeader';
import EntryForm from '../../components/quickEntry/EntryForm';
import { TemplateIcon } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

function dueDateInfo(dueDateStr) {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(dueDateStr + 'T00:00:00');
  const todayD = new Date(today + 'T00:00:00');
  const diffDays = Math.round((due - todayD) / 86400000);
  const label = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (diffDays < 0) return { text: `Overdue · ${label}`, color: COLORS.danger };
  if (diffDays === 0) return { text: 'Due today', color: COLORS.warning };
  if (diffDays === 1) return { text: 'Due tomorrow', color: COLORS.warning };
  return { text: `Due ${label}`, color: COLORS.text2 };
}

export default function PayBillScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const bill = route.params?.bill;
  const due = dueDateInfo(bill.due_date);

  async function handleSubmit(payload) {
    await pendingBillsApi.payPendingBill(bill.pending_id, payload);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={`Pay: ${bill.name}`} showBack />
      <EntryForm
        requireAmount
        isGroup={!!bill.group_id}
        groupId={bill.group_id}
        onSubmit={handleSubmit}
        submitLabel="Pay Bill →"
        beforeFields={
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <TemplateIcon name={bill.icon_name} size={20} color={COLORS.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerName}>{bill.name}</Text>
              <Text style={[styles.bannerDue, { color: due.color }]}>{due.text}</Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    padding: SPACING.md, marginBottom: SPACING.xs,
  },
  bannerIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  bannerDue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, marginTop: 2 },
});