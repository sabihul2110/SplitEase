// SplitEase/mobile/src/screens/groups/GroupsScreen.jsx

/**
 * GroupsScreen.jsx
 * Grid/list of all user's groups. Includes "New Group" bottom sheet.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  Alert, RefreshControl, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Avatar, EmptyState, LoadingState, Badge } from '../../components/common/ui';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';
import ScreenHeader from '../../components/layout/ScreenHeader';

// ── Group card ────────────────────────────────────────────────────────────
function GroupCard({ group, onPress }) {
  const date = group.created_at
    ? new Date(group.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Avatar name={group.group_name} size={44} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{group.group_name}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Badge label={`${group.member_count ?? '—'} members`} variant="neutral" />
        <Text style={styles.cardArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Create Group Modal ─────────────────────────────────────────────────────
// function CreateGroupModal({ visible, onClose, onCreated }) {
//   const [name,    setName]    = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error,   setError]   = useState('');

//   useEffect(() => {
//     if (!visible) { setName(''); setError(''); }
//   }, [visible]);

//   async function handleCreate() {
//     if (!name.trim()) { setError('Group name is required'); return; }
//     setLoading(true);
//     try {
//       const { data } = await client.post(ENDPOINTS.createGroup, { group_name: name.trim() });
//       onCreated(data);
//       onClose();
//     } catch (err) {
//       setError(err.response?.data?.detail || 'Failed to create group');
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       onRequestClose={onClose}
//     >
//       <KeyboardAvoidingView
//         style={styles.modalOverlay}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
//         <View style={styles.modalBox}>
//           <View style={styles.modalHandle} />
//           <Text style={styles.modalTitle}>New Group</Text>
//           <Text style={styles.modalSub}>You'll be added as the first member</Text>

//           <Input
//             label="Group Name"
//             value={name}
//             onChangeText={v => { setName(v); setError(''); }}
//             placeholder="e.g. Goa Trip 2025"
//             autoCapitalize="words"
//             error={error}
//             style={styles.modalInput}
//           />

//           <View style={styles.modalActions}>
//             <Button title="Cancel"      onPress={onClose}       variant="ghost"   fullWidth />
//             <Button title="Create"      onPress={handleCreate}  loading={loading} fullWidth />
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </Modal>
//   );
// }

// ── Create Group Modal ─────────────────────────────────────────────────────
function CreateGroupModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 🔥 New State for User Selection
  const [allUsers, setAllUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // You may need to import your auth context here to get the current user's ID
  // const { user } = useAuth(); 

  useEffect(() => {
    if (visible) {
      setName('');
      setError('');
      setPicked([]);
      loadUsers();
    }
  }, [visible]);

  async function loadUsers() {
    setFetchingUsers(true);
    try {
      const { data } = await client.get('/users/');
      // If you have the current user context, you can filter them out like the web app:
      // setAllUsers(data.filter(u => u.user_id !== user?.user_id));
      setAllUsers(data); 
    } catch (err) {
      console.error("Failed to fetch users", err);
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
    if (picked.length === 0) { setError('Select at least one other member.'); return; }

    setLoading(true);
    try {
      // 🔥 Match web logic: Combine current user ID with picked IDs
      // const ids = [...new Set([user.user_id, ...picked])];
      
      const payload = { 
        group_name: name.trim(), 
        user_ids: picked // Replace with `ids` if you inject the current user
      };

      const { data } = await client.post(ENDPOINTS.createGroup, payload);
      onCreated(data);
      onClose();
    } catch (err) {
      // 🔥 Safely handle FastAPI's array-based error details
      const detail = err.response?.data?.detail;
      let errorMessage = 'Failed to create group';
      
      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg; 
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade" // Changed to fade for a centered pop-up feel
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        
        {/* 🔥 Now a centered box instead of a bottom sheet */}
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Group Name"
            value={name}
            onChangeText={v => { setName(v); setError(''); }}
            placeholder="e.g. Goa Trip 2025"
            autoCapitalize="words"
            error={error}
            style={styles.modalInput}
          />

          {/* 🔥 User Selection Area */}
          <View style={styles.membersSection}>
            <Text style={styles.membersLabel}>Add members</Text>
            <Text style={styles.membersSub}>You're included automatically. Pick others:</Text>
            
            {fetchingUsers ? (
              <Text style={styles.membersLoading}>Loading users...</Text>
            ) : allUsers.length === 0 ? (
              <Text style={styles.membersLoading}>No other users found.</Text>
            ) : (
              <View style={styles.chipWrapper}>
                {allUsers.map(u => {
                  const isSelected = picked.includes(u.user_id);
                  return (
                    <TouchableOpacity 
                      key={u.user_id} 
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => toggleUser(u.user_id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {isSelected ? '✓ ' : ''}{u.name || u.user_name || 'User'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <Button title="Cancel" onPress={onClose} variant="ghost" style={{ flex: 1 }} />
            <Button title="Create" onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const navigation   = useNavigation();
  const route        = useRoute();
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Support opening create modal from Dashboard quick action
  useEffect(() => {
    if (route.params?.openCreate) {
      setShowCreate(true);
      navigation.setParams({ openCreate: false });
    }
  }, [route.params?.openCreate]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const { data } = await client.get(ENDPOINTS.groups);
      setGroups(data);
    } catch {
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleCreated(newGroup) {
    setGroups(prev => [newGroup, ...prev]);
    navigation.navigate('GroupDetail', {
      groupId:   newGroup.group_id,
      groupName: newGroup.group_name,
    });
  }

  if (loading) return <LoadingState label="Loading groups…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Groups"
        // 🔥 Changed from rightElement to actions!
        actions={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* 🔥 Text changes based on whether groups exist or not */}
            <Text style={styles.addBtnText}>
              {groups.length === 0 ? 'Create First Group' : 'Create Group'}
            </Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={groups}
        keyExtractor={g => String(g.group_id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
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
          <EmptyState
            icon="🏘️"
            title="No groups yet"
            subtitle="Create a group to start splitting expenses."
          />
        )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  list:    { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING['2xl'] },
  row:     { gap: SPACING.sm },

  card: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base, gap: SPACING.md,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  cardInfo:   { flex: 1 },
  cardName:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text, lineHeight: 20 },
  cardDate:   { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardArrow:  { fontSize: FONT_SIZE.lg, color: COLORS.text3 },

  addBtn:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 6 },
  addBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.white },

  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', // Centers it vertically
    alignItems: 'center',     // Centers it horizontally
    padding: SPACING.lg,      // Keeps it from touching screen edges
  },
  modalBg: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  modalBox: {
    width: '100%',            // Take up available padded space
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.xl,  // Fully rounded on all sides now
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.xl, 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  modalTitle: { 
    fontSize: FONT_SIZE.xl, 
    fontWeight: FONT_WEIGHT.bold, 
    color: COLORS.text 
  },
  closeText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text3,
    fontWeight: '600',
  },
  modalInput: { 
    marginBottom: SPACING.base,
  },
  
  // 🔥 New User Selection Styles
  membersSection: {
    marginBottom: SPACING.xl,
  },
  membersLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  membersSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    marginBottom: SPACING.sm,
  },
  membersLoading: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
    paddingVertical: SPACING.sm,
  },
  chipWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: 'rgba(99,102,241,0.15)', // Your web indigo accent
    borderColor: 'rgba(99,102,241,0.3)',
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#818cf8',
    fontWeight: '600',
  },

  modalActions: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
  },
});