// SplitEase/mobile/src/components/common/PersonSearchField.jsx


import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import * as peopleApi from '../../api/people';
import { Icons } from '../icons/icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

// Shared "search registered users / add custom person" field.
// Used by AddExpenseScreen (Lend/Borrow tabs), LoansScreen's AddLoanModal,
// and PeopleScreen's AddPersonModal — single source of truth for this UX.
export default function PersonSearchField({
  label,
  value,
  onChangeName,
  selectedUser,
  onSelectUser,
  onClearUser,
  placeholder = 'Search name or add custom…',
  error,
  autoFocus = false,
  badgeText = 'Linked to registered user — entry will need their acknowledgement',
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef(null);

  function handleChange(v) {
    onChangeName(v);
    onClearUser();
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (v.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await peopleApi.searchUsers(v.trim());
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function handleSelect(user) {
    onSelectUser(user);
    setSearchResults([]);
  }

  return (
    <View style={{ gap: SPACING.xs }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, selectedUser && { borderColor: COLORS.success }]}>
        {selectedUser
          ? <Icons.checkCircle size={15} color={COLORS.success} />
          : <Icons.search size={15} color={COLORS.text3} />}
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text3}
          autoCapitalize="words"
          autoFocus={autoFocus}
        />
        {searching && <ActivityIndicator size="small" color={COLORS.text3} />}
        {selectedUser && (
          <TouchableOpacity
            onPress={() => { onClearUser(); onChangeName(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.close size={14} color={COLORS.text3} />
          </TouchableOpacity>
        )}
      </View>

      {searchResults.length > 0 && !selectedUser && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsLabel}>REGISTERED USERS</Text>
          {searchResults.map(u => (
            <TouchableOpacity
              key={u.user_id}
              style={styles.searchResultRow}
              onPress={() => handleSelect(u)}
            >
              <View style={styles.searchResultAvatar}>
                <Text style={styles.searchResultAvatarText}>
                  {u.name[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.searchResultName}>{u.name}</Text>
                <Text style={styles.searchResultEmail}>{u.email}</Text>
              </View>
              <Icons.chevronRight size={14} color={COLORS.text3} />
            </TouchableOpacity>
          ))}
          <View style={styles.searchDivider} />
          <TouchableOpacity style={styles.searchResultRow} onPress={() => setSearchResults([])}>
            <Icons.profile size={15} color={COLORS.text3} />
            <Text style={[styles.searchResultName, { color: COLORS.text2 }]}>
              Add "{value}" as custom person
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedUser && (
        <View style={styles.selectedBadge}>
          <Icons.checkCircle size={14} color={COLORS.success} />
          <Text style={styles.selectedBadgeText}>{badgeText}</Text>
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  inputText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },
  searchResults: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginTop: 4,
  },
  searchResultsLabel: {
    fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.text3,
    letterSpacing: 0.9, textTransform: 'uppercase',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 4,
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  searchResultAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchResultAvatarText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  searchResultName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  searchResultEmail: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  searchDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    padding: SPACING.sm, marginTop: 4,
  },
  selectedBadgeText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.success, lineHeight: 16 },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.danger, marginTop: 2 },
});