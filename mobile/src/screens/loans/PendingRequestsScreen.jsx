// mobile/src/screens/loans/PendingRequestsScreen.jsx


import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

// ── Sent request card (outgoing, awaiting acceptance) ────────────────────────
function SentRequestCard({ item, onCancel }) {
  const isLent      = item.direction === 'lent';
  const accentColor = isLent ? '#f59e0b' : '#818cf8';

  let dateStr = '—';
  if (item.entry_date) {
    const d = new Date(item.entry_date + 'T00:00:00');
    if (!isNaN(d.getTime()))
      dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <View style={[styles.card, { borderColor: accentColor + '30' }]}>
      <View style={styles.cardHead}>
        <View style={[styles.dirBadge, { backgroundColor: accentColor + '18' }]}>
          {isLent
            ? <Icons.sendMoney size={14} color={accentColor} />
            : <Icons.receiveMoney size={14} color={accentColor} />
          }
          <Text style={[styles.dirText, { color: accentColor }]}>
            {isLent ? 'You lent' : 'You borrowed'}
          </Text>
        </View>
        <Text style={[styles.amount, { color: accentColor }]}>
          ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.fromRow}>
        <Icons.profile size={14} color={COLORS.text3} />
        <Text style={styles.fromText}>
          Sent to <Text style={styles.fromName}>{item.sent_to || item.person_name}</Text>
        </Text>
      </View>

      {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
      <Text style={styles.dateText}>On {dateStr}</Text>

      <View style={[styles.statusBanner]}>
        <Icons.clockPending size={13} color={COLORS.warning} />
        <Text style={[styles.statusBannerText, { color: COLORS.warning }]}>
          Awaiting their acceptance
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelSentBtn} onPress={onCancel}>
          <Icons.close size={14} color={COLORS.danger} />
          <Text style={styles.rejectText}>Cancel & Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PendingRequestsScreen({ navigation, route }) {
  const [tab, setTab]               = useState('received');
  const [received, setReceived]     = useState([]);
  const [sent, setSent]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const [alert, setAlert]           = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [recRes, sentRes] = await Promise.allSettled([
        peopleApi.getPendingRequests(),
        peopleApi.getSentRequests(),
      ]);
      setReceived(recRes.status === 'fulfilled' ? (recRes.value.data || []) : []);
      setSent(sentRes.status === 'fulfilled' ? (sentRes.value.data || []) : []);
    } catch {
      setReceived([]); setSent([]);
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
      setReceived(prev => prev.filter(r => r.entry_id !== entryId));
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
              setReceived(prev => prev.filter(r => r.entry_id !== entryId));
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

  function confirmCancelSent(entryId, personName) {
    setAlert({
      title: 'Cancel request?',
      message: `This will delete the pending entry for ${personName}. They won't be notified.`,
      buttons: [
        { text: 'Keep', style: 'cancel', onPress: () => setAlert(null) },
        {
          text: 'Cancel Request', style: 'destructive',
          onPress: async () => {
            setAlert(null);
            try {
              await peopleApi.deleteEntry(entryId);
              setSent(prev => prev.filter(r => r.entry_id !== entryId));
              showToast('Request cancelled');
            } catch (err) {
              const detail = err?.response?.data?.detail;
              showToast(typeof detail === 'string' ? detail : 'Failed to cancel', 'error');
            }
          },
        },
      ],
    });
  }

  const displayData = tab === 'received' ? received : sent;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Requests"
        compact
        showBack
        onBack={() => {
          route.params?.onReturn?.();
          navigation.goBack();
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'received' && styles.tabItemActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            Received {received.length > 0 ? `(${received.length})` : ''}
          </Text>
          {tab === 'received' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'sent' && styles.tabItemActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            Sent {sent.length > 0 ? `(${sent.length})` : ''}
          </Text>
          {tab === 'sent' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : displayData}
        keyExtractor={item => String(item.entry_id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={() =>
          loading ? <LoadingState label="Loading…" /> : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Icons.checkCircle size={36} color={COLORS.success} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 'received' ? 'No incoming requests' : 'No outgoing requests'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'received'
                  ? 'When someone sends you a ledger entry, it will appear here.'
                  : 'Entries you send to registered users that are awaiting acceptance will appear here.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) =>
          tab === 'received' ? (
            <RequestCard
              item={item}
              onAccept={() => handleAccept(item.entry_id)}
              onReject={() => confirmReject(item.entry_id, item.requested_by)}
            />
          ) : (
            <SentRequestCard
              item={item}
              onCancel={() => confirmCancelSent(item.entry_id, item.sent_to || item.person_name)}
            />
          )
        }
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

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabTextActive: { color: COLORS.text, fontWeight: FONT_WEIGHT.semibold },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: SPACING.sm,
  },
  statusBannerText: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 16 },
  cancelSentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
    backgroundColor: 'rgba(255,69,58,0.05)',
  },
});