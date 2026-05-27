// SplitEase/mobile/src/screens/account/AccountScreen.jsx
//
// Replaces both ProfileScreen.jsx and SettingsScreen.jsx.
// Accessible by tapping the avatar in the Dashboard header.
//
// Sections:
//   Hero (avatar, name, email, upi, role)
//   Stats (groups, net balance)
//   ACCOUNT   → Edit Profile, Change Password
//   SHORTCUTS → Notifications, Activity, Settle Up
//   PREFERENCES → Theme
//   SESSION   → Sign Out
//   DANGER ZONE → Reset My Data
//   ABOUT

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Input        from '../../components/common/Input';
import Button       from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { Icons }    from '../../constants/icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ── Setting row ────────────────────────────────────────────────────────────
function Row({ icon, label, sub, onPress, danger, last, right }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        {typeof icon === 'string'
          ? <Text style={{ fontSize: 16 }}>{icon}</Text>
          : React.createElement(icon, { size: 18, color: danger ? COLORS.danger : COLORS.text2 })}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </Wrap>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────
function EditProfileModal({ user, visible, onClose, onSave }) {
  const [form,   setForm]   = useState({ name: user?.name || '', email: user?.email || '', upi_id: user?.upi_id || '' });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    try {
      const { data } = await client.put(ENDPOINTS.updateMe, {
        name:   form.name.trim(),
        email:  form.email.trim(),
        upi_id: form.upi_id.trim() || null,
      });
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Profile</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.modalFields}>
            <Input label="Full Name"         value={form.name}   onChangeText={v => set('name', v)}   placeholder="Your display name" autoCapitalize="words" />
            <Input label="Email"             value={form.email}  onChangeText={v => set('email', v)}  placeholder="you@college.edu" keyboardType="email-address" />
            <Input label="UPI ID (optional)" value={form.upi_id} onChangeText={v => set('upi_id', v)} placeholder="name@upi" hint="Used for settlement payment links" />
          </View>
          <View style={styles.modalActions}>
            <Button title="Cancel" onPress={onClose} variant="ghost" fullWidth />
            <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={submit} loading={saving} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [form,   setForm]   = useState({ current: '', newPwd: '', confirm: '' });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    if (!form.current)                return 'Current password is required.';
    if (form.newPwd.length < 6)       return 'New password must be at least 6 characters.';
    if (form.newPwd !== form.confirm)  return "Passwords don't match.";
    if (form.current === form.newPwd)  return 'New password must differ from the current one.';
    return null;
  }

  async function submit() {
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await client.post(ENDPOINTS.changePass, {
        current_password: form.current,
        new_password:     form.newPwd,
        confirm_password: form.confirm,
      });
      Alert.alert('Success', 'Password changed successfully.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  const strengthColor =
    form.newPwd.length === 0 ? COLORS.border2 :
    form.newPwd.length < 6   ? COLORS.danger   :
    form.newPwd.length < 10  ? COLORS.warning  :
    COLORS.success;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Change Password</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.modalFields}>
            <Input label="Current Password" value={form.current} onChangeText={v => set('current', v)} secureTextEntry />
            <View>
              <Input label="New Password (min 6 chars)" value={form.newPwd} onChangeText={v => set('newPwd', v)} secureTextEntry />
              {form.newPwd.length > 0 && (
                <View style={[styles.strengthBar, { backgroundColor: strengthColor }]} />
              )}
            </View>
            <Input
              label="Confirm New Password"
              value={form.confirm}
              onChangeText={v => set('confirm', v)}
              secureTextEntry
              error={form.confirm.length > 0 && form.newPwd !== form.confirm ? "Passwords don't match" : undefined}
            />
          </View>
          <View style={styles.modalActions}>
            <Button title="Cancel" onPress={onClose} variant="ghost" fullWidth />
            <Button title={saving ? 'Updating…' : 'Update Password'} onPress={submit} loading={saving} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Danger Zone ────────────────────────────────────────────────────────────
function DangerZone() {
  const { logout } = useAuth();
  const [step,    setStep]    = useState('idle');
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const r = await client.post(ENDPOINTS.resetData);
      if (r.data.status === 'pending_settlements') {
        setPending(r.data.pending || []);
        setStep('pending');
      } else {
        setStep('done');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Something went wrong.');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  }

  async function handleForceReset() {
    setLoading(true);
    try {
      await client.post(ENDPOINTS.resetData + '/force');
      setStep('done');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') return (
    <View style={[styles.card, { borderColor: COLORS.success + '40' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.success }]}>✓ Data reset complete</Text>
      <Text style={[styles.rowSub, { marginTop: 4 }]}>Your financial data has been cleared.</Text>
      <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={logout}>
        <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold }}>Sign out now</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'pending') return (
    <View style={[styles.card, { borderColor: COLORS.warning + '40' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.warning }]}>⚠ Unsettled balances</Text>
      <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.sm }]}>
        Resetting will remove your data from these groups:
      </Text>
      {pending.map(g => (
        <View key={g.group_id} style={styles.pendingRow}>
          <Text style={styles.rowSub}>{g.group_name}</Text>
          <Text style={{ color: g.net_balance > 0 ? COLORS.success : COLORS.danger, fontWeight: FONT_WEIGHT.bold }}>
            {g.net_balance > 0 ? '+' : ''}₹{Math.abs(g.net_balance).toFixed(2)}
          </Text>
        </View>
      ))}
      <View style={styles.dangerActions}>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('idle')}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={() => setStep('force_confirm')}>
          <Text style={styles.dangerBtnText}>Reset anyway</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (step === 'force_confirm') return (
    <View style={[styles.card, { borderColor: COLORS.danger + '40' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.danger }]}>This cannot be undone. Are you sure?</Text>
      <View style={[styles.dangerActions, { marginTop: SPACING.md }]}>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('idle')}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleForceReset} disabled={loading}>
          <Text style={styles.dangerBtnText}>{loading ? 'Resetting…' : 'Yes, wipe my data'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (step === 'confirm') return (
    <View style={[styles.card, { borderColor: COLORS.danger + '40' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Reset all your data?</Text>
      <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>
        Permanently deletes all your expenses, income, loans and borrows. Your account stays active.
      </Text>
      <View style={styles.dangerActions}>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('idle')}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset} disabled={loading}>
          <Text style={styles.dangerBtnText}>{loading ? 'Checking…' : 'Reset my data'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { borderColor: COLORS.danger + '22' }]}>
      <Row icon={Icons.trash} label="Reset My Data" sub="Delete all expenses, income, loans and group data" onPress={() => setStep('confirm')} danger last />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();
  const [groups,        setGroups]        = useState([]);
  const [netBalance,    setNetBalance]    = useState(null);
  const [showEdit,      setShowEdit]      = useState(false);
  const [showPwd,       setShowPwd]       = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const initials = (user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  useFocusEffect(useCallback(() => {
    async function loadStats() {
      try {
        const { data: groupList } = await client.get(ENDPOINTS.groups);
        setGroups(groupList);
        if (!groupList.length) { setNetBalance(0); return; }

        const { data: bulkResult } = await client.post(ENDPOINTS.settlementsBulk, {
          group_ids: groupList.map(g => g.group_id),
        });
        let owe = 0, owed = 0;
        Object.values(bulkResult).forEach(rows => {
          const myRow = rows.find(s => s.user_id === user?.user_id);
          if (!myRow) return;
          const net = Number(myRow.net_balance);
          if (net < 0) owe  += Math.abs(net);
          if (net > 0) owed += net;
        });
        setNetBalance(owed - owe);
      } catch {
        setNetBalance(null);
      }
    }
    loadStats();
  }, [user?.user_id]));

  const netColor =
    netBalance === null ? COLORS.text2  :
    netBalance > 0      ? COLORS.success :
    netBalance < 0      ? COLORS.danger  :
    COLORS.text2;

  const netLabel =
    netBalance === null ? '—'                               :
    netBalance > 0      ? `+₹${fmt(netBalance)}`            :
    netBalance < 0      ? `-₹${fmt(Math.abs(netBalance))}`  :
    '₹0';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Account" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{user?.name}</Text>
              {user?.role === 'admin' && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            {user?.upi_id ? <Text style={styles.heroUpi}>{user.upi_id}</Text> : null}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{groups.length}</Text>
            <Text style={styles.statLbl}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: netColor }]}>{netLabel}</Text>
            <Text style={styles.statLbl}>Net Balance</Text>
          </View>
        </View>

        {/* ── ACCOUNT ── */}
        <SectionLabel title="ACCOUNT" />
        <View style={styles.card}>
          <Row icon={Icons.edit} label="Edit Profile"    sub="Update name, email, UPI ID"       onPress={() => setShowEdit(true)} />
          <Row icon={Icons.lock} label="Change Password" sub="Update your login credentials"    onPress={() => setShowPwd(true)}  last />
        </View>

        {/* ── SHORTCUTS ── */}
        <SectionLabel title="SHORTCUTS" />
        <View style={styles.card}>
          <Row icon={Icons.bell} label="Notifications" sub="Reminders and activity alerts"
               onPress={() => navigation.navigate('Notifications')} />
          <Row icon={Icons.activity} label="Activity"      sub="Your complete financial timeline"
               onPress={() => navigation.navigate('More', { screen: 'Activity' })} />
          <Row icon={Icons.settlements} label="Settle Up"     sub="View and clear outstanding balances"
               onPress={() => navigation.navigate('More', { screen: 'Settlements' })} last />
        </View>

        {/* ── PREFERENCES ── */}
        <SectionLabel title="PREFERENCES" />
        <View style={styles.card}>
          <Row
            icon={Icons.moon}
            label="Theme"
            sub="Dark mode (mobile always uses dark)"
            last
            right={
              <View style={styles.themeBadge}>
                <Text style={styles.themeBadgeText}>Dark</Text>
              </View>
            }
          />
        </View>

        {/* ── SESSION ── */}
        <SectionLabel title="SESSION" />
        <View style={styles.card}>
          {!logoutConfirm ? (
            <Row icon={Icons.logout} label="Sign Out" sub="Sign out of this device" onPress={() => setLogoutConfirm(true)} danger last />
          ) : (
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Confirm sign out?</Text>
                <Text style={styles.rowSub}>You'll need to log in again.</Text>
                <View style={[styles.dangerActions, { marginTop: SPACING.md }]}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setLogoutConfirm(false)}>
                    <Text style={styles.ghostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
                    <Text style={styles.dangerBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── DANGER ZONE ── */}
        <SectionLabel title="DANGER ZONE" />
        <DangerZone />

        {/* ── ABOUT ── */}
        <SectionLabel title="ABOUT" />
        <View style={styles.card}>
          {[
            { label: 'App',     value: 'SplitEase'           },
            { label: 'Version', value: '2.1.0'               },
            { label: 'Stack',   value: 'React Native + Expo' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.aboutRow, i < arr.length - 1 && styles.aboutRowBorder]}>
              <Text style={styles.rowSub}>{item.label}</Text>
              <Text style={styles.rowLabel}>{item.value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <EditProfileModal
        user={user}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={async freshUser => { await updateUser(freshUser); }}
      />
      <ChangePasswordModal
        visible={showPwd}
        onClose={() => setShowPwd(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING['3xl'] },

  // ── Hero ──
  hero: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, flexDirection: 'row',
    alignItems: 'center', gap: SPACING.base,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 16, flexShrink: 0,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 22, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  heroInfo:    { flex: 1, gap: 3 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  heroEmail:   { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  heroUpi:     { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  roleBadge: {
    backgroundColor: 'rgba(37,99,235,0.15)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleBadgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },

  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  statLbl: { fontSize: FONT_SIZE.xs, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },

  // ── Section label ──
  sectionLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.9,
    textTransform: 'uppercase', color: COLORS.text3,
    paddingTop: SPACING.sm, paddingBottom: SPACING.xs, paddingHorizontal: SPACING.xs,
  },

  // ── Card / rows ──
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLast:    { borderBottomWidth: 0 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  rowContent: { flex: 1 },
  rowLabel:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, color: COLORS.text },
  rowSub:     { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  chevron:    { color: COLORS.text3, fontSize: FONT_SIZE.lg },

  // ── Theme badge ──
  themeBadge: {
    backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  themeBadgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  // ── About rows ──
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md },
  aboutRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },

  // ── Danger zone internals ──
  pendingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dangerActions: { flexDirection: 'row', gap: SPACING.sm },
  ghostBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  ghostBtnText: { color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm },
  dangerBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.danger,
  },
  dangerBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm },

  // ── Modals ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBg:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, gap: SPACING.base,
  },
  modalHandle:  { width: 36, height: 4, backgroundColor: COLORS.border2, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.sm },
  modalTitle:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  modalFields:  { gap: SPACING.base },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  errorText:    { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  strengthBar:  { height: 3, borderRadius: 2, marginTop: 6, width: '60%' },
});