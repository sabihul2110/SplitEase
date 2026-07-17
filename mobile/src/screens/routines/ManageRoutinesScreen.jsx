// SplitEase/mobile/src/screens/routines/ManageRoutinesScreen.jsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as routinesApi from '../../api/routines';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { LoadingState, EmptyState } from '../../components/common/Ui';
import { Icons } from '../../components/icons/icons';
import { TemplateIcon } from '../../constants/templateIcons';
import AppAlert from '../../components/common/AppAlert';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

const DAY_LABELS = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function daysLabel(activeDays) {
  const days = (activeDays || '').split(',').filter(Boolean).map(Number);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}

export default function ManageRoutinesScreen() {
  const navigation = useNavigation();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await routinesApi.getRoutines();
      setRoutines(data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(r) {
    setAlertConfig({
      title: 'Delete Routine',
      message: `Delete "${r.name}"? Its templates stay intact — only the bundle is removed.`,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(null) },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setAlertConfig(null);
            await routinesApi.deleteRoutine(r.routine_id);
            load();
          },
        },
      ],
    });
  }

  if (loading) return <LoadingState label="Loading routines…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Routines"
        showBack
        actions={
          <TouchableOpacity onPress={() => navigation.navigate('EditRoutine')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icons.plus size={22} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={routines}
        keyExtractor={(r) => String(r.routine_id)}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: TAB_BAR_HEIGHT, gap: SPACING.sm }}
        ListEmptyComponent={
          <EmptyState
            icon="zap"
            title="No routines yet"
            subtitle={'Bundle your daily commute legs into one\ntap-to-confirm routine, e.g. "College Day".'}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('EditRoutine', { routine: item })}
            onLongPress={() => confirmDelete(item)}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}><TemplateIcon name={item.icon_name} size={18} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{daysLabel(item.active_days)}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('RunRoutine', { routineId: item.routine_id })}>
              <Text style={styles.runLink}>Run →</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <AppAlert config={alertConfig} />
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
    backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  runLink: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});