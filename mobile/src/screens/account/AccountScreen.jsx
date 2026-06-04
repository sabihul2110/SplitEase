// SplitEase/mobile/src/screens/account/AccountScreen.jsx
//
// Premium redesign — full-bleed grouped list (iOS Settings / Linear / Vercel style).
// No rounded card-per-section. Sections separated by thin dividers and
// flush background shifts. Hero is minimal and typographic.
//
// OTA update is handled inline via UpdateRow — no separate modal needed.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  TAB_BAR_HEIGHT,
} from '../../constants/theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Icons } from '../../components/icons/icons';
import { useOTAUpdate } from '../../hooks/useOTAUpdate';

// ─── Design tokens (scoped) ────────────────────────────────────────────────────
const C = {
  bg:        '#0d0e14',
  surface:   '#13141c',
  surface2:  '#1a1c26',
  divider:   '#1e2030',
  border:    '#252730',
  border2:   '#31333f',
  primary:   '#2563eb',
  primaryH:  '#3b82f6',
  primaryLo: 'rgba(59,130,246,0.10)',
  success:   '#10b981',
  successLo: 'rgba(16,185,129,0.10)',
  danger:    '#ef4444',
  dangerLo:  'rgba(239,68,68,0.10)',
  warning:   '#f59e0b',
  warningLo: 'rgba(245,158,11,0.10)',
  text:      '#f0f1f5',
  text2:     '#9095a8',
  text3:     '#4e5260',
  white:     '#ffffff',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtAmt(n) {
  const abs = Math.abs(Number(n || 0));
  return abs % 1 === 0
    ? abs.toLocaleString('en-IN')
    : abs.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 52 }) {
  const inits = (name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.26 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{inits}</Text>
    </View>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHead({ title, danger }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionHeadText, danger && { color: C.danger }]}>{title}</Text>
    </View>
  );
}

// ─── Full-bleed list row ───────────────────────────────────────────────────────
function Row({
  IconComp,
  iconColor,
  iconBg,
  label,
  sub,
  value,
  onPress,
  danger,
  last,
  right,
  chevron = true,
  disabled,
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.row, last && styles.rowLast, disabled && { opacity: 0.5 }]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.65}
    >
      {IconComp && (
        <View style={[styles.rowIcon, { backgroundColor: iconBg || C.surface2 }]}>
          <IconComp size={16} color={danger ? C.danger : iconColor || C.text2} />
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: C.danger }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right !== undefined ? (
        right
      ) : value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress && chevron ? (
        <Icons.chevronRight size={14} color={C.text3} />
      ) : null}
    </Wrap>
  );
}

// ─── Thin section gap ──────────────────────────────────────────────────────────
function SectionGap() {
  return <View style={styles.sectionGap} />;
}

// ─── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <View style={styles.errorBanner}>
      <Icons.info size={12} color={C.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// ─── OTA Update Row ─────────────────────────────────────────────────────────
// This is the heart of the update UI. It lives inline in the Preferences section.
// States it renders:
//   idle / up_to_date  → "Check for Updates" tap target
//   checking           → spinner + "Checking…"
//   available          → "Update Available" with Download pill
//   downloading        → animated progress bar with percentage
//   ready              → "Restart to Update" with green Ready pill
//   error              → "Check failed" with Retry
function UpdateRow({ last }) {
  const {
    state,
    isChecking,
    isDownloading,
    isReady,
    progress,
    errorMsg,
    checkForUpdate,
    downloadUpdate,
    restartApp,
  } = useOTAUpdate();

  // ── Downloading: full-width progress bar row ─────────────────────────────
  if (isDownloading) {
    const pct = Math.round((progress || 0) * 100);
    return (
      <View style={[styles.row, last && styles.rowLast, { flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingVertical: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <View style={[styles.rowIcon, { backgroundColor: C.primaryLo }]}>
            <Icons.refresh size={16} color={C.primaryH} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Downloading update…</Text>
            <Text style={styles.rowSub}>{pct}% — please keep the app open</Text>
          </View>
          <Text style={{ fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: C.primaryH, minWidth: 36, textAlign: 'right' }}>
            {pct}%
          </Text>
        </View>
        {/* Progress bar */}
        <View style={{ paddingLeft: 36 + SPACING.md }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>
    );
  }

  // ── Ready to restart ──────────────────────────────────────────────────────
  if (isReady) {
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg={C.successLo}
        iconColor={C.success}
        label="Restart to Update"
        sub="Update ready — tap to apply and restart"
        onPress={restartApp}
        last={last}
        right={
          <View style={[styles.pillBadge, { borderColor: 'rgba(16,185,129,0.30)', backgroundColor: C.successLo }]}>
            <Text style={[styles.pillText, { color: C.success }]}>Ready</Text>
          </View>
        }
      />
    );
  }

  // ── Update available, not yet downloading ─────────────────────────────────
  if (state === 'available') {
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg={C.primaryLo}
        iconColor={C.primaryH}
        label="Update Available"
        sub="A new version is ready to download"
        onPress={downloadUpdate}
        last={last}
        right={
          <View style={[styles.pillBadge, { borderColor: 'rgba(59,130,246,0.30)', backgroundColor: C.primaryLo }]}>
            <Text style={[styles.pillText, { color: C.primaryH }]}>Download</Text>
          </View>
        }
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg={C.dangerLo}
        iconColor={C.danger}
        label="Check failed"
        sub={errorMsg || 'Could not reach update server'}
        onPress={checkForUpdate}
        last={last}
        right={
          <View style={[styles.pillBadge, { borderColor: 'rgba(239,68,68,0.30)' }]}>
            <Text style={[styles.pillText, { color: C.danger }]}>Retry</Text>
          </View>
        }
      />
    );
  }

  // ── Up to date ────────────────────────────────────────────────────────────
  if (state === 'up_to_date') {
    return (
      <Row
        IconComp={Icons.checkCircle}
        iconBg={C.successLo}
        iconColor={C.success}
        label="You're up to date"
        sub="Check again anytime"
        onPress={checkForUpdate}
        last={last}
        right={
          <View style={[styles.pillBadge, { borderColor: 'rgba(16,185,129,0.20)', backgroundColor: C.successLo }]}>
            <Text style={[styles.pillText, { color: C.success }]}>✓ Latest</Text>
          </View>
        }
      />
    );
  }

  // ── Checking ─────────────────────────────────────────────────────────────
  if (isChecking) {
    return (
      <View style={[styles.row, last && styles.rowLast]}>
        <View style={[styles.rowIcon, { backgroundColor: C.surface2 }]}>
          <ActivityIndicator size="small" color={C.primaryH} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>Checking for updates…</Text>
          <Text style={styles.rowSub}>Contacting update server</Text>
        </View>
      </View>
    );
  }

  // ── Idle (default) ────────────────────────────────────────────────────────
  return (
    <Row
      IconComp={Icons.refresh}
      iconBg={C.surface2}
      iconColor={C.text2}
      label="Check for Updates"
      sub="Tap to check for the latest version"
      onPress={checkForUpdate}
      last={last}
    />
  );
}

// ─── Edit Profile modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, visible, onClose, onSave }) {
  const [form, setForm] = useState({
    name:   user?.name   || '',
    email:  user?.email  || '',
    upi_id: user?.upi_id || '',
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.close size={15} color={C.text2} />
            </TouchableOpacity>
          </View>
          <ErrorBanner msg={error} />
          <View style={{ gap: SPACING.md }}>
            <Input label="Full Name"         value={form.name}   onChangeText={v => set('name', v)}   placeholder="Display name" autoCapitalize="words" />
            <Input label="Email"             value={form.email}  onChangeText={v => set('email', v)}  placeholder="you@example.com" keyboardType="email-address" />
            <Input label="UPI ID (optional)" value={form.upi_id} onChangeText={v => set('upi_id', v)} placeholder="name@upi" hint="Used for settlement links" />
          </View>
          <View style={styles.sheetActions}>
            <Button title="Cancel"                       onPress={onClose}  variant="ghost" fullWidth />
            <Button title={saving ? 'Saving…' : 'Save'} onPress={submit}   loading={saving} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Change Password modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    if (!form.current)                return 'Current password is required.';
    if (form.newPwd.length < 6)       return 'New password must be at least 6 characters.';
    if (form.newPwd !== form.confirm)  return "Passwords don't match.";
    if (form.current === form.newPwd)  return 'New password must differ from current.';
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

  const pct    = Math.min((form.newPwd.length || 0) / 12, 1);
  const barClr = form.newPwd.length === 0 ? C.border2
    : form.newPwd.length < 6  ? C.danger
    : form.newPwd.length < 10 ? C.warning
    : C.success;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Change Password</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.close size={15} color={C.text2} />
            </TouchableOpacity>
          </View>
          <ErrorBanner msg={error} />
          <View style={{ gap: SPACING.md }}>
            <Input label="Current Password" value={form.current} onChangeText={v => set('current', v)} secureTextEntry />
            <View style={{ gap: 6 }}>
              <Input label="New Password" value={form.newPwd} onChangeText={v => set('newPwd', v)} secureTextEntry placeholder="Minimum 6 characters" />
              {form.newPwd.length > 0 && (
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: `${pct * 100}%`, backgroundColor: barClr }]} />
                </View>
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
          <View style={styles.sheetActions}>
            <Button title="Cancel"                              onPress={onClose}  variant="ghost" fullWidth />
            <Button title={saving ? 'Updating…' : 'Update'}   onPress={submit}   loading={saving} fullWidth />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Danger Zone (inline, step machine) ───────────────────────────────────────
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
    <View style={styles.inlineState}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icons.checkCircle size={15} color={C.success} />
        <Text style={[styles.rowLabel, { color: C.success }]}>Data reset complete</Text>
      </View>
      <Text style={[styles.rowSub, { marginTop: 4 }]}>Your financial data has been cleared.</Text>
      <TouchableOpacity onPress={logout} style={{ marginTop: SPACING.md }}>
        <Text style={{ color: C.primaryH, fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm }}>Sign out now</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'pending') return (
    <View style={styles.inlineState}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icons.info size={15} color={C.warning} />
        <Text style={[styles.rowLabel, { color: C.warning }]}>Unsettled balances</Text>
      </View>
      <Text style={[styles.rowSub, { marginBottom: SPACING.sm }]}>Resetting will remove your data from these groups:</Text>
      {pending.map(g => (
        <View key={g.group_id} style={styles.pendingRow}>
          <Text style={styles.rowSub}>{g.group_name}</Text>
          <Text style={{ color: g.net_balance > 0 ? C.success : C.danger, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.sm }}>
            {g.net_balance > 0 ? '+' : ''}₹{fmtAmt(g.net_balance)}
          </Text>
        </View>
      ))}
      <View style={[styles.inlineActions, { marginTop: SPACING.md }]}>
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
    <View style={styles.inlineState}>
      <Text style={[styles.rowLabel, { color: C.danger }]}>This cannot be undone.</Text>
      <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>All your data will be permanently deleted.</Text>
      <View style={styles.inlineActions}>
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
    <View style={styles.inlineState}>
      <Text style={[styles.rowLabel, { color: C.danger }]}>Reset all your data?</Text>
      <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>
        Permanently deletes all expenses, income, loans and borrows. Your account stays active.
      </Text>
      <View style={styles.inlineActions}>
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
    <Row
      IconComp={Icons.trash}
      iconBg="rgba(239,68,68,0.12)"
      iconColor={C.danger}
      label="Reset My Data"
      sub="Delete all expenses, income, loans and group data"
      onPress={() => setStep('confirm')}
      danger
      last
    />
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();

  const [groups,        setGroups]        = useState([]);
  const [netBalance,    setNetBalance]    = useState(null);
  const [showEdit,      setShowEdit]      = useState(false);
  const [showPwd,       setShowPwd]       = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
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
    }, [user?.user_id]),
  );

  const netColor = netBalance === null ? C.text2 : netBalance > 0 ? C.success : netBalance < 0 ? C.danger : C.text2;
  const netLabel =
    netBalance === null ? '—' :
    netBalance > 0      ? `+₹${fmtAmt(netBalance)}` :
    netBalance < 0      ? `-₹${fmtAmt(Math.abs(netBalance))}` :
    '₹0 — settled';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>

      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          style={styles.navBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icons.back size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Account</Text>
        <TouchableOpacity
          onPress={() => setShowEdit(true)}
          style={styles.navBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icons.edit size={16} color={C.text2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 + TAB_BAR_HEIGHT }}
      >

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Avatar name={user?.name} size={56} />
          <View style={styles.heroText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.heroName}>{user?.name}</Text>
              {user?.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            {user?.upi_id ? (
              <Text style={styles.heroUpi}>{user.upi_id}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Two stat pills ── */}
        <View style={styles.statRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillVal}>{groups.length}</Text>
            <Text style={styles.statPillLbl}>Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={[styles.statPillVal, { color: netColor }]}>{netLabel}</Text>
            <Text style={styles.statPillLbl}>Net Balance</Text>
          </View>
        </View>

        <SectionGap />

        {/* ── Profile ── */}
        <SectionHead title="Profile" />
        <View style={styles.group}>
          <Row
            IconComp={Icons.edit}
            iconBg="rgba(37,99,235,0.14)"
            iconColor={C.primaryH}
            label="Edit Profile"
            sub="Name, email, UPI ID"
            onPress={() => setShowEdit(true)}
          />
          <View style={styles.rowDivider} />
          <Row
            IconComp={Icons.lock}
            iconBg="rgba(124,58,237,0.14)"
            iconColor="#a78bfa"
            label="Change Password"
            sub="Update login credentials"
            onPress={() => setShowPwd(true)}
            last
          />
        </View>

        <SectionGap />

        {/* ── Navigate ── */}
        <SectionHead title="Navigate" />
        <View style={styles.group}>
          <Row
            IconComp={Icons.bell}
            iconBg="rgba(239,68,68,0.12)"
            iconColor="#f87171"
            label="Notifications"
            sub="Reminders and alerts"
            onPress={() => navigation.navigate('Notifications')}
          />
          <View style={styles.rowDivider} />
          <Row
            IconComp={Icons.activity}
            iconBg="rgba(249,115,22,0.12)"
            iconColor="#fb923c"
            label="Activity"
            sub="Complete financial timeline"
            onPress={() => navigation.navigate('More', { screen: 'Activity' })}
          />
          <View style={styles.rowDivider} />
          <Row
            IconComp={Icons.settlements}
            iconBg="rgba(16,185,129,0.12)"
            iconColor={C.success}
            label="Settle Up"
            sub="View and clear balances"
            onPress={() => navigation.navigate('More', { screen: 'Settlements' })}
            last
          />
        </View>

        <SectionGap />

        {/* ── Preferences ── */}
        <SectionHead title="Preferences" />
        <View style={styles.group}>
          <Row
            IconComp={Icons.moon}
            iconBg={C.surface2}
            iconColor={C.text2}
            label="Theme"
            sub="Always dark on mobile"
            chevron={false}
            right={
              <View style={styles.pill}>
                <Text style={styles.pillText}>Dark</Text>
              </View>
            }
          />
          <View style={styles.rowDivider} />
          <UpdateRow last />
        </View>

        <SectionGap />

        {/* ── Session ── */}
        <SectionHead title="Session" />
        <View style={styles.group}>
          {!logoutConfirm ? (
            <Row
              IconComp={Icons.logout}
              iconBg={C.dangerLo}
              iconColor={C.danger}
              label="Sign Out"
              sub="Sign out of this device"
              onPress={() => setLogoutConfirm(true)}
              danger
              last
            />
          ) : (
            <View style={[styles.row, styles.rowLast, { flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.md }]}>
              <View>
                <Text style={[styles.rowLabel, { color: C.danger }]}>Confirm sign out?</Text>
                <Text style={[styles.rowSub, { marginTop: 3 }]}>You'll need to log in again.</Text>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setLogoutConfirm(false)}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
                  <Text style={styles.dangerBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <SectionGap />

        {/* ── Danger Zone ── */}
        <SectionHead title="Danger Zone" danger />
        <View style={[styles.group, { borderColor: 'rgba(239,68,68,0.18)' }]}>
          <DangerZone />
        </View>

        <SectionGap />

        {/* ── About ── */}
        <SectionHead title="About" />
        <View style={styles.group}>
          {[
            { label: 'App',     value: 'SplitEase' },
            { label: 'Version', value: '2.1.0'     },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <Row label={item.label} value={item.value} last={i === arr.length - 1} chevron={false} />
              {i < arr.length - 1 && <View style={styles.rowDivider} />}
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
      <ChangePasswordModal visible={showPwd} onClose={() => setShowPwd(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  navBtn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: C.text,
    letterSpacing: 0.1,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.base,
    backgroundColor: C.bg,
  },
  avatar: {
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontWeight: FONT_WEIGHT.extrabold,
    color: C.white,
    letterSpacing: 0.3,
  },
  heroText: { flex: 1, gap: 3 },
  heroName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: C.text,
    letterSpacing: -0.3,
  },
  heroEmail: { fontSize: FONT_SIZE.sm, color: C.text2 },
  heroUpi:   { fontSize: FONT_SIZE.xs, color: C.text3 },
  adminBadge: {
    backgroundColor: C.primaryLo,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  adminBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: C.primaryH,
  },

  // Stat row
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.lg,
    backgroundColor: C.bg,
  },
  statPill:    { flex: 1, alignItems: 'center', gap: 4 },
  statPillVal: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: C.text,
    letterSpacing: -0.4,
  },
  statPillLbl: {
    fontSize: FONT_SIZE.xs,
    color: C.text3,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
    marginHorizontal: SPACING.base,
  },

  // Section gap
  sectionGap: { height: 32, backgroundColor: C.bg },

  // Section header
  sectionHead: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
    backgroundColor: C.bg,
  },
  sectionHeadText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.text3,
  },

  // Full-bleed group
  group: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: 14,
    gap: SPACING.md,
    minHeight: 56,
  },
  rowLast: {},
  rowDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginLeft: SPACING.base + 36 + SPACING.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody:  { flex: 1 },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: C.text,
  },
  rowSub: {
    fontSize: FONT_SIZE.xs,
    color: C.text3,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: FONT_SIZE.sm,
    color: C.text2,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Pills
  pill: {
    backgroundColor: C.surface2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border2,
  },
  pillBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.surface2,
  },
  pillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: C.text2,
  },

  // OTA progress bar
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.border,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: C.primaryH,
  },

  // Danger / pending inline states
  inlineState: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  inlineActions: { flexDirection: 'row', gap: SPACING.sm },
  ghostBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  ghostBtnText: {
    color: C.text2,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  dangerBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    backgroundColor: C.danger,
  },
  dangerBtnText: {
    color: C.white,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },

  // Password strength
  strengthTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 2 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: C.border,
    padding: SPACING.xl,
    gap: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: C.text,
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.dangerLo,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: C.danger,
    flex: 1,
  },
});