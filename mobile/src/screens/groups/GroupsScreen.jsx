// SplitEase/mobile/src/screens/groups/GroupsScreen.jsx
//
// Full redesign — modern card layout, SVG icons, no emojis,
// professional aesthetic matching top finance apps.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  Alert, RefreshControl, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../constants/icons';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0d14',
  surface:   '#111520',
  surface2:  '#171c2c',
  surface3:  '#1e2438',
  border:    '#242a3d',
  border2:   '#2e3650',
  primary:   '#3b82f6',
  primaryLo: 'rgba(59,130,246,0.10)',
  primaryMd: 'rgba(59,130,246,0.18)',
  success:   '#10b981',
  successLo: 'rgba(16,185,129,0.10)',
  danger:    '#ef4444',
  dangerLo:  'rgba(239,68,68,0.10)',
  warning:   '#f59e0b',
  text:      '#f0f4ff',
  text2:     '#8892b0',
  text3:     '#4a5578',
  white:     '#ffffff',
};
const F = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 26 };
const W = { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' };
const R = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 };
const SP = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };

// ─── Avatar with gradient-like initials ──────────────────────────────────────
const AVATAR_COLORS = [
  ['#6366f1', '#4f46e5'], // indigo
  ['#3b82f6', '#2563eb'], // blue
  ['#10b981', '#059669'], // emerald
  ['#f59e0b', '#d97706'], // amber
  ['#ec4899', '#db2777'], // pink
  ['#8b5cf6', '#7c3aed'], // violet
  ['#06b6d4', '#0891b2'], // cyan
  ['#f97316', '#ea580c'], // orange
];

function getAvatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx][0];
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function GroupAvatar({ name, size = 48 }) {
  const bg = getAvatarColor(name);
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: W.bold, color: '#fff', letterSpacing: 0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function MemberAvatar({ name, size = 26 }) {
  const bg = getAvatarColor(name);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: C.surface,
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: W.bold, color: '#fff' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── Group Card — full-width list style ───────────────────────────────────────
function GroupCard({ group, onPress }) {
  const date = group.created_at
    ? new Date(group.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  // const memberCount = group.member_count ?? 0;
  const memberCount = group.members?.length || group.member_count || 0;
  const previewMembers = group.members?.slice(0, 3) || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardInner}>
        {/* Left — avatar */}
        <GroupAvatar name={group.group_name} size={52} />

        {/* Mid — info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{group.group_name}</Text>
          <View style={styles.cardMeta}>
            <Icons.users size={11} color={C.text3} />
            <Text style={styles.cardMetaText}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
            {date ? (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardMetaText}>{date}</Text>
              </>
            ) : null}
          </View>

          {/* Stacked member avatars */}
          {previewMembers.length > 0 && (
            <View style={styles.memberStack}>
              {previewMembers.map((m, i) => (
                <View key={i} style={[styles.memberStackItem, { marginLeft: i === 0 ? 0 : -8 }]}>
                  <MemberAvatar name={m.name || m} size={22} />
                </View>
              ))}
              {memberCount > 3 && (
                <View style={[styles.memberStackMore, { marginLeft: -8 }]}>
                  <Text style={styles.memberStackMoreText}>+{memberCount - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right — chevron */}
        <Icons.chevronRight size={18} color={C.text3} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyGroups({ onCreate }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <Icons.usersPlus size={40} color={C.primary} />
      </View>
      <Text style={styles.emptyTitle}>No groups yet</Text>
      <Text style={styles.emptySub}>
        Create a group to start splitting expenses with friends, family, or colleagues.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate} activeOpacity={0.85}>
        <Icons.plus size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Create your first group</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated }) {
  const { user } = useAuth();
  const [name,          setName]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [allUsers,      setAllUsers]      = useState([]);
  const [picked,        setPicked]        = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [search,        setSearch]        = useState('');

  useEffect(() => {
    if (visible) {
      setName(''); setError(''); setPicked([]); setSearch('');
      loadUsers();
    }
  }, [visible]);

  async function loadUsers() {
    setFetchingUsers(true);
    try {
      const { data } = await client.get('/users/');
      const filtered = data.filter(u => u.user_id !== user?.user_id);
      setAllUsers(filtered);
    } catch {
      setAllUsers([]);
    } finally {
      setFetchingUsers(false);
    }
  }

  function toggleUser(userId) {
    setPicked(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required'); return; }
    setLoading(true);
    try {
      const ids = [...new Set([user.user_id, ...picked])];
      const { data } = await client.post(ENDPOINTS.createGroup, {
        group_name: name.trim(),
        user_ids: ids,
      });
      onCreated({ ...data, group_name: name.trim() });
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail) ? detail[0]?.msg :
        typeof detail === 'string' ? detail : 'Failed to create group'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = search.trim()
    ? allUsers.filter(u => (u.name || u.user_name || '').toLowerCase().includes(search.toLowerCase()))
    : allUsers;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.back size={20} color={C.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            {/* Group name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>GROUP NAME</Text>
              <View style={[styles.fieldInput, error && !name.trim() && styles.fieldInputError]}>
                <Icons.groups size={16} color={C.text3} />
                <TextInput
                  style={styles.fieldTextInput}
                  value={name}
                  onChangeText={v => { setName(v); setError(''); }}
                  placeholder="e.g. Goa Trip 2025"
                  placeholderTextColor={C.text3}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Icons.check size={13} color={C.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Members */}
            <View style={styles.fieldGroup}>
              <View style={styles.membersHeader}>
                <Text style={styles.fieldLabel}>ADD MEMBERS</Text>
                {picked.length > 0 && (
                  <View style={styles.pickedBadge}>
                    <Text style={styles.pickedBadgeText}>{picked.length} selected</Text>
                  </View>
                )}
              </View>
              <Text style={styles.membersSub}>You're included automatically.</Text>

              {/* Search */}
              <View style={styles.memberSearch}>
                <Icons.search size={14} color={C.text3} />
                <TextInput
                  style={styles.memberSearchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search members…"
                  placeholderTextColor={C.text3}
                  autoCapitalize="none"
                />
              </View>

              {fetchingUsers ? (
                <View style={styles.membersLoading}>
                  <ActivityIndicator color={C.primary} size="small" />
                  <Text style={styles.membersLoadingText}>Finding users…</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <Text style={styles.membersEmpty}>
                  {search ? 'No users match that search.' : 'No other users found.'}
                </Text>
              ) : (
                <View style={styles.memberList}>
                  {filteredUsers.map(u => {
                    const isSelected = picked.includes(u.user_id);
                    const displayName = u.name || u.user_name || 'User';
                    return (
                      <TouchableOpacity
                        key={u.user_id}
                        style={[styles.memberItem, isSelected && styles.memberItemActive]}
                        onPress={() => toggleUser(u.user_id)}
                        activeOpacity={0.7}
                      >
                        <MemberAvatar name={displayName} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberItemName, isSelected && { color: C.text }]}>
                            {displayName}
                          </Text>
                          {u.email && (
                            <Text style={styles.memberItemEmail} numberOfLines={1}>{u.email}</Text>
                          )}
                        </View>
                        <View style={[styles.memberCheckbox, isSelected && styles.memberCheckboxOn]}>
                          {isSelected && <Icons.check size={12} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, (!name.trim() || loading) && { opacity: 0.55 }]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Icons.plus size={16} color="#fff" />
                    <Text style={styles.createBtnText}>Create Group</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ groupCount, onCreate, onJoin }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Groups</Text>
        {groupCount > 0 && (
          <Text style={styles.headerSub}>{groupCount} active {groupCount === 1 ? 'group' : 'groups'}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
        
        {/* 🔥 The New Web-Style Blue Pill Join Button */}
        <TouchableOpacity
          style={styles.headerJoinBtn}
          onPress={onJoin}
          activeOpacity={0.7}
        >
          <Icons.externalLink size={14} color={C.primary} />
          <Text style={styles.headerJoinText}>Join</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createHeaderBtn} onPress={onCreate} activeOpacity={0.85}>
          <Icons.plus size={15} color="#fff" />
          <Text style={styles.createHeaderBtnText}>New Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function JoinGroupModal({ visible, onClose, onJoined }) {
  const { user } = useAuth();
  const [input,     setInput]     = useState('');
  const [step,      setStep]      = useState('input'); // input | preview | joining | success
  const [groupInfo, setGroupInfo] = useState(null);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (visible) { setInput(''); setStep('input'); setGroupInfo(null); setError(''); }
  }, [visible]);

  // Accept full URL (https://splitease.app/join/TOKEN) or bare token
  function extractToken(text) {
    const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : text.trim();
  }

  async function handlePreview() {
    const token = extractToken(input);
    if (!token) { setError('Please enter a valid invite link or token.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await client.get(`/invite/${token}`);
      setGroupInfo({ ...data, token });
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired invite link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setStep('joining');
    try {
      const { data } = await client.post(`/invite/${groupInfo.token}/join`);
      setStep('success');
      setTimeout(() => { onJoined(data); onClose(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join group.');
      setStep('preview');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Join via Invite</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Icons.back size={20} color={C.text2} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: SP.base, gap: SP.base, paddingBottom: SP.xl }}>

            {/* ── Success ── */}
            {step === 'success' && (
              <View style={joinStyles.successBox}>
                <View style={joinStyles.successIcon}>
                  <Icons.checkCircle size={32} color={C.success} />
                </View>
                <Text style={joinStyles.successTitle}>You're in!</Text>
                <Text style={joinStyles.successSub}>Redirecting to group…</Text>
              </View>
            )}

            {/* ── Preview / Joining ── */}
            {(step === 'preview' || step === 'joining') && (
              <>
                <View style={joinStyles.previewCard}>
                  <Text style={joinStyles.previewMeta}>YOU'RE JOINING</Text>
                  <Text style={joinStyles.previewName}>{groupInfo?.group_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icons.users size={12} color={C.text3} />
                    <Text style={joinStyles.previewAs}>Joining as {user?.name}</Text>
                  </View>
                </View>
                {!!error && <Text style={joinStyles.errorText}>{error}</Text>}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setStep('input')}>
                    <Text style={styles.cancelBtnText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, { flex: 2 }, step === 'joining' && { opacity: 0.7 }]}
                    onPress={handleJoin}
                    disabled={step === 'joining'}
                  >
                    {step === 'joining'
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Icons.check size={15} color="#fff" /><Text style={styles.createBtnText}>Join Group</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── Input ── */}
            {step === 'input' && (
              <>
                <Text style={joinStyles.hint}>
                  Paste the invite link or token shared by a group member.
                </Text>
                <View style={[styles.fieldInput, !!error && styles.fieldInputError]}>
                  <Icons.externalLink size={16} color={C.text3} />
                  <TextInput
                    style={styles.fieldTextInput}
                    value={input}
                    onChangeText={v => { setInput(v); setError(''); }}
                    placeholder="Paste link or token…"
                    placeholderTextColor={C.text3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {!!error && <Text style={joinStyles.errorText}>{error}</Text>}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, { flex: 2 }, (!input.trim() || loading) && { opacity: 0.55 }]}
                    onPress={handlePreview}
                    disabled={!input.trim() || loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.createBtnText}>Continue →</Text>
                    }
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

// JoinGroupModal-specific styles (small, no overlap with existing styles)
const joinStyles = StyleSheet.create({
  hint:         { fontSize: F.sm, color: C.text2, lineHeight: 19 },
  errorText:    { fontSize: F.sm, color: C.danger, marginTop: -SP.sm },
  previewCard:  {
    backgroundColor: C.surface2, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: SP.base, gap: 4,
  },
  previewMeta:  { fontSize: F.xs, fontWeight: W.bold, color: C.text3, letterSpacing: 0.8, textTransform: 'uppercase' },
  previewName:  { fontSize: F.xl, fontWeight: W.heavy, color: C.text, letterSpacing: -0.3 },
  previewAs:    { fontSize: F.sm, color: C.text3 },
  successBox:   { alignItems: 'center', paddingVertical: SP.xl, gap: SP.md },
  successIcon:  {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.successLo, borderWidth: 1, borderColor: C.success + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: F.xl, fontWeight: W.bold, color: C.text },
  successSub:   { fontSize: F.base, color: C.text3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const navigation   = useNavigation();
  const route        = useRoute();
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (route.params?.openCreate) {
      setShowCreate(true);
      navigation.setParams({ openCreate: false });
    }
  }, [route.params?.openCreate]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // 1. Fetch the user's groups
      const { data: fetchedGroups } = await client.get(ENDPOINTS.groups);
      
      if (!fetchedGroups || fetchedGroups.length === 0) {
        setGroups([]);
        return;
      }

      // 2. Extract the group IDs
      const groupIds = fetchedGroups.map(g => g.group_id);

      // 3. Hit your new bulk endpoint to get the members
      // (Make sure ENDPOINTS.membersBulk exists in your api constants, or use the literal string)
      const { data: membersBulkData } = await client.post('/groups/members-bulk', {
        group_ids: groupIds
      });

      // 4. Stitch the members into the group objects
      const fullyLoadedGroups = fetchedGroups.map(group => {
        const groupMembers = membersBulkData[group.group_id] || [];
        return {
          ...group,
          members: groupMembers,
          member_count: groupMembers.length
        };
      });

      setGroups(fullyLoadedGroups);

    } catch (err) {
      console.error("Failed to load groups or members:", err);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleCreated(newGroup) {
    // setGroups(prev => [newGroup, ...prev]);
    load(); // let load() rebuild the full list with members
    navigation.navigate('GroupDetail', {
      groupId:   newGroup.group_id,
      groupName: newGroup.group_name,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header groupCount={groups.length} onCreate={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Loading groups…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Header groupCount={groups.length} onCreate={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />

      <FlatList
        data={groups}
        keyExtractor={g => String(g.group_id)}
        contentContainerStyle={[
          styles.list,
          groups.length === 0 && styles.listEmpty,
        ]}
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
          <EmptyGroups onCreate={() => setShowCreate(true)} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => navigation.navigate('GroupDetail', {
              groupId:   item.group_id,
              groupName: item.group_name,
            })}
          />
        )}
      />

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      <JoinGroupModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(data) => {
          load(); // refresh groups list
          navigation.navigate('GroupDetail', {
            groupId:   data.group_id,
            groupName: data.group_name || data.message,
          });
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SP.base, paddingTop: SP.md, paddingBottom: SP.base,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: F.xxl, fontWeight: W.heavy, color: C.text, letterSpacing: -0.5 },
  headerSub:   { fontSize: F.sm, color: C.text3, marginTop: 2, fontWeight: W.medium },
  createHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: SP.md, paddingVertical: 8,
  },
  createHeaderBtnText: { fontSize: F.sm, fontWeight: W.bold, color: '#fff' },

  // List
  list:      { padding: SP.base, paddingBottom: 40 },
  listEmpty: { flex: 1 },
  separator: { height: SP.sm },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: SP.base, gap: SP.md,
  },
  cardBody:     { flex: 1, gap: 4 },
  cardName:     { fontSize: F.lg, fontWeight: W.bold, color: C.text, letterSpacing: -0.2 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: F.xs, color: C.text3, fontWeight: W.medium },
  cardDot:      { fontSize: F.xs, color: C.text3 },

  // Stacked member avatars
  memberStack: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  memberStackItem: { borderRadius: 999 },
  memberStackMore: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.surface3, borderWidth: 2, borderColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  memberStackMoreText: { fontSize: 8, color: C.text2, fontWeight: W.bold },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SP.xl, paddingTop: 60,
  },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: R.xxl,
    backgroundColor: C.primaryLo, borderWidth: 1, borderColor: C.primaryMd,
    alignItems: 'center', justifyContent: 'center', marginBottom: SP.lg,
  },
  emptyTitle: { fontSize: F.xl, fontWeight: W.bold, color: C.text, marginBottom: 8, textAlign: 'center' },
  emptySub:   { fontSize: F.base, color: C.text2, textAlign: 'center', lineHeight: 21, marginBottom: SP.xl },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: SP.xl, paddingVertical: 13,
  },
  emptyBtnText: { fontSize: F.md, fontWeight: W.bold, color: '#fff' },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: F.base, color: C.text3 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.border2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SP.base, paddingVertical: SP.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: F.xl, fontWeight: W.bold, color: C.text },
  modalClose: {
    width: 32, height: 32, borderRadius: R.full,
    backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center',
  },
  modalScroll: { padding: SP.base, gap: SP.lg, paddingBottom: SP.lg },

  // Form fields
  fieldGroup:  { gap: SP.sm },
  fieldLabel: {
    fontSize: F.xs, fontWeight: W.bold, color: C.text3,
    letterSpacing: 0.9, textTransform: 'uppercase',
  },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    backgroundColor: C.surface2, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border2,
    paddingHorizontal: SP.md, paddingVertical: 13,
  },
  fieldInputError: { borderColor: C.danger + '60' },
  fieldTextInput: {
    flex: 1, fontSize: F.md, color: C.text, padding: 0,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.dangerLo, borderRadius: R.md,
    borderWidth: 1, borderColor: C.danger + '30',
    paddingHorizontal: SP.md, paddingVertical: 10,
    marginTop: -SP.sm,
  },
  errorText: { fontSize: F.sm, color: C.danger, flex: 1 },

  // Members section
  membersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  membersSub:    { fontSize: F.xs, color: C.text3, marginTop: -4 },
  pickedBadge:   { backgroundColor: C.primaryLo, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3 },
  pickedBadgeText: { fontSize: F.xs, fontWeight: W.bold, color: C.primary },

  memberSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: SP.md, paddingVertical: 9,
  },
  memberSearchInput: { flex: 1, fontSize: F.base, color: C.text, padding: 0 },

  membersLoading:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: SP.md },
  membersLoadingText: { fontSize: F.sm, color: C.text3 },
  membersEmpty:       { fontSize: F.sm, color: C.text3, paddingVertical: SP.md, textAlign: 'center' },

  memberList: { gap: SP.xs },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', gap: SP.md,
    backgroundColor: C.surface2, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: SP.md, paddingVertical: SP.md,
  },
  memberItemActive:  { borderColor: C.primary + '50', backgroundColor: C.primaryLo },
  memberItemName:    { fontSize: F.md, fontWeight: W.semibold, color: C.text2 },
  memberItemEmail:   { fontSize: F.xs, color: C.text3, marginTop: 2 },
  memberCheckbox: {
    width: 22, height: 22, borderRadius: R.sm,
    borderWidth: 2, borderColor: C.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  memberCheckboxOn: { backgroundColor: C.primary, borderColor: C.primary },

  // Footer
  modalFooter: {
    flexDirection: 'row', gap: SP.sm,
    paddingHorizontal: SP.base, paddingVertical: SP.md,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: R.lg,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: F.md, fontWeight: W.semibold, color: C.text2 },
  createBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13, borderRadius: R.lg,
    backgroundColor: C.primary,
  },
  createBtnText: { fontSize: F.md, fontWeight: W.bold, color: '#fff' },

  // ─── Header Join Pill ───
  headerJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryLo,            
    borderWidth: 1,
    borderColor: C.primary + '40',                
    borderRadius: R.full,                    
    paddingHorizontal: 12,
    paddingVertical: 7, // Matches the height of the New Group button perfectly
  },
  headerJoinText: {
    fontSize: F.sm,                        
    fontWeight: W.bold,
    color: C.primary,
  },
});