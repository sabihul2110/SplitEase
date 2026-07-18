// mobile/src/components/common/DatePickerInput.jsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { Icons } from '../icons';

export default function DatePickerInput({ value, onChange, accentColor }) {
  const accent = accentColor || COLORS.primary;
  const [show, setShow] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(value);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker]   = useState(false);
  const today = new Date();
  const currentYear = today.getFullYear();
  const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i); // last 10 years
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

  // Fixed grid: always 6 rows × 7 cols so modal height never changes
  function buildWeeks() {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to exactly 42 cells (6 rows) so height is always fixed
    while (cells.length < 42) cells.push(null);
    const weeks = [];
    for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
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

              {/* Tappable month + year labels */}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => { setShowMonthPicker(true); setShowYearPicker(false); }}
                  style={styles.quickPickBtn}
                >
                  <Text style={styles.monthLabel}>{MONTHS[month]}</Text>
                  <Icons.chevronRight size={11} color={COLORS.text3} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowYearPicker(true); setShowMonthPicker(false); }}
                  style={styles.quickPickBtn}
                >
                  <Text style={styles.monthLabel}>{year}</Text>
                  <Icons.chevronRight size={11} color={COLORS.text3} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icons.chevronRight size={20} color={COLORS.text2} />
              </TouchableOpacity>
            </View>

            {/* Month quick-picker overlay */}
            {showMonthPicker && (
              <View style={styles.quickPickOverlay}>
                {MONTHS.map((m, i) => {
                  const isActive = i === month;
                  const isFut = new Date(year, i) > today;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.quickPickItem, isActive && { backgroundColor: accent + '22' }, isFut && { opacity: 0.35 }]}
                      disabled={isFut}
                      onPress={() => { setCalMonth(p => ({ ...p, month: i })); setShowMonthPicker(false); }}
                    >
                      <Text style={[styles.quickPickText, isActive && { color: accent, fontWeight: '700' }]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Year quick-picker overlay */}
            {showYearPicker && (
              <View style={styles.quickPickOverlay}>
                {YEARS.map(y => {
                  const isActive = y === year;
                  const isFut = y > currentYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.quickPickItem, isActive && { backgroundColor: accent + '22' }, isFut && { opacity: 0.35 }]}
                      disabled={isFut}
                      onPress={() => { setCalMonth(p => ({ ...p, year: y })); setShowYearPicker(false); }}
                    >
                      <Text style={[styles.quickPickText, isActive && { color: accent, fontWeight: '700' }]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
    minHeight: 380,
  },
  quickPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.surface2 || '#171c2c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPickOverlay: {
    position: 'absolute',
    top: 56,
    left: 8,
    right: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickPickItem: {
    width: '30%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickPickText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: '500',
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