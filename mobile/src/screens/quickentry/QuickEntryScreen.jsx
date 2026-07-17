// SplitEase/mobile/src/screens/quickentry/QuickEntryScreen.jsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as routinesApi from '../../api/routines';
import ScreenHeader from '../../components/layout/ScreenHeader';
import QuickTapRow from '../../components/dashboard/QuickTapRow';
import PendingBillsRow from '../../components/dashboard/PendingBillsRow';
import { TemplateIcon } from '../../constants/templateIcons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

function RoutinesSection() {
  const navigation = useNavigation();
  const [routines, setRoutines] = useState([]);

  useFocusEffect(useCallback(() => {
    routinesApi.getRoutines().then(({ data }) => setRoutines(data || [])).catch(() => {});
  }, []));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>ROUTINES</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ManageRoutines')}>
          <Text style={styles.manageLink}>Manage</Text>
        </TouchableOpacity>
      </View>
      {routines.length === 0 ? (
        <TouchableOpacity style={styles.emptyRoutine} onPress={() => navigation.navigate('ManageRoutines')}>
          <Text style={styles.emptyRoutineText}>Build a routine — e.g. "College Day" — to log your whole commute in one tap.</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: SPACING.sm }}>
          {routines.map((r) => (
            <TouchableOpacity
              key={r.routine_id}
              style={styles.routineCard}
              onPress={() => navigation.navigate('RunRoutine', { routineId: r.routine_id })}
            >
              <View style={styles.routineIcon}><TemplateIcon name={r.icon_name} size={20} color={COLORS.primary} /></View>
              <Text style={styles.routineName}>{r.name}</Text>
              <Text style={styles.routineArrow}>Run →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function QuickEntryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Quick Entry" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + SPACING.base, gap: SPACING.lg }}>
        <RoutinesSection />
        <PendingBillsRow />
        <QuickTapRow />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  section: { gap: SPACING.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base },
  sectionTitle: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase' },
  manageLink: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  emptyRoutine: {
    marginHorizontal: SPACING.base, padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyRoutineText: { fontSize: FONT_SIZE.sm, color: COLORS.text3, textAlign: 'center' },
  routineCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.base, padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  routineIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  routineName: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  routineArrow: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});