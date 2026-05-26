// SplitEase/mobile/src/screens/settings/SettingsScreen.jsx

/**
 * SettingsScreen.jsx
 *
 * Matches web Settings.jsx:
 * - Profile summary card with "View Profile" link
 * - Appearance section (dark only on mobile — no CSS vars to toggle)
 * - Account: Edit Profile, Change Password → navigate to ProfileScreen
 * - Session: Sign Out with confirm
 * - Danger Zone: Reset My Data with backend flow
 * - About section
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import ScreenHeader from '../../components/layout/ScreenHeader';

// ── Section header ────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

// ── Setting row ────────────────────────────────────────────────────────────
function SettingRow({ icon, label, sub, onPress, danger, last, rightElement }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {rightElement || (onPress && !rightElement && (
        <Text style={styles.chevron}>›</Text>
      ))}
    </Wrapper>
  );
}

// ── Danger zone with reset flow (matches web DangerZone component) ─────────
function DangerZone() {
  const { logout } = useAuth();
  const navigation = useNavigation();
  const [step,    setStep]    = useState('idle'); // idle | confirm | pending | force_confirm | done
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
    <View style={[styles.card, { borderColor: COLORS.success + '50' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.success }]}>✓ Data reset complete</Text>
      <Text style={[styles.rowSub, { marginTop: 4 }]}>Your financial data has been cleared.</Text>
      <TouchableOpacity
        style={[styles.textBtn, { marginTop: SPACING.md }]}
        onPress={() => { logout(); }}
      >
        <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold }}>Sign out now</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'pending') return (
    <View style={[styles.card, { borderColor: COLORS.warning + '50' }]}>
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
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={() => setStep('force_confirm')}
        >
          <Text style={styles.dangerBtnText}>Reset anyway</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (step === 'force_confirm') return (
    <View style={[styles.card, { borderColor: COLORS.danger + '50' }]}>
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
    <View style={[styles.card, { borderColor: COLORS.danger + '50' }]}>
      <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Reset all your data?</Text>
      <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>
        This permanently deletes all your expenses, income, loans, and borrows. Your account stays active.
      </Text>
      <View style={styles.dangerActions}>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('idle')}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset} disabled={loading}>
          <Text style={styles.dangerBtnText}>{loading ? 'Checking…' : '🗑️ Reset my data'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { borderColor: COLORS.danger + '22' }]}>
      <SettingRow
        icon="🗑️"
        label="Reset My Data"
        sub="Delete all your expenses, income, loans and group data"
        onPress={() => setStep('confirm')}
        danger
        last
      />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation       = useNavigation();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const initials = (user?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  function handleLogout() {
    logout();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Settings" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile summary — matches web Settings profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.viewProfileText}>👤 View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <SectionHeader title="APPEARANCE" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Text style={{ fontSize: 16 }}>🌙</Text></View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Theme</Text>
              <Text style={styles.rowSub}>Dark mode (mobile always uses dark)</Text>
            </View>
            <View style={[styles.themeBadge]}>
              <Text style={styles.themeBadgeText}>Dark</Text>
            </View>
          </View>
        </View>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.card}>
          <SettingRow
            icon="👤" label="Edit Profile"     sub="Update name, email, UPI ID"
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingRow
            icon="🔒" label="Change Password"  sub="Update your login credentials"
            onPress={() => navigation.navigate('Profile')}
            last
          />
        </View>

        {/* Notifications shortcut */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.card}>
          <SettingRow
            icon="🔔" label="Notifications" sub="View all your alerts"
            onPress={() => navigation.navigate('Notifications')}
            last
          />
        </View>

        {/* Session */}
        <SectionHeader title="SESSION" />
        <View style={styles.card}>
          {!logoutConfirm ? (
            <SettingRow
              icon="🚪" label="Sign Out" sub="Sign out of this device"
              onPress={() => setLogoutConfirm(true)} danger last
            />
          ) : (
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: COLORS.danger }]}>Confirm sign out?</Text>
                <Text style={styles.rowSub}>You'll need to log in again.</Text>
                <View style={[styles.dangerActions, { marginTop: SPACING.md }]}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setLogoutConfirm(false)}>
                    <Text style={styles.ghostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
                    <Text style={styles.dangerBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Danger zone */}
        <SectionHeader title="DANGER ZONE" />
        <DangerZone />

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          {[
            { label: 'App',     value: 'SplitEase' },
            { label: 'Version', value: '2.1.0' },
            { label: 'Stack',   value: 'React Native + Expo' },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.aboutRow, i < arr.length - 1 && styles.aboutRowBorder]}>
              <Text style={styles.rowSub}>{row.label}</Text>
              <Text style={styles.rowLabel}>{row.value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING['3xl'] },

  sectionTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.9,
    textTransform: 'uppercase', color: COLORS.text3,
    paddingTop: SPACING.base, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.xs,
  },

  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, flexDirection: 'row',
    alignItems: 'center', gap: SPACING.md,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  profileAvatarText: { fontSize: 18, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  profileInfo:       { flex: 1 },
  profileName:       { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  profileEmail:      { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  viewProfileBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  viewProfileText: { fontSize: FONT_SIZE.xs, color: COLORS.text2, fontWeight: FONT_WEIGHT.medium },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLast: { borderBottomWidth: 0 },
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

  themeBadge: {
    backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  themeBadgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md },
  aboutRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },

  textBtn:  { alignSelf: 'flex-start' },
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
});