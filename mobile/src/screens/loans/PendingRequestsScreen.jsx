// mobile/src/screens/loans/PendingRequestsScreen.jsx


import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  FlatList, RefreshControl, StyleSheet, Text,
  TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as peopleApi from '../../api/people';
import * as ledgerNotifsApi from '../../api/ledgerNotifications';
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

function RequestCard({ item, onAccept, onReject }) {
  const [processing, setProcessing] = React.useState(null);

  const wrappedAccept = async () => {
    setProcessing('accept');
    try { await onAccept(); } catch { /* parent shows toast */ } finally { setProcessing(null); }
  };
  const wrappedReject = async () => {
    setProcessing('reject');
    try { await onReject(); } catch { /* parent shows toast */ } finally { setProcessing(null); }
  };
  const isLent      = item.direction === 'lent';
  const accentColor = isLent ? '#f59e0b' : '#818cf8';

  let dateStr = '—';
  if (item.entry_date) {
    const d = new Date(item.entry_date + 'T00:00:00');
    if (!isNaN(d.getTime()))
      dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHead}>
        <View style={[styles.dirBadge, { backgroundColor: accentColor + '18' }]}>
          {isLent
            ? <Icons.sendMoney size={14} color={accentColor} />
            : <Icons.receiveMoney size={14} color={accentColor} />
          }
          <Text style={[styles.dirText, { color: accentColor }]}>
            {isLent ? 'They lent you' : 'They borrowed'}
          </Text>
        </View>
        <Text style={[styles.amount, { color: accentColor }]}>₹{fmt(item.amount)}</Text>
      </View>

      {/* From */}
      <View style={styles.fromRow}>
        <Icons.profile size={14} color={COLORS.text3} />
        <Text style={styles.fromText}>
          Requested by <Text style={styles.fromName}>{item.requested_by}</Text>
        </Text>
      </View>

      {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
      <Text style={styles.dateText}>On {dateStr}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={wrappedReject}
          disabled={processing !== null}
        >
          {processing === 'reject' ? <ActivityIndicator size="small" color={COLORS.danger} /> : (
            <>
              <Icons.close size={14} color={COLORS.danger} />
              <Text style={styles.rejectText}>Decline</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={wrappedAccept}
          disabled={processing !== null}
        >
          {processing === 'accept' ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Icons.check size={14} color="#fff" />
              <Text style={styles.acceptText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PendingRequestsScreen({ navigation, route }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast]         = useState({ msg: '', type: 'success' });
  const [alert, setAlert]         = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await peopleApi.getPendingRequests();
      setRequests(res.data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    ledgerNotifsApi.markAllLedgerRead().catch(() => {});
  }, [load]));

  async function handleAccept(entryId) {
    try {
      await peopleApi.acceptEntry(entryId);
      const updated = requests.filter(r => r.entry_id !== entryId);
      setRequests(updated);
      showToast('Entry accepted');
      try { await ledgerNotifsApi.markAllLedgerRead(); } catch {}
      global.__refreshLedgerBadge?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Failed to accept', 'error');
    }
  }

  function confirmReject(entryId, name) {
    setAlert({
      title: 'Decline request?',
      message: `This will notify ${name} that you declined their entry.`,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
        {
          text: 'Decline', style: 'destructive',
          onPress: async () => {
            setAlert(null);
            try {
              await peopleApi.rejectEntry(entryId);
              const updated = requests.filter(r => r.entry_id !== entryId);
              setRequests(updated);
              showToast('Request declined');
              try { await ledgerNotifsApi.markAllLedgerRead(); } catch {}
              global.__refreshLedgerBadge?.();
            } catch (err) {
              const detail = err?.response?.data?.detail;
              showToast(typeof detail === 'string' ? detail : 'Failed to decline', 'error');
            }
          },
        },
      ],
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Pending Requests"
        compact
        showBack
        onBack={() => {
          route.params?.onReturn?.();
          navigation.goBack();
        }}
      />

      <FlatList
        data={loading ? [] : requests}
        keyExtractor={item => String(item.entry_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={() =>
          loading ? <LoadingState label="Loading requests…" /> : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Icons.checkCircle size={36} color={COLORS.success} />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>
                When someone sends you a ledger entry request, it will appear here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            onAccept={() => handleAccept(item.entry_id)}
            onReject={() => confirmReject(item.entry_id, item.requested_by)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + SPACING.base }]}
      />

      <Toast config={toast} />
      <AppAlert config={alert} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: SPACING.base, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, gap: SPACING.md,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dirBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  dirText:   { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5 },
  amount:    { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  fromRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fromText:  { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  fromName:  { fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  noteText:  { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  dateText:  { fontSize: FONT_SIZE.xs, color: COLORS.text3 },

  actions: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)',
    backgroundColor: 'rgba(255,69,58,0.05)',
  },
  rejectText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.danger },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success,
  },
  acceptText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  emptyBox: {
    alignItems: 'center', paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, textAlign: 'center' },
  emptySub:   { fontSize: FONT_SIZE.base, color: COLORS.text2, textAlign: 'center', lineHeight: 21 },
});