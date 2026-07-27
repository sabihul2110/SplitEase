// SplitEase/mobile/src/screens/quickentry/QuickEntryScreen.jsx

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as routinesApi from '../../api/routines';
import { Icons } from '../../components/icons';
import ScreenHeader from '../../components/layout/ScreenHeader';
import PendingBillsRow from '../../components/quickEntry/PendingBillsRow';
import QuickTapRow from '../../components/quickEntry/QuickTapRow';
import { TemplateIcon, ICON_CHIP_BG, ICON_CHIP_COLOR } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, TAB_BAR_HEIGHT } from '../../constants/theme';

function SectionCard({ icon, iconColor, title, manageLabel, onManage, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <View style={[styles.cardIconBox, { backgroundColor: iconColor + '18' }]}>
            {icon}
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {onManage && (
          <TouchableOpacity onPress={onManage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.manageLink}>{manageLabel || 'Manage'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function RoutinesSection() {
  const navigation = useNavigation();
  const [routines, setRoutines] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    routinesApi.getRoutines()
      .then(({ data }) => setRoutines(data || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []));

  return (
    <SectionCard
      icon={<Icons.zap size={16} color={COLORS.primary} />}
      iconColor={COLORS.primary}
      title="Routines"
      onManage={() => navigation.navigate('ManageRoutines')}
    >
      {loaded && routines.length === 0 ? (
        <TouchableOpacity style={styles.emptyRow} onPress={() => navigation.navigate('ManageRoutines')}>
          <Text style={styles.emptyRowText}>Bundle your daily commute legs into one tap — e.g. "College Day".</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {routines.map((r, i) => (
            <TouchableOpacity
              key={r.routine_id}
              style={[styles.itemRow, i < routines.length - 1 && styles.itemRowDivider]}
              onPress={() => navigation.navigate('RunRoutine', { routineId: r.routine_id })}
              activeOpacity={0.75}
            >
              <View style={styles.itemIcon}><TemplateIcon name={r.icon_name} size={18} color={ICON_CHIP_COLOR} /></View>
              <Text style={styles.itemName} numberOfLines={1}>{r.name}</Text>
              <View style={styles.runPill}>
                <Text style={styles.runPillText}>Run</Text>
                <Icons.chevronRight size={12} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

export default function QuickEntryScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Quick Actions" showBack />
      <ScrollView
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: TAB_BAR_HEIGHT + SPACING.base, gap: SPACING.md }}
        showsVerticalScrollIndicator={false}
      >
        <RoutinesSection />

        <SectionCard
          icon={<Icons.calendarDays size={16} color={COLORS.warning} />}
          iconColor={COLORS.warning}
          title="Pending Bills"
          onManage={() => navigation.navigate('ManageBills')}
        >
          <PendingBillsRow embedded />
        </SectionCard>

        <SectionCard
          icon={<Icons.zap size={16} color={COLORS.success} />}
          iconColor={COLORS.success}
          title="Quick Entries"
          onManage={() => navigation.navigate('ManageTemplates')}
        >
          <QuickTapRow embedded />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, gap: SPACING.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  manageLink: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
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
  itemName: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  runPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  runPillText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
});