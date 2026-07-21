// SplitEase/mobile/src/screens/admin/AdminOverviewScreen.jsx
//
// Mirrors web's AdminOverview.jsx: stats, nav rows to Users/Groups/
// Transactions, and the Danger Zone wipe-app flow. Mobile has no
// window.confirm/prompt, so the typed "WIPE" confirmation (matching
// web's exact safeguard) uses the existing Input component instead.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllUsers, adminWipe } from '../../api/users';
import { getAllGroupsAdmin } from '../../api/adminGroups';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';
import { Icons } from '../../components/icons';
import { Users, FolderKanban, Receipt, Trash2 } from 'lucide-react-native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AppAlert from '../../components/common/AppAlert';

function SectionLabel({ title, danger }) {
  return <Text style={[styles.sectionLabel, danger && { color: 'rgba(239,68,68,0.7)' }]}>{title}</Text>;
}
function Group({ children, danger }) {
  return <View style={[styles.group, danger && styles.groupDanger]}>{children}</View>;
}
function Row({ IconComp, iconBg, iconColor, label, sub, onPress, last }) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg || COLORS.surface2 }]}>
          <IconComp size={16} color={iconColor || COLORS.text2} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{label}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        <Icons.chevronRight size={14} color={COLORS.text3} />
      </TouchableOpacity>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

export default function AdminOverviewScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('idle'); // idle | confirm | done
  const [confirmText, setConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);
  const [alert, setAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, g] = await Promise.all([getAllUsers(), getAllGroupsAdmin()]);
      setUsers(u.data);
      setGroups(g.data);
    } catch {
      setUsers([]); setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleWipe() {
    if (confirmText !== 'WIPE') return;
    setWiping(true);
    try {
      await adminWipe();
      setStep('done');
    } catch (e) {
      setAlert({
        title: 'Wipe failed',
        message: e.response?.data?.detail || 'Something went wrong.',
        buttons: [{ text: 'OK', onPress: () => setAlert(null) }],
      });
      setStep('idle');
    } finally {
      setWiping(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icons.back size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Admin Panel</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + SPACING.xl }}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: '#a78bfa' }]}>{loading ? '—' : users.length}</Text>
            <Text style={styles.statLabel}>USERS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: COLORS.success }]}>{loading ? '—' : groups.length}</Text>
            <Text style={styles.statLabel}>GROUPS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{loading ? '—' : users.filter(u => u.role === 'admin').length}</Text>
            <Text style={styles.statLabel}>ADMINS</Text>
          </View>
        </View>

        <SectionLabel title="MANAGE" />
        <Group>
          <Row IconComp={Users} iconBg="rgba(37,99,235,0.12)" iconColor={COLORS.primaryH}
            label="Users" sub={`${users.length} registered`} onPress={() => navigation.navigate('AdminUsers')} />
          <Row IconComp={FolderKanban} iconBg="rgba(16,185,129,0.10)" iconColor={COLORS.success}
            label="Groups" sub={`${groups.length} total`} onPress={() => navigation.navigate('AdminGroups')} />
          <Row IconComp={Receipt} iconBg="rgba(245,158,11,0.10)" iconColor="#f59e0b"
            label="Transactions" sub="All expenses across groups" onPress={() => navigation.navigate('AdminTransactions')} last />
        </Group>

        <SectionLabel title="DANGER ZONE" danger />
        <Group danger>
          {step === 'idle' && (
            <Row IconComp={Trash2} iconBg="rgba(239,68,68,0.10)" iconColor={COLORS.danger}
              label="Wipe Entire App" sub="Delete all users, groups, and data" onPress={() => setStep('confirm')} last />
          )}
          {step === 'confirm' && (
            <View style={styles.inlineBlock}>
              <Text style={[styles.rowLabel, { color: COLORS.danger, marginBottom: 6 }]}>Complete App Wipe</Text>
              <Text style={[styles.rowSub, { marginBottom: 14, lineHeight: 18 }]}>
                This permanently deletes ALL users, groups, expenses, payments, loans, and activity.
                Only your admin account and categories remain. This cannot be undone.
              </Text>
              <Input label='Type "WIPE" to confirm' value={confirmText} onChangeText={setConfirmText} placeholder="WIPE" autoFocus autoCapitalize="characters" />
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
                <Button title="Cancel" variant="ghost" onPress={() => { setStep('idle'); setConfirmText(''); }} fullWidth />
                <Button title={wiping ? 'Wiping…' : 'Wipe Everything'} onPress={handleWipe} loading={wiping} disabled={confirmText !== 'WIPE'} fullWidth />
              </View>
            </View>
          )}
          {step === 'done' && (
            <View style={styles.inlineBlock}>
              <Text style={[styles.rowLabel, { color: COLORS.success }]}>✓ App wiped successfully</Text>
              <Text style={[styles.rowSub, { marginTop: 4 }]}>All users, groups, and data have been deleted. Only your admin account remains.</Text>
            </View>
          )}
        </Group>
      </ScrollView>
      <AppAlert config={alert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, gap: SPACING.sm },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md },
  statVal: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  statLabel: { fontSize: 10, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.8, color: COLORS.text3, marginTop: 4 },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.9, textTransform: 'uppercase', color: COLORS.text3, paddingHorizontal: SPACING.base + 4, paddingTop: SPACING.lg, paddingBottom: SPACING.xs + 2 },
  group: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  groupDanger: { borderColor: 'rgba(239,68,68,0.18)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: 13, gap: SPACING.md, minHeight: 52 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.base + 36 + SPACING.md },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  inlineBlock: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base },
});