// mobile/src/components/common/DatePickerInput.jsx
//
// Shared calendar date picker used across AddEntryScreen,
// AddGroupExpenseScreen, AddGroupPaymentScreen, and LoansScreen.
// Drop-in replacement for any YYYY-MM-DD text input.
//
// Props:
//   value      — ISO date string "YYYY-MM-DD"
//   onChange   — (isoString) => void
//   accentColor — optional, defaults to COLORS.primary

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { Icons } from '../../constants/icons';

export default function DatePickerInput({ value, onChange, accentColor }) {
  const accent = accentColor || COLORS.primary;
  const [show, setShow] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(value);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const today = new Date();

  function openPicker() {
    const d = new Date(value);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setShow(true);
  }

  function prevMonth() {
    setCalMonth(p => {
      const d = new Date(p.year, p.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    const next = new Date(calMonth.year, calMonth.month + 1);
    if (next <= today) setCalMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  function selectDay(year, month, day) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setShow(false);
  }

  function buildWeeks() {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  const selected = new Date(value);
  const { year, month } = calMonth;

  const displayDate = new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker} activeOpacity={0.7}>
        <Icons.calendarDays size={16} color={COLORS.text2} />
        <Text style={styles.triggerText}>{displayDate}</Text>
        <Icons.chevronRight size={14} color={COLORS.text3} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShow(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modal}>

            {/* Month navigation */}
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icons.chevronLeft size={20} color={COLORS.text2} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icons.chevronRight size={20} color={COLORS.text2} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dowRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.dow}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            {buildWeeks().map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.dayCell} />;
                  const thisDate = new Date(year, month, day);
                  const isFuture = thisDate > today;
                  const isSel =
                    selected.getFullYear() === year &&
                    selected.getMonth() === month &&
                    selected.getDate() === day;
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.dayCell,
                        isSel && [styles.daySel, { backgroundColor: accent }],
                        isFuture && styles.dayFuture,
                      ]}
                      onPress={() => !isFuture && selectDay(year, month, day)}
                      disabled={isFuture}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayText, isSel && styles.dayTextSel]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
  },
  triggerText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.medium,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    width: '100%',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3,
    paddingVertical: 4,
  },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  daySel:      {},
  dayFuture:   { opacity: 0.3 },
  dayText:     { fontSize: FONT_SIZE.base, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },
  dayTextSel:  { color: '#fff', fontWeight: FONT_WEIGHT.bold },
});