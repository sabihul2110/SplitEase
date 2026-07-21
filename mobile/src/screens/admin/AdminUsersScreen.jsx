// SplitEase/mobile/src/screens/admin/AdminUsersScreen.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers, deleteUser } from '../../api/users';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, TAB_BAR_HEIGHT } from '../../constants/theme';
import { Icons } from '../../components/icons';
import AppAlert from '../../components/common/AppAlert';
import { User, Trash2, ChevronLeft } from 'lucide-react-native';

export default function AdminUsersScreen() {
  const navigation = useNavigation();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getAllUsers(); setUsers(r.data); }
    catch { setUsers([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(u) {
    setAlert({
      title: `Delete ${u.name}?`,
      message: 'This removes all their data. This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setAlert(null);
          try { await deleteUser(u.user_id); setUsers(p => p.filter(x => x.user_id !== u.user_id)); }
          catch (e) {
            setAlert({ title: 'Failed', message: e.response?.data?.detail || 'Could not delete user.', buttons: [{ text: 'OK', onPress: () => setAlert(null) }] });
          }
        }},
      ],
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Users</Text>
        <View style={styles.navBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + SPACING.xl }}>
        <Text style={styles.count}>{loading ? 'Loading…' : `${users.length} registered users`}</Text>
        <View style={styles.group}>
          {users.map((u, i) => (
            <View key={u.user_id} style={[styles.row, i === users.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowIcon}>
                <User size={16} color={COLORS.text2} />
              </View>
              <View style={styles.rowBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.rowLabel}>{u.name}</Text>
                  {u.user_id === me?.user_id && <Text style={styles.youTag}>you</Text>}
                  {u.role === 'admin' && <Text style={styles.adminTag}>admin</Text>}
                </View>
                <Text style={styles.rowSub}>{u.email}</Text>
              </View>
              {u.role !== 'admin' && (
                <TouchableOpacity onPress={() => confirmDelete(u)} style={styles.delBtn}>
                  <Trash2 size={14} color={COLORS.danger} />
                </TouchableOpacity>
              )}
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
  count: { fontSize: FONT_SIZE.sm, color: COLORS.text3, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  group: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: 13, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  youTag: { fontSize: 10, color: COLORS.text3, backgroundColor: COLORS.surface2, paddingHorizontal: 6, borderRadius: 8 },
  adminTag: { fontSize: 10, color: COLORS.primaryH, backgroundColor: 'rgba(37,99,235,0.12)', paddingHorizontal: 6, borderRadius: 8 },
  delBtn: { padding: 8 },
});