// mobile/src/screens/loans/PeopleScreen.jsx


import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  FlatList, Keyboard, Modal, Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as peopleApi from '../../api/people';
import AppAlert from '../../components/common/AppAlert';
import Toast from '../../components/common/Toast';
import { LoadingState } from '../../components/common/Ui';
import { Icons } from '../../components/icons/icons';
import ScreenHeader from '../../components/layout/ScreenHeader';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, TAB_BAR_HEIGHT,
} from '../../constants/theme';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ── Person card ──────────────────────────────────────────────────────────────
function PersonCard({ item, onPress }) {
  const net = item.net_balance;
  const isOwed = net > 0;
  const isOwe  = net < 0;
  const settled = net === 0;

  const netColor = isOwed ? '#f59e0b' : isOwe ? '#818cf8' : COLORS.text3;
  const netLabel = isOwed
    ? `Owes you ₹${fmt(Math.abs(net))}`
    : isOwe
    ? `You owe ₹${fmt(Math.abs(net))}`
    : 'All settled';

  const initials = item.display_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  // deterministic colour from name
  const AVATAR_COLORS = [
    '#2563eb','#7c3aed','#059669','#d97706','#dc2626',
    '#0891b2','#65a30d','#9333ea','#e11d48','#0369a1',
  ];
  let hash = 0;
  for (let i = 0; i < item.display_name.length; i++)
    hash = item.display_name.charCodeAt(i) + ((hash << 5) - hash);
  const avatarBg = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return (
    <TouchableOpacity style={styles.personCard} onPress={onPress} activeOpacity={0.78}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>{initials || '?'}</Text>
      </View>

      {/* Name + meta */}
      <View style={styles.personMeta}>
        <Text style={styles.personName}>{item.display_name}</Text>
        <Text style={[styles.personNet, { color: netColor }]}>{netLabel}</Text>
        {item.active_entries > 0 && (
          <Text style={styles.personSub}>
            {item.active_entries} active entr{item.active_entries === 1 ? 'y' : 'ies'}
          </Text>
        )}
      </View>

      {/* Right chevron */}
      <Icons.chevronRight size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );
}

// ── Add person modal ─────────────────────────────────────────────────────────
function AddPersonModal({ visible, onClose, onSuccess }) {
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function reset() { setName(''); setError(''); setSaving(false); }

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    setTimeout(async () => {
      try {
        await peopleApi.createPerson({ display_name: name.trim() });
        reset();
        onClose();
        setTimeout(() => onSuccess?.(), 300);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Failed to save');
        setSaving(false);
      }
    }, 250);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.header}>
            <View style={[modal.headerIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Icons.users size={18} color="#818cf8" />
            </View>
            <Text style={modal.title}>Add Person</Text>
            <TouchableOpacity style={modal.closeBtn} onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.close size={16} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: SPACING.base, gap: SPACING.md }}>
            {!!error && (
              <View style={modal.errorBanner}>
                <Text style={modal.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ gap: SPACING.xs }}>
              <Text style={modal.label}>NAME</Text>
              <View style={modal.inputRow}>
                <Icons.profile size={15} color={COLORS.text3} />
                <TextInput
                  style={modal.inputText}
                  value={name}
                  onChangeText={v => { setName(v); setError(''); }}
                  placeholder="e.g. Rahul, Mom, Priya…"
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            <Text style={modal.hint}>
              You can record multiple loans and borrows under this person. 
              No account needed — anyone works.
            </Text>
          </View>

          <View style={modal.footer}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.submitBtn, (!name.trim() || saving) && { opacity: 0.55 }]}
              onPress={handleSubmit}
              disabled={!name.trim() || saving}
            >
              <Icons.plus size={15} color="#fff" />
              <Text style={modal.submitText}>{saving ? 'Saving…' : 'Add Person'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function PeopleScreen({ navigation }) {
  const [people, setPeople]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [toast, setToast]         = useState({ msg: '', type: 'success' });
  const [alert, setAlert]         = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await peopleApi.getPeople();
      setPeople(res.data || []);
    } catch {
      setPeople([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = search.trim()
    ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()))
    : people;

  // Summary totals
  const totalOwedToMe = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalIOwe     = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="People"
        compact
        showBack
        onBack={() => navigation.goBack()}
        actions={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
            <Icons.plus size={15} color="#fff" />
            <Text style={styles.addBtnText}>Add Person</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={item => String(item.person_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {/* Summary strip */}
            {people.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>OWED TO YOU</Text>
                  <Text style={[styles.summaryVal, { color: '#f59e0b' }]}>₹{fmt(totalOwedToMe)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                  <Text style={styles.summaryLabel}>YOU OWE</Text>
                  <Text style={[styles.summaryVal, { color: '#818cf8' }]}>₹{fmt(totalIOwe)}</Text>
                </View>
              </View>
            )}

            {/* Search bar */}
            {people.length > 0 && (
              <View style={styles.searchRow}>
                <Icons.search size={16} color={COLORS.text3} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search people…"
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="none"
                />
                {!!search && (
                  <TouchableOpacity onPress={() => setSearch('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icons.close size={14} color={COLORS.text3} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() =>
          loading ? (
            <LoadingState label="Loading people…" />
          ) : search.trim() ? (
            <View style={styles.emptyBox}>
              <Icons.search size={40} color={COLORS.text3} />
              <Text style={styles.emptyTitle}>No results for "{search}"</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Icons.users size={36} color="#818cf8" />
              </View>
              <Text style={styles.emptyTitle}>No people yet</Text>
              <Text style={styles.emptySub}>
                Add a person to start tracking loans and borrows with them across multiple transactions.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                <Icons.plus size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Add First Person</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PersonCard
            item={item}
            onPress={() => navigation.navigate('PersonLedger', {
              personId: item.person_id,
              personName: item.display_name,
            })}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + SPACING.base }]}
      />

      <AddPersonModal
        visible={showAdd}
        onClose={() => {
          Keyboard.dismiss();
          setTimeout(() => setShowAdd(false), Platform.OS === 'android' ? 300 : 150);
        }}
        onSuccess={() => { showToast('Person added'); load(true); }}
      />
      <Toast config={toast} />
      <AppAlert config={alert} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  list:    { padding: SPACING.base, gap: SPACING.sm },
  listHeader: { gap: SPACING.md, marginBottom: SPACING.sm },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  addBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  summaryCard: { flex: 1, padding: SPACING.base, gap: 4 },
  summaryLabel: {
    fontSize: 9, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase',
  },
  summaryVal: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },

  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  personMeta: { flex: 1, gap: 2 },
  personName: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  personNet:  { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  personSub:  { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  emptyBox: {
    alignItems: 'center', paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text, textAlign: 'center',
  },
  emptySub: {
    fontSize: FONT_SIZE.base, color: COLORS.text2,
    textAlign: 'center', lineHeight: 21,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl, paddingVertical: 13,
    marginTop: SPACING.sm, backgroundColor: '#818cf8',
  },
  emptyBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
  },
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
  hint: { fontSize: FONT_SIZE.sm, color: COLORS.text3, lineHeight: 18 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: SPACING.md,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  footer: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border2, alignItems: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2 },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: RADIUS.lg, backgroundColor: '#818cf8',
  },
  submitText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});