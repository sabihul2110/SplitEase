/**
 * NotificationsScreen.jsx
 * Swipe-to-delete · Long-press multi-select · Bulk actions · SVG icons · No emojis
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as notifsApi from "../../api/notifications";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  TAB_BAR_HEIGHT,
} from "../../constants/theme";
import { Icons } from "../../components/icons/icons";
import AppAlert from "../../components/common/AppAlert";
import Toast from "../../components/common/Toast";



if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArch = global._IS_FABRIC === true;
  if (!isNewArch) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const normalized = /[Zz+]/.test(dateStr) ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

// function getNotifMeta(type) {
//   if (type === "payment" || type === "settlement")
//     return {
//       Icon: Icons.checkCircle,
//       color: COLORS.success,
//       bg: "rgba(16,185,129,0.12)",
//     };
//   if (type === "expense")
//     return {
//       Icon: Icons.receipt,
//       color: COLORS.primary,
//       bg: "rgba(37,99,235,0.12)",
//     };
//   return {
//     Icon: Icons.bell,
//     color: COLORS.warning,
//     bg: "rgba(245,158,11,0.12)",
//   };
// }

function getNotifMeta(type) {
  if (type === "payment" || type === "settlement")
    return {
      Icon: Icons.checkCircle,
      color: COLORS.success,
      bg: "rgba(16,185,129,0.12)",
    };
  if (type === "expense")
    return {
      Icon: Icons.receipt,
      color: COLORS.primary,
      bg: "rgba(37,99,235,0.12)",
    };
  if (type === "entry_outcome")
    return {
      Icon: Icons.users,
      color: "#818cf8",
      bg: "rgba(129,140,248,0.12)",
    };
  return {
    Icon: Icons.bell,
    color: COLORS.warning,
    bg: "rgba(245,158,11,0.12)",
  };
}

// ── Swipe delete right-action ─────────────────────────────────────────────
function RightDelete({ dragX, onDelete }) {
  const scale = dragX.interpolate({
    inputRange: [-80, -40],
    outputRange: [1, 0.75],
    extrapolate: "clamp",
  });
  return (
    <TouchableOpacity
      style={S.deleteZone}
      onPress={onDelete}
      activeOpacity={0.85}
    >
      <Animated.View
        style={{ transform: [{ scale }], alignItems: "center", gap: 4 }}
      >
        <Icons.trash size={18} color="#fff" />
        <Text
          style={{ color: "#fff", fontSize: 10, fontWeight: FONT_WEIGHT.bold }}
        >
          Delete
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Notification item ─────────────────────────────────────────────────────
function NotifItem({
  item,
  onRead,
  onNavigate,
  onDelete,
  onToggleSelect,
  selected,
  selectionMode,
}) {
  const swipeRef = useRef(null);
  const { Icon, color, bg } = getNotifMeta(item.type);
  const isUnread = !item.is_read;

  function handlePress() {
    if (selectionMode) {
      onToggleSelect(item.notification_id);
      return;
    }
    if (isUnread) onRead(item.notification_id);
    if (item.group_id) onNavigate(item.group_id, item.group_name);
  }

  function handleLongPress() {
    onToggleSelect(item.notification_id);
  }

  function handleDelete() {
    swipeRef.current?.close();
    onDelete(item.notification_id);
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={(_, dragX) => (
        <RightDelete dragX={dragX} onDelete={handleDelete} />
      )}
      rightThreshold={44}
      enabled={!selectionMode}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[S.item, isUnread && S.itemUnread, selected && S.itemSelected]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        {/* Left unread bar */}
        {isUnread && !selectionMode && <View style={S.unreadBar} />}

        {/* Checkbox (selection mode only) */}
        {selectionMode && (
          <View style={[S.checkbox, selected && S.checkboxOn]}>
            {selected && <Icons.check size={11} color="#fff" />}
          </View>
        )}

        {/* Type icon */}
        <View style={[S.iconBox, { backgroundColor: bg }]}>
          <Icon size={18} color={color} />
          {isUnread && !selectionMode && <View style={S.unreadDot} />}
        </View>

        {/* Text content */}
        <View style={S.itemBody}>
          <Text
            style={[S.itemMsg, isUnread && S.itemMsgBold]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <View style={S.itemMeta}>
            <Icons.calendarDays size={10} color={COLORS.text3} />
            <Text style={S.itemTime}>{timeAgo(item.created_at)}</Text>
            {item.group_name && (
              <View style={S.groupPill}>
                <Icons.groups size={9} color={COLORS.primary} />
                <Text style={S.groupPillText} numberOfLines={1}>
                  {item.group_name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron (only when navigable and not in selection mode) */}
        {!selectionMode && item.group_id && (
          <Icons.chevronRight size={14} color={COLORS.text3} />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [alert, setAlert] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const selectionMode = selectedIds.size > 0;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await notifsApi.getNotifs();
      setNotifs(data || []);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setSelectedIds(new Set());
    }, [load]),
  );

  // ── Selection ──
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(notifs.map((n) => n.notification_id)));
  }
  function clearSelect() {
    setSelectedIds(new Set());
  }

  // ── Actions ──
  async function markRead(id) {
    try {
      await notifsApi.markRead(id);
      setNotifs((p) =>
        p.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)),
      );
    } catch {}
  }

  async function markAllRead() {
    try {
      await notifsApi.markAllRead();
      setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
      showToast("All marked as read");
    } catch {}
  }

  async function deleteOne(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifs((p) => p.filter((n) => n.notification_id !== id));
    setSelectedIds((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
    try {
      await notifsApi.deleteNotif(id);
    } catch {}
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifs((p) => p.filter((n) => !selectedIds.has(n.notification_id)));
    setSelectedIds(new Set());
    showToast(`${ids.length} deleted`);
    await Promise.allSettled(ids.map((id) => notifsApi.deleteNotif(id)));
  }

  async function deleteReadNotifs() {
    try {
      await notifsApi.deleteReadNotifs();
      setNotifs((p) => p.filter((n) => !n.is_read));
      showToast("Read notifications cleared");
    } catch {}
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const hasRead = notifs.some((n) => n.is_read);
  const allSelected = selectedIds.size === notifs.length && notifs.length > 0;

  // ── Render ──
  if (loading)
    return (
      <SafeAreaView style={S.safe} edges={["top", "left", "right"]}>
        <View style={S.header}>
          <Text style={S.title}>Notifications</Text>
        </View>
        <View style={S.center}>
          <Icons.bell size={32} color={COLORS.text3} />
          <Text style={S.centerText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={S.safe} edges={["top", "left", "right"]}>
      {/* ── Header ── */}
      <View style={S.header}>
        <View>
          <Text style={S.title}>
            {selectionMode ? `${selectedIds.size} selected` : "Notifications"}
          </Text>
          {!selectionMode && unreadCount > 0 && (
            <Text style={S.titleSub}>
              {unreadCount} unread · swipe to delete
            </Text>
          )}
          {!selectionMode && notifs.length > 0 && unreadCount === 0 && (
            <Text style={S.titleSub}>
              Long press to select · swipe to delete
            </Text>
          )}
        </View>

        <View style={S.headerRight}>
          {selectionMode ? (
            <>
              {!allSelected && (
                <TouchableOpacity onPress={selectAll}>
                  <Text style={S.hAction}>All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={clearSelect}>
                <Text style={S.hAction}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={S.hAction}>Mark all</Text>
                </TouchableOpacity>
              )}
              {hasRead && (
                <TouchableOpacity
                  onPress={() =>
                    setAlert({
                      title: "Clear Read",
                      message: "Delete all read notifications? This cannot be undone.",
                      buttons: [
                        { text: "Cancel", style: "cancel", onPress: () => setAlert(null) },
                        { text: "Delete", style: "destructive", onPress: () => { setAlert(null); deleteReadNotifs(); } },
                      ],
                    })
                  }
                >
                  <Text style={[S.hAction, { color: COLORS.danger }]}>
                    Clear read
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={notifs}
        keyExtractor={(n) => String(n.notification_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={() => (
          <View style={S.empty}>
            <View style={S.emptyBox}>
              <Icons.bellOff size={34} color={COLORS.text3} />
            </View>
            <Text style={S.emptyTitle}>All clear</Text>
            <Text style={S.emptySub}>
              Reminders and group activity will show up here.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotifItem
            item={item}
            onRead={markRead}
            onDelete={deleteOne}
            onToggleSelect={toggleSelect}
            onNavigate={(gid, gname) =>
              navigation.navigate("Groups", {
                screen: "GroupDetail",
                params: { groupId: gid, groupName: gname || "Group" },
              })
            }
            selected={selectedIds.has(item.notification_id)}
            selectionMode={selectionMode}
          />
        )}
        contentContainerStyle={[S.list, notifs.length === 0 && S.listEmpty]}
      />

      <Toast config={toast} />
      <AppAlert config={alert} />

      {/* ── Bulk action bar ── */}
      {selectionMode && (
        <View style={S.bulkBar}>
          <Text style={S.bulkLabel}>
            {selectedIds.size} notification{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </Text>
          <TouchableOpacity
            style={S.bulkDeleteBtn}
            onPress={() =>
              setAlert({
                title: "Delete Notifications",
                message: `Permanently delete ${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""}?`,
                buttons: [
                  { text: "Cancel", style: "cancel", onPress: () => setAlert(null) },
                  { text: "Delete", style: "destructive", onPress: () => { setAlert(null); deleteSelected(); } },
                ],
              })
            }
            activeOpacity={0.85}
          >
            <Icons.trash size={14} color="#fff" />
            <Text style={S.bulkDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: 110 },
  listEmpty: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { fontSize: FONT_SIZE.base, color: COLORS.text3 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  titleSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    marginTop: 3,
    fontWeight: FONT_WEIGHT.medium,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.base,
    paddingBottom: 2,
  },
  hAction: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },

  // Item
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
    gap: SPACING.md,
    position: "relative",
  },
  itemUnread: { backgroundColor: COLORS.surface },
  itemSelected: {
    backgroundColor: "rgba(37,99,235,0.06)",
    borderBottomColor: "rgba(37,99,235,0.12)",
  },

  unreadBar: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },

  itemBody: { flex: 1, gap: 5 },
  itemMsg: { fontSize: FONT_SIZE.base, color: COLORS.text2, lineHeight: 20 },
  itemMsgBold: { color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  itemTime: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  groupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  groupPillText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    maxWidth: 90,
  },

  // Swipe delete zone
  deleteZone: {
    width: 76,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    gap: 12,
  },
  emptyBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  emptySub: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text3,
    textAlign: "center",
    lineHeight: 20,
  },

  // Bulk bar
  bulkBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bulkLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.medium,
  },
  bulkDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: 10,
  },
  bulkDeleteText: {
    color: "#fff",
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});
