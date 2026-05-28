// SplitEase/mobile/src/screens/notifications/NotificationsScreen.jsx

/**
 * NotificationsScreen.jsx
 * In-app notifications — mirrors the web bell dropdown as a full screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { EmptyState, LoadingState } from '../../components/common/ui';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { Icons } from '../../constants/icons'; // Add this import

function timeAgo(dateStr) {
  if (!dateStr) return '';
  // If no timezone suffix, treat as UTC (MySQL DATETIME has no tz)
  const normalized = /[Zz+]/.test(dateStr) ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(normalized).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
}


function NotifItem({ item, onRead, onNavigate, onDelete }) {
  const isUnread = !item.is_read;
  
  // Determine icon and colors based on notification type
  let IconComp = Icons.bell;
  let iconColor = COLORS.warning;
  let iconBg = 'rgba(245,158,11,0.15)'; // warning light

  if (item.type === 'payment' || item.type === 'settlement') {
    IconComp = Icons.checkCircle;
    iconColor = COLORS.success;
    iconBg = 'rgba(16,185,129,0.15)';
  } else if (item.type === 'expense') {
    IconComp = Icons.receipt;
    iconColor = COLORS.primary;
    iconBg = 'rgba(59,130,246,0.15)';
  }

  return (
    <TouchableOpacity
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={() => {
        if (!item.is_read) onRead(item.notification_id);
        if (item.group_id) onNavigate(item.group_id, item.group_name);
      }}
      onLongPress={() => Alert.alert(
        'Delete Notification',
        'Remove this notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.notification_id) },
        ]
      )}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      <View style={[styles.itemIconBox, { backgroundColor: iconBg }]}>
        <IconComp size={18} color={iconColor} />
        {isUnread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemMsg, isUnread && styles.itemMsgBold]}>
          {item.message}
        </Text>
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifs,     setNotifs]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data } = await client.get(ENDPOINTS.notifs);
      setNotifs(data || []);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(id) {
    try {
      await client.post(ENDPOINTS.readNotif(id));
      setNotifs(prev => prev.map(n =>
        n.notification_id === id ? { ...n, is_read: true } : n
      ));
    } catch {}
  }

  async function deleteNotif(id) {
    try {
      await client.delete(ENDPOINTS.delNotif(id));
      setNotifs(prev => prev.filter(n => n.notification_id !== id));
    } catch {}
  }

  async function deleteReadNotifs() {
    try {
      await client.delete(ENDPOINTS.delReadNotifs);
      setNotifs(prev => prev.filter(n => !n.is_read));
    } catch {}
  }

  async function markAllRead() {
    try {
      await client.post(ENDPOINTS.readAll);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (loading) return <LoadingState label="Loading notifications…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Notifications"
        rightElement={
          notifs.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.markAll}>Mark all</Text>
                </TouchableOpacity>
              )}
              {notifs.some(n => n.is_read) && (
                <TouchableOpacity onPress={() =>
                  Alert.alert('Clear Read', 'Delete all read notifications?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: deleteReadNotifs },
                  ])
                }>
                  <Text style={[styles.markAll, { color: COLORS.danger }]}>Clear read</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <FlatList
        data={notifs}
        keyExtractor={n => String(n.notification_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount} unread</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <EmptyState
            icon="🔔"
            title="No notifications"
            subtitle="You'll see reminders and activity updates here."
          />
        )}
        renderItem={({ item }) => (
          <NotifItem
            item={item}
            onRead={markRead}
            onDelete={deleteNotif}
            onNavigate={(groupId, groupName) =>
              navigation.navigate('Groups', {
                screen: 'GroupDetail',
                params: { groupId, groupName: groupName || 'Group' },
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: SPACING['2xl'] },

  badge: {
    backgroundColor: '#1d3a7a', margin: SPACING.base,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeText: { color: COLORS.primaryH, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },

  // item: {
  //   flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
  //   paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  //   borderBottomWidth: 1, borderBottomColor: COLORS.border,
  // },
  // itemUnread: { backgroundColor: COLORS.surface },
  // itemIcon:   { position: 'relative', width: 38, alignItems: 'center' },
  // unreadDot: {
  //   position: 'absolute', top: 0, right: 0,
  //   width: 8, height: 8, borderRadius: 4,
  //   backgroundColor: COLORS.primary,
  // },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemUnread: { backgroundColor: COLORS.surface },
  
  // 🔥 New SVG Icon Box styles
  itemIconBox: { 
    position: 'relative', 
    width: 40, 
    height: 40, 
    borderRadius: RADIUS.full,
    alignItems: 'center', 
    justifyContent: 'center',
    flexShrink: 0
  },
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: COLORS.surface, // Creates a cutout effect
  },

  itemContent: { flex: 1, gap: 4 },
  itemMsg:     { fontSize: FONT_SIZE.base, color: COLORS.text2, lineHeight: 20 },
  itemMsgBold: { color: COLORS.text, fontWeight: FONT_WEIGHT.medium },
  itemTime:    { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  markAll: {
    color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium,
  },
});