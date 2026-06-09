// SplitEase/mobile/src/screens/groups/GroupsScreen.jsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as groupsApi from "../../api/groups";
import * as settlementsApi from "../../api/settlements";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons/icons";
import { TAB_BAR_HEIGHT } from '../../constants/theme';
import AppAlert from "../../components/common/AppAlert";
import Toast from "../../components/common/Toast";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0d14",
  surface: "#111520",
  surface2: "#171c2c",
  surface3: "#1e2438",
  border: "#242a3d",
  border2: "#2e3650",
  primary: "#3b82f6",
  primaryLo: "rgba(59,130,246,0.10)",
  primaryMd: "rgba(59,130,246,0.18)",
  success: "#10b981",
  successLo: "rgba(16,185,129,0.10)",
  successMd: "rgba(16,185,129,0.18)",
  danger: "#ef4444",
  dangerLo: "rgba(239,68,68,0.10)",
  dangerMd: "rgba(239,68,68,0.18)",
  warning: "#f59e0b",
  warningLo: "rgba(245,158,11,0.10)",
  neutral: "#6b7280",
  neutralLo: "rgba(107,114,128,0.12)",
  text: "#f0f4ff",
  text2: "#8892b0",
  text3: "#4a5578",
  white: "#ffffff",
};
const F = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 26 };
const W = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
};
const R = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };
const SP = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  "#6366f1",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

function avatarColor(name = "") {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function GroupAvatar({ name, size = 48 }) {
  const bg = avatarColor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.35,
          fontWeight: W.heavy,
          color: "#fff",
          letterSpacing: 0.4,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

function MemberBubble({ name, size = 26, borderColor = C.surface }) {
  const bg = avatarColor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor,
      }}
    >
      <Text
        style={{ fontSize: size * 0.36, fontWeight: W.bold, color: "#fff" }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

function MemberStack({
  members = [],
  total = 0,
  size = 24,
  borderColor = C.surface,
}) {
  const preview = members.slice(0, 3);
  const extra = total - preview.length;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {preview.map((m, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.35,
            zIndex: preview.length - i,
          }}
        >
          <MemberBubble
            name={m.name || m}
            size={size}
            borderColor={borderColor}
          />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.35,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.surface3,
            borderWidth: 2,
            borderColor,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 0,
          }}
        >
          <Text
            style={{
              fontSize: size * 0.32,
              color: C.text2,
              fontWeight: W.bold,
            }}
          >
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Last-activity formatter ──────────────────────────────────────────────────
function formatActivity(ts) {
  if (!ts) return null;
  // If timestamp has no timezone info (no Z, no +), treat as UTC explicitly
  let date;
  if (typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+")) {
    date = new Date(ts + "Z");
  } else {
    date = new Date(ts);
  }
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 0) return "Just now";
  if (diff < 60) return "Active just now";
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Active yesterday";
  if (diff < 604800) return "Active this week";
  return `Active ${Math.floor(diff / 86400)}d ago`;
}

// ─── List Card ─────────────────────────────────────────────────────────────────

function ListCard({ group, onPress, onLongPress, isFirst, isLast, isSelectMode, isSelected }) {
  const memberCount = group.members?.length || group.member_count || 0;
  const activity = formatActivity(
    group.last_activity || group.updated_at || group.created_at,
  );
  // Check all possible field names the API might return
  const rawBalance =
    group.my_balance ??
    group.balance ??
    group.net_balance ??
    group.user_balance ??
    null;
  const balance = rawBalance !== null ? parseFloat(rawBalance) : null;

  let balColor = C.text2;
  let balLabel = "STATUS";
  let balAmount = "SETTLED";
  let isSettled = true;

  if (balance !== null && balance !== 0) {
    isSettled = false;
    if (balance > 0) {
      balColor = C.success;
      balLabel = "YOU ARE OWED";
      balAmount = `₹${Math.abs(balance).toFixed(2)}`;
    } else {
      balColor = C.danger;
      balLabel = "YOU OWE";
      balAmount = `₹${Math.abs(balance).toFixed(2)}`;
    }
  }

  return (
    <TouchableOpacity
      style={[
        lcStyles.card,
        isFirst && lcStyles.cardFirst,
        isLast && lcStyles.cardLast,
        isSelected && lcStyles.cardSelected,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.6}
    >
      {isSelectMode ? (
        <View style={[lcStyles.checkbox, isSelected && lcStyles.checkboxOn]}>
          {isSelected && <Icons.check size={13} color="#fff" />}
        </View>
      ) : (
        <GroupAvatar name={group.group_name} size={42} />
      )}
      <View style={lcStyles.info}>
        <Text style={lcStyles.name} numberOfLines={1}>
          {group.group_name}
        </Text>
        <View style={lcStyles.metaRow}>
          <Text style={lcStyles.meta}>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </Text>
          {activity && <Text style={lcStyles.dot}>·</Text>}
          {activity && <Text style={lcStyles.meta}>{activity}</Text>}
        </View>
      </View>
      <View style={lcStyles.balCol}>
        <Text
          style={[lcStyles.balLabel, { color: isSettled ? C.text3 : balColor }]}
        >
          {balLabel}
        </Text>
        <Text
          style={[
            lcStyles.balAmt,
            { color: balColor },
            isSettled && lcStyles.balAmtSettled,
          ]}
        >
          {balAmount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const lcStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    backgroundColor: C.surface,
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  cardFirst: {
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderTopWidth: 1,
  },
  cardLast: {
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
    borderBottomWidth: 1,
  },
  cardSelected: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderColor: '#3b82f6',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#2e3650',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxOn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.text,
    letterSpacing: -0.2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: F.xs, color: C.text3 },
  dot: { fontSize: F.xs, color: C.text3 },
  balCol: { alignItems: "flex-end", gap: 2 },
  balLabel: {
    fontSize: F.xs,
    fontWeight: W.bold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  balAmt: { fontSize: F.xl, fontWeight: W.bold, letterSpacing: -0.5 },
  balAmtSettled: { fontSize: F.sm, fontWeight: W.bold, letterSpacing: 0.5 },
});

// ─── Sort pill ────────────────────────────────────────────────────────────────

function SortDropdown({ sort, onSort, visible, onOpen, onClose }) {
  const current = SORT_OPTIONS.find((o) => o.key === sort) || SORT_OPTIONS[0];
  return (
    <View>
      <TouchableOpacity
        style={sdStyles.trigger}
        onPress={onOpen}
        activeOpacity={0.75}
      >
        <Icons.settlements size={13} color={C.primary} />
        <Text style={sdStyles.triggerPrefix}>Sort</Text>
        <Icons.chevronRight
          size={12}
          color={C.text3}
          style={{ transform: [{ rotate: visible ? "-90deg" : "90deg" }] }}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={sdStyles.menu}>
          <Text style={sdStyles.menuHeader}>SORT BY</Text>
          {SORT_OPTIONS.map((o, i) => {
            const active = sort === o.key;
            const Icon = Icons[o.icon];
            return (
              <TouchableOpacity
                key={o.key}
                style={[
                  sdStyles.menuItem,
                  i < SORT_OPTIONS.length - 1 && sdStyles.menuItemBorder,
                ]}
                onPress={() => {
                  onSort(o.key);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    sdStyles.menuIconBox,
                    active && { backgroundColor: C.primaryLo },
                  ]}
                >
                  <Icon size={14} color={active ? C.primary : C.text3} />
                </View>
                <Text
                  style={[
                    sdStyles.menuLabel,
                    active && { color: C.primary, fontWeight: W.bold },
                  ]}
                >
                  {o.label}
                </Text>
                {active && <Icons.check size={14} color={C.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const sdStyles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface2,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.md,
    paddingVertical: 7,
  },
  triggerPrefix: { fontSize: F.sm, color: C.primary, fontWeight: W.bold },
  menu: {
    position: "absolute",
    top: 120,
    right: SP.base,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border2,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    overflow: "hidden",
  },
  menuHeader: {
    fontSize: F.xs,
    fontWeight: W.heavy,
    color: C.text3,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.md,
    paddingVertical: 13,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconBox: {
    width: 28,
    height: 28,
    borderRadius: R.sm,
    backgroundColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: F.md, color: C.text2, fontWeight: W.medium },
});

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <View style={sbStyles.wrap}>
      <Icons.search size={15} color={C.text3} />
      <TextInput
        style={sbStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Search groups…"
        placeholderTextColor={C.text3}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChange("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icons.close size={14} color={C.text3} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const sbStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    backgroundColor: C.surface2,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.md,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: F.md,
    color: C.text,
    padding: 0,
  },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyGroups({ onCreate, isFiltered }) {
  return (
    <View style={emStyles.wrap}>
      <View style={emStyles.iconBox}>
        {isFiltered ? (
          <Icons.search size={38} color={C.text3} />
        ) : (
          <Icons.usersPlus size={38} color={C.primary} />
        )}
      </View>
      <Text style={emStyles.title}>
        {isFiltered ? "No results found" : "No groups yet"}
      </Text>
      <Text style={emStyles.sub}>
        {isFiltered
          ? "Try a different search term or clear the filter."
          : "Create a group to start splitting expenses with friends, family, or colleagues."}
      </Text>
      {!isFiltered && (
        <TouchableOpacity
          style={emStyles.btn}
          onPress={onCreate}
          activeOpacity={0.85}
        >
          <Icons.plus size={15} color="#fff" />
          <Text style={emStyles.btnText}>Create your first group</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const emStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.xl,
    paddingTop: SP.xxl,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: R.xxl,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SP.lg,
  },
  title: {
    fontSize: F.xl,
    fontWeight: W.bold,
    color: C.text,
    marginBottom: 8,
    textAlign: "center",
  },
  sub: {
    fontSize: F.base,
    color: C.text2,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: SP.xl,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: SP.xl,
    paddingVertical: 12,
  },
  btnText: { fontSize: F.md, fontWeight: W.bold, color: "#fff" },
});

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ groupCount, onCreate, onJoin }) {
  return (
    <View style={hStyles.wrap}>
      <View>
        <Text style={hStyles.title}>Groups</Text>
        {groupCount > 0 && (
          <Text style={hStyles.sub}>
            {groupCount} active {groupCount === 1 ? "group" : "groups"}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
        <TouchableOpacity
          style={hStyles.joinBtn}
          onPress={onJoin}
          activeOpacity={0.75}
        >
          <Icons.externalLink size={13} color={C.primary} />
          <Text style={hStyles.joinText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={hStyles.createBtn}
          onPress={onCreate}
          activeOpacity={0.85}
        >
          <Icons.plus size={14} color="#fff" />
          <Text style={hStyles.createText}>New Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const hStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.base,
    paddingTop: SP.md,
    paddingBottom: SP.md,
  },
  title: {
    fontSize: F.xxl,
    fontWeight: W.heavy,
    color: C.text,
    letterSpacing: -0.6,
  },
  sub: { fontSize: F.sm, color: C.text3, marginTop: 1, fontWeight: W.medium },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.primaryLo,
    borderWidth: 1,
    borderColor: C.primary + "40",
    borderRadius: R.full,
    paddingHorizontal: SP.md,
    paddingVertical: 7,
  },
  joinText: { fontSize: F.sm, fontWeight: W.bold, color: C.primary },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: SP.md,
    paddingVertical: 8,
  },
  createText: { fontSize: F.sm, fontWeight: W.bold, color: "#fff" },
});

// ─── Summary strip ────────────────────────────────────────────────────────────
function SummaryStrip({ groups }) {
  let totalOwe = 0,
    totalOwed = 0;
  groups.forEach((g) => {
    const b = parseFloat(g.my_balance || 0);
    if (b > 0) totalOwed += b;
    else totalOwe += Math.abs(b);
  });

  if (totalOwe === 0 && totalOwed === 0) return null;

  return (
    <View style={ssStyles.wrap}>
      {totalOwed > 0 && (
        <View
          style={[
            ssStyles.tile,
            { backgroundColor: C.successLo, borderColor: C.success + "25" },
          ]}
        >
          <Text style={[ssStyles.tileLabel, { color: C.success }]}>
            TOTAL OWED TO YOU
          </Text>
          <Text style={[ssStyles.tileAmt, { color: C.success }]}>
            ₹{totalOwed.toFixed(2)}
          </Text>
        </View>
      )}
      {totalOwe > 0 && (
        <View
          style={[
            ssStyles.tile,
            { backgroundColor: C.dangerLo, borderColor: C.danger + "25" },
          ]}
        >
          <Text style={[ssStyles.tileLabel, { color: C.danger }]}>
            TOTAL YOU OWE
          </Text>
          <Text style={[ssStyles.tileAmt, { color: C.danger }]}>
            ₹{totalOwe.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const ssStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: SP.sm,
    paddingHorizontal: SP.base,
    paddingBottom: SP.md,
  },
  tile: {
    flex: 1,
    borderRadius: R.lg,
    borderWidth: 1,
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm + 2,
    gap: 2,
  },
  tileLabel: {
    fontSize: F.xs,
    fontWeight: W.heavy,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  tileAmt: { fontSize: F.xl, fontWeight: W.heavy, letterSpacing: -0.4 },
});

// ─── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setName("");
      setError("");
      setPicked([]);
      setSearch("");
      loadUsers();
    }
  }, [visible]);

  async function loadUsers() {
    setFetchingUsers(true);
    try {
      const { data } = await groupsApi.getUsers();
      setAllUsers(data.filter((u) => u.user_id !== user?.user_id));
    } catch {
      setAllUsers([]);
    } finally {
      setFetchingUsers(false);
    }
  }

  function toggleUser(id) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setLoading(true);
    try {
      const ids = [...new Set([user.user_id, ...picked])];
      const { data } = await groupsApi.createGroup({
        group_name: name.trim(),
        user_ids: ids,
      });
      onCreated({ ...data, group_name: name.trim() });
      onClose();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(
        Array.isArray(d)
          ? d[0]?.msg
          : typeof d === "string"
            ? d
            : "Failed to create group",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = search.trim()
    ? allUsers.filter((u) =>
        (u.name || u.user_name || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : allUsers;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalS.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={modalS.sheet}>
          <View style={modalS.handle} />
          <View style={modalS.header}>
            <Text style={modalS.title}>New Group</Text>
            <TouchableOpacity style={modalS.closeBtn} onPress={onClose}>
              <Icons.close size={18} color={C.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: SP.base,
              gap: SP.lg,
              paddingBottom: SP.lg,
            }}
          >
            {/* Group name */}
            <View style={{ gap: SP.sm }}>
              <Text style={modalS.label}>GROUP NAME</Text>
              <View
                style={[
                  modalS.field,
                  error && !name.trim() && modalS.fieldError,
                ]}
              >
                <Icons.groups size={15} color={C.text3} />
                <TextInput
                  style={modalS.fieldInput}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setError("");
                  }}
                  placeholder="e.g. Goa Trip 2025"
                  placeholderTextColor={C.text3}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            {!!error && (
              <View style={modalS.errBanner}>
                <Text style={modalS.errText}>{error}</Text>
              </View>
            )}

            {/* Members */}
            <View style={{ gap: SP.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={modalS.label}>ADD MEMBERS</Text>
                {picked.length > 0 && (
                  <View style={modalS.pickedBadge}>
                    <Text style={modalS.pickedBadgeText}>
                      {picked.length} selected
                    </Text>
                  </View>
                )}
              </View>
              <Text style={modalS.labelSub}>
                You're included automatically.
              </Text>

              <View style={modalS.search}>
                <Icons.search size={13} color={C.text3} />
                <TextInput
                  style={modalS.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search members…"
                  placeholderTextColor={C.text3}
                  autoCapitalize="none"
                />
              </View>

              {fetchingUsers ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: SP.md,
                  }}
                >
                  <ActivityIndicator color={C.primary} size="small" />
                  <Text style={{ fontSize: F.sm, color: C.text3 }}>
                    Finding users…
                  </Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <Text
                  style={{
                    fontSize: F.sm,
                    color: C.text3,
                    textAlign: "center",
                    paddingVertical: SP.md,
                  }}
                >
                  {search ? "No matches found." : "No other users found."}
                </Text>
              ) : (
                <View style={{ gap: SP.xs }}>
                  {filteredUsers.map((u) => {
                    const sel = picked.includes(u.user_id);
                    const name = u.name || u.user_name || "User";
                    return (
                      <TouchableOpacity
                        key={u.user_id}
                        style={[
                          modalS.memberItem,
                          sel && modalS.memberItemActive,
                        ]}
                        onPress={() => toggleUser(u.user_id)}
                        activeOpacity={0.7}
                      >
                        <MemberBubble
                          name={name}
                          size={36}
                          borderColor={C.surface2}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              modalS.memberName,
                              sel && { color: C.text },
                            ]}
                          >
                            {name}
                          </Text>
                          {u.email && (
                            <Text style={modalS.memberEmail} numberOfLines={1}>
                              {u.email}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[modalS.checkbox, sel && modalS.checkboxOn]}
                        >
                          {sel && <Icons.check size={11} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={modalS.footer}>
            <TouchableOpacity style={modalS.cancelBtn} onPress={onClose}>
              <Text style={modalS.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalS.createBtn,
                (!name.trim() || loading) && { opacity: 0.5 },
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icons.plus size={15} color="#fff" />
                  <Text style={modalS.createText}>Create Group</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Join Group Modal ─────────────────────────────────────────────────────────
function JoinGroupModal({ visible, onClose, onJoined }) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [step, setStep] = useState("input");
  const [groupInfo, setGroupInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setInput("");
      setStep("input");
      setGroupInfo(null);
      setError("");
    }
  }, [visible]);

  function extractToken(text) {
    const m = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : text.trim();
  }

  async function handlePreview() {
    const token = extractToken(input);
    if (!token) {
      setError("Please enter a valid invite link or token.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await groupsApi.getInviteInfo(token);
      setGroupInfo({ ...data, token });
      setStep("preview");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired invite link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setStep("joining");
    try {
      const { data } = await groupsApi.joinInvite(groupInfo.token);
      setStep("success");
      setTimeout(() => {
        onJoined(data);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to join group.");
      setStep("preview");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalS.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={modalS.sheet}>
          <View style={modalS.handle} />
          <View style={modalS.header}>
            <Text style={modalS.title}>Join via Invite</Text>
            <TouchableOpacity style={modalS.closeBtn} onPress={onClose}>
              <Icons.close size={18} color={C.text2} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: SP.base, gap: SP.md, paddingBottom: SP.xxl }}>
            {step === "success" && (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: SP.xxl,
                  gap: SP.md,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 22,
                    backgroundColor: C.successLo,
                    borderWidth: 1,
                    borderColor: C.success + "40",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.checkCircle size={32} color={C.success} />
                </View>
                <Text
                  style={{ fontSize: F.xl, fontWeight: W.bold, color: C.text }}
                >
                  You're in!
                </Text>
                <Text style={{ fontSize: F.base, color: C.text3 }}>
                  Redirecting to group…
                </Text>
              </View>
            )}

            {(step === "preview" || step === "joining") && (
              <>
                <View
                  style={{
                    backgroundColor: C.surface2,
                    borderRadius: R.lg,
                    borderWidth: 1,
                    borderColor: C.border,
                    padding: SP.base,
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: F.xs,
                      fontWeight: W.heavy,
                      color: C.text3,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    YOU'RE JOINING
                  </Text>
                  <Text
                    style={{
                      fontSize: F.xl,
                      fontWeight: W.heavy,
                      color: C.text,
                      letterSpacing: -0.3,
                    }}
                  >
                    {groupInfo?.group_name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <Icons.users size={12} color={C.text3} />
                    <Text style={{ fontSize: F.sm, color: C.text3 }}>
                      Joining as {user?.name}
                    </Text>
                  </View>
                </View>
                {!!error && (
                  <Text style={{ fontSize: F.sm, color: C.danger }}>
                    {error}
                  </Text>
                )}
                <View style={modalS.footer}>
                  <TouchableOpacity
                    style={[modalS.cancelBtn, { flex: 1 }]}
                    onPress={() => setStep("input")}
                  >
                    <Text style={modalS.cancelText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalS.createBtn,
                      { flex: 2 },
                      step === "joining" && { opacity: 0.7 },
                    ]}
                    onPress={handleJoin}
                    disabled={step === "joining"}
                  >
                    {step === "joining" ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Icons.check size={14} color="#fff" />
                        <Text style={modalS.createText}>Join Group</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === "input" && (
              <>
                <Text
                  style={{ fontSize: F.sm, color: C.text2, lineHeight: 19 }}
                >
                  Paste the invite link or token shared by a group member.
                </Text>
                <View style={[modalS.field, !!error && modalS.fieldError]}>
                  <Icons.externalLink size={15} color={C.text3} />
                  <TextInput
                    style={modalS.fieldInput}
                    value={input}
                    onChangeText={(v) => {
                      setInput(v);
                      setError("");
                    }}
                    placeholder="Paste link or token…"
                    placeholderTextColor={C.text3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {!!error && (
                  <Text
                    style={{
                      fontSize: F.sm,
                      color: C.danger,
                      marginTop: -SP.sm,
                    }}
                  >
                    {error}
                  </Text>
                )}
                <View style={modalS.footer}>
                  <TouchableOpacity
                    style={[modalS.cancelBtn, { flex: 1 }]}
                    onPress={onClose}
                  >
                    <Text style={modalS.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalS.createBtn,
                      { flex: 2 },
                      (!input.trim() || loading) && { opacity: 0.5 },
                    ]}
                    onPress={handlePreview}
                    disabled={!input.trim() || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={modalS.createText}>Continue →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Shared modal styles
const modalS = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: F.xl, fontWeight: W.bold, color: C.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: C.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: F.xs,
    fontWeight: W.heavy,
    color: C.text3,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  labelSub: { fontSize: F.xs, color: C.text3, marginTop: -2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    backgroundColor: C.surface2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border2,
    paddingHorizontal: SP.md,
    paddingVertical: 13,
  },
  fieldError: { borderColor: C.danger + "60" },
  fieldInput: { flex: 1, fontSize: F.md, color: C.text, padding: 0 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.md,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: F.base, color: C.text, padding: 0 },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    backgroundColor: C.surface2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
  },
  memberItemActive: {
    borderColor: C.primary + "50",
    backgroundColor: C.primaryLo,
  },
  memberName: { fontSize: F.md, fontWeight: W.semibold, color: C.text2 },
  memberEmail: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: R.sm,
    borderWidth: 2,
    borderColor: C.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  pickedBadge: {
    backgroundColor: C.primaryLo,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pickedBadgeText: { fontSize: F.xs, fontWeight: W.bold, color: C.primary },
  errBanner: {
    backgroundColor: C.dangerLo,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.danger + "30",
    paddingHorizontal: SP.md,
    paddingVertical: 10,
    marginTop: -SP.sm,
  },
  errText: { fontSize: F.sm, color: C.danger },
  footer: {
    flexDirection: "row",
    gap: SP.sm,
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: R.lg,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelText: { fontSize: F.md, fontWeight: W.semibold, color: C.text2 },
  createBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: R.lg,
    backgroundColor: C.primary,
  },
  createText: { fontSize: F.md, fontWeight: W.bold, color: "#fff" },
});

// ─── Selection action bar ─────────────────────────────────────────────────────
function SelectionBar({ count, onCancel, actions, onLeave, onDelete }) {
  const { canLeave, canDelete } = actions;
  return (
    <View style={selStyles.bar}>
      <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icons.close size={20} color={C.text2} />
      </TouchableOpacity>
      <Text style={selStyles.count}>{count} selected</Text>
      <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'center' }}>
        {canLeave && (
          <TouchableOpacity style={[selStyles.btn, { backgroundColor: C.warningLo, borderColor: C.warning + '40' }]} onPress={onLeave}>
            <Icons.logout size={14} color={C.warning} />
            <Text style={[selStyles.btnText, { color: C.warning }]}>Leave</Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity style={[selStyles.btn, { backgroundColor: C.dangerLo, borderColor: C.danger + '40' }]} onPress={onDelete}>
            <Icons.trash size={14} color={C.danger} />
            <Text style={[selStyles.btnText, { color: C.danger }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const selStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.base,
    paddingVertical: SP.sm + 2,
    backgroundColor: C.surface2,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
    gap: SP.md,
  },
  count: {
    flex: 1,
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.text,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: R.full,
    paddingHorizontal: SP.md,
    paddingVertical: 7,
  },
  btnText: { fontSize: F.sm, fontWeight: W.bold },
});

// ─── Sort / filter helpers ────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "activity", label: "Last Activity", icon: "clockPending" },
  { key: "name_asc", label: "Name (A → Z)", icon: "sortOldest" },
  { key: "name_desc", label: "Name (Z → A)", icon: "sortNewest" },
  { key: "created_new", label: "Newest First", icon: "sortNewest" },
  { key: "created_old", label: "Oldest First", icon: "sortOldest" },
  { key: "balance", label: "Balance", icon: "settlements" },
];

function applySort(groups, sort) {
  const copy = [...groups];
  switch (sort) {
    case "name_asc":
      copy.sort((a, b) =>
        (a.group_name || "").localeCompare(b.group_name || ""),
      );
      break;
    case "name_desc":
      copy.sort((a, b) =>
        (b.group_name || "").localeCompare(a.group_name || ""),
      );
      break;
    case "created_new":
      copy.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );
      break;
    case "created_old":
      copy.sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      );
      break;
    case "balance":
      copy.sort(
        (a, b) =>
          Math.abs(parseFloat(b.my_balance || 0)) -
          Math.abs(parseFloat(a.my_balance || 0)),
      );
      break;
    default: // activity
      copy.sort((a, b) => {
        const ta = new Date(
          a.last_activity || a.updated_at || a.created_at || 0,
        ).getTime();
        const tb = new Date(
          b.last_activity || b.updated_at || b.created_at || 0,
        ).getTime();
        return tb - ta;
      });
  }
  return copy;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ group, onConfirm, onCancel }) {
  if (!group) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={dcStyles.overlay}>
        <View style={dcStyles.box}>
          <Text style={dcStyles.title}>Delete Group</Text>
          <Text style={dcStyles.body}>
            {group._forbidden || group._error ? (
              group._message
            ) : group._force ? (
              `${group._message}\n\nDelete anyway? This cannot be undone.`
            ) : (
              <>
                Delete{" "}
                <Text style={{ color: C.text, fontWeight: W.bold }}>
                  "{group.group_name}"
                </Text>
                ? All expenses and payments will be permanently removed.
              </>
            )}
          </Text>
          <View style={dcStyles.row}>
            <TouchableOpacity
              style={dcStyles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={dcStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {group._forbidden || group._error ? (
              <TouchableOpacity
                style={dcStyles.okBtn}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={dcStyles.deleteText}>OK</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={dcStyles.deleteBtn}
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={dcStyles.deleteText}>
                  {group._force ? "Delete Anyway" : "Delete"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dcStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.xl,
  },
  box: {
    backgroundColor: C.surface2,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SP.xl,
    paddingVertical: SP.lg,
    width: "100%",
    gap: SP.sm,
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.surface3,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: F.lg,
    fontWeight: W.bold,
    color: C.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: F.sm,
    color: C.text2,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SP.sm,
  },
  row: {
    flexDirection: "row",
    gap: SP.sm,
    marginTop: SP.sm,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: R.lg,
    backgroundColor: C.surface3,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: "center",
  },
  cancelText: { fontSize: F.base, fontWeight: W.medium, color: C.text2 },
  okBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: R.lg,
    backgroundColor: C.surface3,
    borderWidth: 1,
    borderColor: C.border2,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: R.lg,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
  },
  deleteText: { fontSize: F.base, fontWeight: W.semibold, color: C.danger },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // UI state
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("activity");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (route.params?.openCreate) {
      setShowCreate(true);
      navigation.setParams({ openCreate: false });
    }
  }, [route.params?.openCreate]);

  function enterSelectMode(groupId) {
    setSelectMode(true);
    setSelected(new Set([groupId]));
  }

  function toggleSelect(groupId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  // Determine what actions are available for current selection
  function getSelectionActions() {
    const selectedGroups = groups.filter(g => selected.has(g.group_id));
    
    const canLeave = selectedGroups.length > 0;
    
    const canDelete = selectedGroups.length > 0 && selectedGroups.every(
      g => g.created_by === user?.user_id || user?.role === 'admin'
    );
    return { canLeave, canDelete, selectedGroups };
  }

  async function handleBulkLeave() {
    const { selectedGroups } = getSelectionActions();
    const promises = selectedGroups.map(g =>
      groupsApi.leaveGroup(g.group_id, user.user_id)
        .then(() => ({ ok: true, g }))
        .catch(err => ({ ok: false, g, err }))
    );
    const results = await Promise.all(promises);
    const failed = results.filter(r => !r.ok);
    const succeeded = results.filter(r => r.ok);
    if (succeeded.length) {
      setGroups(prev => prev.filter(g => !succeeded.some(r => r.g.group_id === g.group_id)));
      showToast(succeeded.length === 1 ? 'Left group' : `Left ${succeeded.length} groups`);
    }
    if (failed.length) {
      const detail = failed[0].err?.response?.data?.detail;
      setAlert({
        title: 'Could not leave',
        message: typeof detail === 'string' ? detail : `Failed to leave ${failed.length} group(s). You may have unsettled balances.`,
        buttons: [{ text: 'OK', onPress: () => setAlert(null) }],
      });
    }
    exitSelectMode();
  }

  async function handleBulkDelete(force = false) {
    const { selectedGroups } = getSelectionActions();
    const promises = selectedGroups.map(g =>
      groupsApi.deleteGroup(g.group_id, force)
        .then(() => ({ ok: true, g }))
        .catch(err => ({ ok: false, g, err }))
    );
    const results = await Promise.all(promises);
    const failed = results.filter(r => !r.ok);
    const succeeded = results.filter(r => r.ok);
    if (succeeded.length) {
      setGroups(prev => prev.filter(g => !succeeded.some(r => r.g.group_id === g.group_id)));
      showToast(succeeded.length === 1 ? 'Group deleted' : `Deleted ${succeeded.length} groups`);
    }
    const conflict = failed.find(r => r.err?.response?.status === 409);
    const forbidden = failed.find(r => r.err?.response?.status === 403);
    if (conflict && !force) {
      setAlert({
        title: 'Unsettled Balances',
        message: `Some groups have unsettled balances. Delete anyway?`,
        buttons: [
          { text: 'Cancel', onPress: () => { setAlert(null); exitSelectMode(); } },
          { text: 'Delete Anyway', style: 'destructive', onPress: () => { setAlert(null); handleBulkDelete(true); } },
        ],
      });
      return;
    }
    if (forbidden) {
      setAlert({
        title: 'Not Allowed',
        message: 'You can only delete groups you created.',
        buttons: [{ text: 'OK', onPress: () => setAlert(null) }],
      });
    }
    exitSelectMode();
  }

  const [alert, setAlert] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: fetchedGroups } = await groupsApi.getGroups();
      if (!fetchedGroups?.length) {
        setGroups([]);
        return;
      }

      const groupIds = fetchedGroups.map((g) => g.group_id);
      const { data: membersBulk } = await groupsApi.getMembersBulk(groupIds);
      const merged = fetchedGroups.map((g) => ({
        ...g,
        members: membersBulk[g.group_id] || [],
        member_count: (membersBulk[g.group_id] || []).length,
      }));

      const bulkRes = await settlementsApi.getSettlementsBulk(groupIds);
      const bulkData = bulkRes.data || {};

      const balanceMap = {};
      Object.entries(bulkData).forEach(([gid, rows]) => {
        const mine = Array.isArray(rows)
          ? rows.find((row) => row.user_id === user?.user_id)
          : null;
        balanceMap[parseInt(gid)] = mine
          ? parseFloat(mine.net_balance ?? mine.balance ?? 0)
          : 0;
      });

      const withBalances = merged.map((g) => ({
        ...g,
        my_balance: balanceMap[g.group_id] ?? g.my_balance ?? null,
      }));

      setGroups(withBalances);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setAlert({ title: "Error", message: "Failed to load groups", buttons: [{ text: "OK", onPress: () => setAlert(null) }] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleDeleteGroup(group, force = false) {
    try {
      await groupsApi.deleteGroup(group.group_id, force);
      setGroups((p) => p.filter((g) => g.group_id !== group.group_id));
      setLongPress(null);
      showToast("Group deleted");
    } catch (err) {
      const s = err?.response?.status;
      const d = err?.response?.data?.detail;
      setLongPress(null);
      if (s === 409) {
        // Re-use the modal but with a force-confirm callback
        setDeleteTarget({ ...group, _force: true, _message: d });
      } else if (s === 403) {
        setDeleteTarget({ ...group, _forbidden: true, _message: d });
      } else {
        setDeleteTarget({
          ...group,
          _error: true,
          _message: d || "Failed to delete group.",
        });
      }
    }
  }

  async function handleCreated(newGroup) {
    navigation.navigate("GroupDetail", {
      groupId: newGroup.group_id,
      groupName: newGroup.group_name,
    });
    load();
  }

  // Derived data
  const filtered = groups.filter(
    (g) =>
      !search.trim() ||
      (g.group_name || "").toLowerCase().includes(search.toLowerCase()),
  );
  const sorted = applySort(filtered, sort);

  function navigateGroup(g) {
    navigation.navigate("GroupDetail", {
      groupId: g.group_id,
      groupName: g.group_name,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
        <Header
          groupCount={0}
          onCreate={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={{ fontSize: F.base, color: C.text3 }}>
            Loading groups…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <Header
        groupCount={groups.length}
        onCreate={() => setShowCreate(true)}
        onJoin={() => setShowJoin(true)}
      />

      {/* Search + sort row */}
      <View style={s.toolRow}>
        <SearchBar value={search} onChange={setSearch} />
        <SortDropdown
          sort={sort}
          onSort={setSort}
          visible={showSortMenu}
          onOpen={() => setShowSortMenu(true)}
          onClose={() => setShowSortMenu(false)}
        />
      </View>

      {/* Summary strip (only when not filtering) */}
      {!search && groups.length > 0 && <SummaryStrip groups={groups} />}

      {/* List */}
      <FlatList
        data={sorted}
        keyExtractor={(g) => String(g.group_id)}
        contentContainerStyle={[s.list, sorted.length === 0 && s.listEmpty, { paddingBottom: TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyGroups
            onCreate={() => setShowCreate(true)}
            isFiltered={!!search.trim()}
          />
        }
        renderItem={({ item, index }) => (
          <ListCard
            group={item}
            onPress={() => {
              if (selectMode) {
                toggleSelect(item.group_id);
                // Auto-exit if last item deselected
                if (selected.has(item.group_id) && selected.size === 1) exitSelectMode();
              } else {
                navigateGroup(item);
              }
            }}
            onLongPress={() => enterSelectMode(item.group_id)}
            isFirst={index === 0}
            isLast={index === sorted.length - 1}
            isSelectMode={selectMode}
            isSelected={selected.has(item.group_id)}
          />
        )}
      />

      {/* Selection mode action bar */}
      {selectMode && (
        <SelectionBar
          count={selected.size}
          onCancel={exitSelectMode}
          actions={getSelectionActions()}
          onLeave={() => setAlert({
            title: `Leave ${selected.size > 1 ? selected.size + ' Groups' : 'Group'}`,
            message: 'You must have zero balance to leave. This cannot be undone.',
            buttons: [
              { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
              { text: 'Leave', style: 'destructive', onPress: () => { setAlert(null); handleBulkLeave(); } },
            ],
          })}
          onDelete={() => setAlert({
            title: `Delete ${selected.size > 1 ? selected.size + ' Groups' : 'Group'}`,
            message: 'All expenses and payments will be permanently removed.',
            buttons: [
              { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
              { text: 'Delete', style: 'destructive', onPress: () => { setAlert(null); handleBulkDelete(); } },
            ],
          })}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
      <JoinGroupModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(data) => {
          load();
          navigation.navigate("GroupDetail", {
            groupId: data.group_id,
            groupName: data.group_name || data.message,
          });
        }}
      />

      <Toast config={toast} />
      <AppAlert config={alert} />
      <DeleteConfirmModal
        group={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?._forbidden || deleteTarget?._error) {
            setDeleteTarget(null);
            return;
          }
          const g = deleteTarget;
          setDeleteTarget(null);
          handleDeleteGroup(g, !!g._force);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    paddingHorizontal: SP.base,
    paddingBottom: SP.md,
  },

  list: { paddingHorizontal: SP.base, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  // Action sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingTop: 4,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.base,
    paddingVertical: SP.md,
  },
  sheetIconBox: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemText: { flex: 1, fontSize: F.md, fontWeight: W.semibold },
});
