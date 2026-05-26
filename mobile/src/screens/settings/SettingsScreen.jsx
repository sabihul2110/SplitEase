// SplitEase/mobile/src/screens/settings/SettingsScreen.jsx

/**
 * SettingsScreen.jsx
 * Profile info, notifications shortcut, data reset, logout.
 * Admin sees additional admin-only options.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, Card, Divider } from '../../components/common/ui';
import ScreenHeader from '../../components/layout/ScreenHeader';

// ── Setting row ────────────────────────────────────────────────────────────
function SettingRow({ icon, label, sublabel, onPress, color, rightElement, showChevron = true }) {
  const textColor = color || COLORS.text;
  const Wrapper   = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: (color || COLORS.primary) + '22' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSub}>{sublabel}</Text>}
      </View>
      {rightElement || (showChevron && onPress && (
        <Text style={styles.chevron}>›</Text>
      ))}
    </Wrapper>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionCard}>
        {React.Children.map(children, (child, i) => (
          <>
            {child}
            {i < React.Children.count(children) - 1 && (
              <View style={styles.rowDivider} />
            )}
          </>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation       = useNavigation();
  const [resetting,      setResetting] = useState(false);
  const [wiping,         setWiping]    = useState(false);
  const isAdmin          = user?.role === 'admin';

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  }

  async function handleResetData() {
    Alert.alert(
      'Reset My Data',
      'This will delete all your expenses and payment history. Groups you created will remain. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await client.post(ENDPOINTS.resetData);
              Alert.alert('Done', 'Your data has been reset.');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to reset data');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  }

  async function handleAdminWipe() {
    Alert.alert(
      '⚠️ Admin Wipe',
      'This will delete ALL data across ALL users. This is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: async () => {
            setWiping(true);
            try {
              await client.post(ENDPOINTS.adminWipe);
              Alert.alert('Done', 'All data has been wiped.');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to wipe data');
            } finally {
              setWiping(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.name} size={60} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {user?.upi_id && (
              <Text style={styles.profileUpi}>{user.upi_id}</Text>
            )}
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingRow
            icon="🔔"
            label="Notifications"
            sublabel="View all your alerts"
            onPress={() => navigation.navigate('Notifications')}
            color={COLORS.primary}
          />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <SettingRow
            icon="ℹ️"
            label="App Version"
            sublabel="1.0.0"
            showChevron={false}
            color={COLORS.text3}
          />
          <SettingRow
            icon="🌐"
            label="Backend"
            sublabel="splitease-kfda.onrender.com"
            showChevron={false}
            color={COLORS.text3}
          />
        </Section>

        {/* Danger zone */}
        <Section title="DANGER ZONE">
          <SettingRow
            icon="🗑️"
            label={resetting ? 'Resetting…' : 'Reset My Data'}
            sublabel="Delete your expenses & payment history"
            onPress={resetting ? null : handleResetData}
            color={COLORS.warning}
          />
          {isAdmin && (
            <SettingRow
              icon="☢️"
              label={wiping ? 'Wiping…' : 'Admin: Wipe All Data'}
              sublabel="Delete everything for all users"
              onPress={wiping ? null : handleAdminWipe}
              color={COLORS.danger}
            />
          )}
        </Section>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          SplitEase · Built with React Native + Expo
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.base, gap: SPACING.lg, paddingBottom: SPACING['3xl'] },

  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, flexDirection: 'row', alignItems: 'center', gap: SPACING.base,
  },
  profileInfo:  { flex: 1, gap: 3 },
  profileName:  { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  profileEmail: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  profileUpi:   { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  adminBadge: {
    backgroundColor: '#1d3a7a', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4,
  },
  adminBadgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },

  section:      { gap: SPACING.sm },
  sectionTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text3, letterSpacing: 1, paddingHorizontal: SPACING.xs,
  },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  rowSub:     { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
  chevron:    { color: COLORS.text3, fontSize: FONT_SIZE.lg },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 58 },

  logoutBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.danger + '60',
    padding: SPACING.md, alignItems: 'center',
  },
  logoutText: { color: COLORS.danger, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

  footer: {
    textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.text3,
    marginTop: -SPACING.sm,
  },
});