// SplitEase/mobile/src/screens/settings/ProfileScreen.jsx

/**
 * ProfileScreen.jsx
 *
 * Matches web Profile.jsx:
 * - Avatar with initials
 * - Name, email, UPI ID, role
 * - Edit Profile form (PUT /users/me)
 * - Change Password form (POST /auth/change-password)
 * - Net balance stat using POST /settlements/bulk
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { Icons } from '../../constants/icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────
function EditProfileModal({ user, visible, onClose, onSave }) {
  const [form,    setForm]    = useState({ name: user?.name || '', email: user?.email || '', upi_id: user?.upi_id || '' });
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

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
            <Input label="Full Name"    value={form.name}   onChangeText={v => set('name', v)}   placeholder="Your display name" autoCapitalize="words" />
            <Input label="Email"        value={form.email}  onChangeText={v => set('email', v)}  placeholder="you@college.edu" keyboardType="email-address" />
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
                <View style={[styles.strengthBar, { backgroundColor: strengthColor }]}
                  // Width proportional to strength
                />
              )}
            </View>
            <Input label="Confirm New Password" value={form.confirm} onChangeText={v => set('confirm', v)} secureTextEntry
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

// ── Detail row ─────────────────────────────────────────────────────────────
// function DetailRow({ label, value, last }) {
//   return (
//     <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
//       <Text style={styles.detailLabel}>{label}</Text>
//       <Text style={[styles.detailValue, !value && { color: COLORS.text3, fontStyle: 'italic' }]}>
//         {value || 'Not set'}
//       </Text>
//     </View>
//   );
// }

// ── Detail row ─────────────────────────────────────────────────────────────
function DetailRow({ label, value, last, icon: IconComp }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {IconComp && <IconComp size={16} color={COLORS.text3} />}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, !value && { color: COLORS.text3, fontStyle: 'italic' }]}>
        {value || 'Not set'}
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const [groups,     setGroups]     = useState([]);
  const [netBalance, setNetBalance] = useState(null);
  const [showEdit,   setShowEdit]   = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);

  const initials = (user?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

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

  async function handleProfileSave(freshUser) {
    await updateUser(freshUser);
  }

  const netColor =
    netBalance === null ? COLORS.text2  :
    netBalance > 0      ? COLORS.success :
    netBalance < 0      ? COLORS.danger  :
    COLORS.text2;

  const netLabel =
    netBalance === null ? '—' :
    netBalance > 0      ? `+₹${fmt(netBalance)}` :
    netBalance < 0      ? `-₹${fmt(Math.abs(netBalance))}` :
    '₹0';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Profile" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero card */}
        <View style={styles.heroCard}>
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
            {user?.upi_id && <Text style={styles.heroUpi}>{user.upi_id}</Text>}
          </View>
          <View style={styles.heroActions}>
            <Button title="Edit Profile"    onPress={() => setShowEdit(true)} variant="ghost" size="sm" />
            <Button title="Change Password" onPress={() => setShowPwd(true)}  variant="ghost" size="sm" style={{ marginTop: 6 }} />
          </View>
        </View>

        {/* Stats */}
        {/* <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{groups.length}</Text>
            <Text style={styles.statLbl}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: netColor }]}>{netLabel}</Text>
            <Text style={styles.statLbl}>Net Balance</Text>
          </View>
        </View> */}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{groups.length}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icons.users size={12} color={COLORS.text3} />
              <Text style={styles.statLbl}>Groups</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: netColor }]}>{netLabel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icons.wallet size={12} color={COLORS.text3} />
              <Text style={styles.statLbl}>Net Balance</Text>
            </View>
          </View>
        </View>

        {/* Account details */}
        {/* <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>Account Details</Text>
          <DetailRow label="Display Name" value={user?.name} />
          <DetailRow label="Email"        value={user?.email} />
          <DetailRow label="UPI ID"       value={user?.upi_id} />
          <DetailRow label="Role"         value={user?.role} last />
        </View> */}

        {/* Account details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>Account Details</Text>
          <DetailRow label="Display Name" value={user?.name}   icon={Icons.edit} />
          <DetailRow label="Email"        value={user?.email}  icon={Icons.mail} />
          <DetailRow label="UPI ID"       value={user?.upi_id} icon={Icons.upi} />
          <DetailRow label="Role"         value={user?.role}   icon={Icons.check} last />
        </View>

      </ScrollView>

      <EditProfileModal
        user={user}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleProfileSave}
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
  scroll: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING['3xl'] },

  heroCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, flexDirection: 'row',
    alignItems: 'flex-start', gap: SPACING.base, flexWrap: 'wrap',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20, flexShrink: 0,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 26, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  heroInfo:    { flex: 1, gap: 3, minWidth: 120 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  heroEmail:   { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  heroUpi:     { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  heroActions: { gap: 6, width: '100%' },

  roleBadge: {
    backgroundColor: 'rgba(37,99,235,0.15)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleBadgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },

  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  statLbl: { fontSize: FONT_SIZE.xs, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },

  detailCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  detailCardTitle: {
    padding: SPACING.md, paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, paddingHorizontal: SPACING.base },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text3, fontWeight: FONT_WEIGHT.medium },
  detailValue: { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: FONT_WEIGHT.medium },

  // Modal
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