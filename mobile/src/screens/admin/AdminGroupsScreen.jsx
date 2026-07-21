// SplitEase/mobile/src/screens/admin/AdminGroupsScreen.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllGroupsAdmin, deleteGroupAdmin, wipeAllGroups } from '../../api/adminGroups';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, TAB_BAR_HEIGHT } from '../../constants/theme';
import { Icons } from '../../components/icons';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AppAlert from '../../components/common/AppAlert';
import { FolderKanban, Trash2, ChevronLeft } from 'lucide-react-native';

export default function AdminGroupsScreen() {
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [wipeStep, setWipeStep] = useState('idle');
  const [confirmText, setConfirmText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getAllGroupsAdmin(); setGroups(r.data); }
    catch { setGroups([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(g) {
    setAlert({
      title: `Delete "${g.group_name}"?`,
      message: 'All expenses and payments in this group will be removed.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setAlert(null);
          try { await deleteGroupAdmin(g.group_id); setGroups(p => p.filter(x => x.group_id !== g.group_id)); }
          catch (e) {
            setAlert({ title: 'Failed', message: e.response?.data?.detail || 'Could not delete group.', buttons: [{ text: 'OK', onPress: () => setAlert(null) }] });
          }
        }},
      ],
    });
  }

  async function handleWipeAll() {
    if (confirmText !== 'WIPE') return;
    try { await wipeAllGroups(); setGroups([]); setWipeStep('idle'); setConfirmText(''); }
    catch (e) {
      setAlert({ title: 'Failed', message: e.response?.data?.detail || 'Could not wipe groups.', buttons: [{ text: 'OK', onPress: () => setAlert(null) }] });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Groups</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + SPACING.xl }}>
        <View style={styles.headerRow}>
          <Text style={styles.count}>{loading ? 'Loading…' : `${groups.length} total groups`}</Text>
          {wipeStep === 'idle' && (
            <TouchableOpacity onPress={() => setWipeStep('confirm')} style={styles.wipeBtn}>
              <Text style={styles.wipeBtnText}>Wipe All</Text>
            </TouchableOpacity>
          )}
        </View>

        {wipeStep === 'confirm' && (
          <View style={styles.wipeConfirmBox}>
            <Text style={[styles.rowLabel, { color: COLORS.danger, marginBottom: 6 }]}>Delete ALL groups?</Text>
            <Text style={[styles.rowSub, { marginBottom: 12, lineHeight: 18 }]}>
              This removes every expense, payment, and settlement across the entire app. This cannot be undone.
            </Text>
            <Input label='Type "WIPE" to confirm' value={confirmText} onChangeText={setConfirmText} placeholder="WIPE" autoCapitalize="characters" />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
              <Button title="Cancel" variant="ghost" onPress={() => { setWipeStep('idle'); setConfirmText(''); }} fullWidth />
              <Button title="Wipe All Groups" onPress={handleWipeAll} disabled={confirmText !== 'WIPE'} fullWidth />
            </View>
          </View>
        )}

        <View style={styles.group}>
          {groups.map((g, i) => (
            <View key={g.group_id} style={[styles.row, i === groups.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}>
                <FolderKanban size={16} color={COLORS.text2} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{g.group_name}</Text>
                <Text style={styles.rowSub}>{g.member_count} members</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(g)} style={styles.delBtn}>
                <Trash2 size={14} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  count: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  wipeBtn: { backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  wipeBtnText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.danger },
  wipeConfirmBox: { marginHorizontal: SPACING.base, marginBottom: SPACING.md, padding: SPACING.base, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12 },
  group: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: 13, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  delBtn: { padding: 8 },
});