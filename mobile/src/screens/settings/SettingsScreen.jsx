// SplitEase/mobile/src/screens/settings/SettingsScreen.jsx
//
// Industry-standard Settings screen.
// Follows the iOS Settings / Linear / Vercel aesthetic:
//   • Minimal hero — avatar + name + email only
//   • Full-bleed grouped list sections, hairline dividers
//   • No duplicate Account editing — "View Account" navigates there
//   • Sections: Profile → App → Notifications → Session → About
//   • Danger zone deferred to AccountScreen (single source of truth)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  TAB_BAR_HEIGHT,
} from "../../constants/theme";
import ScreenHeader from "../../components/layout/ScreenHeader";

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 44 }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: Math.round(size * 0.28) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.38) }]}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return (
    <Text style={styles.sectionLabel}>{title}</Text>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────
function Row({
  icon: IconComp,
  iconBg,
  iconColor,
  label,
  sub,
  value,
  onPress,
  danger,
  last,
  right,
  noChevron,
  plainSeparator,
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <>
      <Wrap
        style={[styles.row, danger && styles.rowDanger]}
        onPress={onPress}
        activeOpacity={0.6}
      >
        {IconComp && (
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: iconBg || COLORS.surface2 },
            ]}
          >
            <IconComp
              size={16}
              color={danger ? COLORS.danger : iconColor || COLORS.text2}
            />
          </View>
        )}
        <View style={styles.rowContent}>
          <Text
            style={[
              styles.rowLabel,
              danger && { color: COLORS.danger },
            ]}
          >
            {label}
          </Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        {right !== undefined ? (
          right
        ) : value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : onPress && !noChevron ? (
          <Icons.chevronRight size={14} color={COLORS.text3} />
        ) : null}
      </Wrap>
      {!last && (
        <View style={plainSeparator ? styles.separatorFull : styles.separator} />
      )}
    </>
  );
}

// ─── Group (full-bleed bordered section) ──────────────────────────────────────
function Group({ children, danger }) {
  return (
    <View style={[styles.group, danger && styles.groupDanger]}>
      {children}
    </View>
  );
}

// ─── Sign-out confirm ─────────────────────────────────────────────────────────
function SignOutRow() {
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <View style={styles.confirmBlock}>
        <View>
          <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
            Sign out of SplitEase?
          </Text>
          <Text style={[styles.rowSub, { marginTop: 3 }]}>
            You'll need to log in again.
          </Text>
        </View>
        <View style={styles.confirmActions}>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => setConfirm(false)}
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
            <Text style={styles.dangerBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Row
      icon={Icons.logout}
      iconBg="rgba(239,68,68,0.10)"
      label="Sign Out"
      onPress={() => setConfirm(true)}
      danger
      last
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_HEIGHT + SPACING["2xl"] },
        ]}
      >
        {/* ── Profile hero ── */}
        <TouchableOpacity
          style={styles.profileHero}
          onPress={() => navigation.navigate("Account")}
          activeOpacity={0.7}
        >
          <Avatar name={user?.name} size={52} />
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{user?.name || "—"}</Text>
            <Text style={styles.profileEmail}>{user?.email || ""}</Text>
          </View>
          <View style={styles.profileChevronWrap}>
            <Icons.chevronRight size={15} color={COLORS.text3} />
          </View>
        </TouchableOpacity>

        <View style={styles.heroNote}>
          <Text style={styles.heroNoteText}>
            Tap to view account, edit profile, or change password
          </Text>
        </View>

        {/* ── App ── */}
        <SectionLabel title="APP" />
        <Group>
          <Row
            icon={Icons.moon}
            iconBg={COLORS.surface2}
            iconColor={COLORS.text2}
            label="Theme"
            right={
              <View style={styles.themePill}>
                <Text style={styles.themePillText}>Dark</Text>
              </View>
            }
            noChevron
            last
          />
        </Group>

        {/* ── Notifications ── */}
        <SectionLabel title="NOTIFICATIONS" />
        <Group>
          <Row
            icon={Icons.bell}
            iconBg="rgba(239,68,68,0.10)"
            iconColor="#f87171"
            label="Notifications"
            sub="Reminders and alerts"
            onPress={() => navigation.navigate("Notifications")}
            last
          />
        </Group>

        {/* ── Admin (only visible to admin accounts) ── */}
        {user?.role === 'admin' && (
          <>
            <SectionLabel title="ADMIN" />
            <Group>
              <Row
                icon={Icons.info}
                iconBg="rgba(37,99,235,0.12)"
                iconColor={COLORS.primaryH}
                label="Admin Panel"
                sub="Users, groups, transactions, danger zone"
                onPress={() => navigation.navigate('AdminOverview')}
                last
              />
            </Group>
          </>
        )}


        {/* ── Account links ── */}
        <SectionLabel title="ACCOUNT" />
        <Group>
          <Row
            icon={Icons.edit}
            iconBg="rgba(37,99,235,0.12)"
            iconColor={COLORS.primaryH}
            label="Edit Profile"
            sub="Name, email, UPI ID"
            onPress={() => navigation.navigate("Account")}
          />
          <Row
            icon={Icons.lock}
            iconBg="rgba(124,58,237,0.12)"
            iconColor="#a78bfa"
            label="Change Password"
            sub="Update login credentials"
            onPress={() => navigation.navigate("Account")}
          />
          <Row
            icon={Icons.trash}
            iconBg="rgba(239,68,68,0.10)"
            iconColor={COLORS.danger}
            label="Reset My Data"
            sub="Delete all expenses, income and group data"
            onPress={() => navigation.navigate("Account")}
            danger
            last
          />
        </Group>

        {/* ── Session ── */}
        <SectionLabel title="SESSION" />
        <Group danger>
          <SignOutRow />
        </Group>


        <Text style={styles.footer}>
          Made with care · SplitEase © 2025
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  scroll: {
    paddingTop: SPACING.base,
  },

  // ── Profile hero
  profileHero: {
    marginHorizontal: SPACING.base,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md + 2,
    gap: SPACING.md,
  },
  avatar: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: 0.3,
  },
  profileText: { flex: 1, gap: 3 },
  profileName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
  },
  profileChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  heroNote: {
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  heroNoteText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
  },

  // ── Section label
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.text3,
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs + 2,
  },

  // ── Group
  group: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  groupDanger: {
    borderColor: "rgba(239,68,68,0.18)",
  },

  // ── Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: 13,
    gap: SPACING.md,
    minHeight: 52,
  },
  rowDanger: {},
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.base + 36 + SPACING.md,
  },
  separatorFull: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  rowSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.medium,
  },

  // ── Theme pill
  themePill: {
    backgroundColor: "rgba(37,99,235,0.10)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
  },
  themePillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primaryH,
  },

  // ── Sign out confirm
  confirmBlock: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    gap: SPACING.md,
  },
  confirmActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  ghostBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  ghostBtnText: {
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  dangerBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
  },
  dangerBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },

  // ── Footer
  footer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    textAlign: "center",
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
});