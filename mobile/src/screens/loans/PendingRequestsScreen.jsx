// mobile/src/screens/loans/PendingRequestsScreen.jsx
//
// Two-level tabs: Received/Sent (existing) × Entries/Repayments (new).
// "Repayments" sub-tab combines both Ledger_Repayments and
// Ledger_Settlement_Requests confirmations, since both represent
// "money owed to me, needs my confirmation."

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

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const dateStr = fmtDate(item.entry_date);

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

// ── Sent entry card (outgoing, awaiting acceptance) ───────────────────────
function SentRequestCard({ item, onCancel }) {
  const isLent      = item.direction === 'lent';
  const accentColor = isLent ? '#f59e0b' : '#818cf8';
  const dateStr = fmtDate(item.entry_date);

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

// ── Confirmation card — covers both repayments and settlements ────────────
function ConfirmationCard({ item, direction, onAccept, onReject, onCancel }) {
  const [processing, setProcessing] = React.useState(null);
  const isSettlement = item.kind === 'settlement';
  const accentColor  = isSettlement ? COLORS.success : (item.direction === 'lent' ? '#f59e0b' : '#818cf8');

  const run = async (action, fn) => {
    setProcessing(action);
    try { await fn(); } catch { /* parent shows toast */ } finally { setProcessing(null); }
  };

  return (
    <View style={[styles.card, direction === 'sent' && { borderColor: accentColor + '30' }]}>
      <View style={styles.cardHead}>
        <View style={[styles.dirBadge, { backgroundColor: accentColor + '18' }]}>
          <Icons.checkCircle size={14} color={accentColor} />
          <Text style={[styles.dirText, { color: accentColor }]}>
            {isSettlement ? 'Settle up' : 'Repayment'}
          </Text>
        </View>
        <Text style={[styles.amount, { color: accentColor }]}>₹{fmt(item.amount)}</Text>
      </View>

      <View style={styles.fromRow}>
        <Icons.profile size={14} color={COLORS.text3} />
        <Text style={styles.fromText}>
          {direction === 'received'
            ? <>Proposed by <Text style={styles.fromName}>{item.requested_by}</Text></>
            : <>Sent to <Text style={styles.fromName}>{item.sent_to || item.person_name}</Text></>
          }
        </Text>
      </View>

      {!isSettlement && item.entry_date ? (
        <Text style={styles.dateText}>Against entry from {fmtDate(item.entry_date)}</Text>
      ) : null}

      {direction === 'received' ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => run('reject', onReject)} disabled={processing !== null}>
            {processing === 'reject' ? <ActivityIndicator size="small" color={COLORS.danger} /> : (
              <><Icons.close size={14} color={COLORS.danger} /><Text style={styles.rejectText}>Decline</Text></>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => run('accept', onAccept)} disabled={processing !== null}>
            {processing === 'accept' ? <ActivityIndicator size="small" color="#fff" /> : (
              <><Icons.check size={14} color="#fff" /><Text style={styles.acceptText}>Confirm</Text></>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusBanner}>
            <Icons.clockPending size={13} color={COLORS.warning} />
            <Text style={[styles.statusBannerText, { color: COLORS.warning }]}>
              Awaiting their confirmation
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelSentBtn} onPress={() => run('cancel', onCancel)} disabled={processing !== null}>
              {processing === 'cancel' ? <ActivityIndicator size="small" color={COLORS.danger} /> : (
                <><Icons.close size={14} color={COLORS.danger} /><Text style={styles.rejectText}>Cancel</Text></>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export default function PendingRequestsScreen({ navigation, route }) {
  const [tab, setTab]         = useState('received');    // 'received' | 'sent'
  const [subTab, setSubTab]   = useState('entries');      // 'entries' | 'confirmations'

  const [received, setReceived]                 = useState([]);
  const [sent, setSent]                         = useState([]);
  const [receivedConfirms, setReceivedConfirms] = useState([]);
  const [sentConfirms, setSentConfirms]         = useState([]);

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
      const [recRes, sentRes, recRepay, sentRepay, recSettle, sentSettle] = await Promise.allSettled([
        peopleApi.getPendingRequests(),
        peopleApi.getSentRequests(),
        peopleApi.getPendingRepayments(),
        peopleApi.getSentRepayments(),
        peopleApi.getPendingSettlements(),
        peopleApi.getSentSettlements(),
      ]);
      setReceived(recRes.status === 'fulfilled' ? (recRes.value.data || []) : []);
      setSent(sentRes.status === 'fulfilled' ? (sentRes.value.data || []) : []);

      const repayIn   = recRepay.status  === 'fulfilled' ? (recRepay.value.data  || []) : [];
      const settleIn  = recSettle.status === 'fulfilled' ? (recSettle.value.data || []) : [];
      const repayOut  = sentRepay.status  === 'fulfilled' ? (sentRepay.value.data  || []) : [];
      const settleOut = sentSettle.status === 'fulfilled' ? (sentSettle.value.data || []) : [];

      setReceivedConfirms([
        ...repayIn.map(r => ({ ...r, kind: 'repayment', id: r.repayment_id })),
        ...settleIn.map(r => ({ ...r, kind: 'settlement', id: r.request_id, amount: r.net_amount })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      setSentConfirms([
        ...repayOut.map(r => ({ ...r, kind: 'repayment', id: r.repayment_id })),
        ...settleOut.map(r => ({ ...r, kind: 'settlement', id: r.request_id, amount: r.net_amount })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      setReceived([]); setSent([]);
      setReceivedConfirms([]); setSentConfirms([]);
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

  async function handleConfirmAccept(item) {
    try {
      if (item.kind === 'repayment') await peopleApi.acceptRepayment(item.id);
      else await peopleApi.acceptSettlement(item.id);
      setReceivedConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      showToast(item.kind === 'repayment' ? 'Repayment confirmed' : 'Settlement confirmed');
      global.__refreshLedgerBadge?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Failed to confirm', 'error');
      throw err;
    }
  }

  async function handleConfirmReject(item) {
    try {
      if (item.kind === 'repayment') await peopleApi.rejectRepayment(item.id);
      else await peopleApi.rejectSettlement(item.id);
      setReceivedConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      showToast(item.kind === 'repayment' ? 'Repayment declined' : 'Settlement declined');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Failed to decline', 'error');
      throw err;
    }
  }

  async function handleConfirmCancel(item) {
    try {
      if (item.kind === 'repayment') await peopleApi.cancelRepayment(item.id);
      else await peopleApi.cancelSettlement(item.id);
      setSentConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      showToast('Request cancelled');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Failed to cancel', 'error');
      throw err;
    }
  }

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

  const entryData    = tab === 'received' ? received : sent;
  const confirmData  = tab === 'received' ? receivedConfirms : sentConfirms;
  const displayData  = subTab === 'entries' ? entryData : confirmData;

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

      {/* Received / Sent */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, tab === 'received' && styles.tabItemActive]} onPress={() => setTab('received')}>
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            Received {received.length + receivedConfirms.length > 0 ? `(${received.length + receivedConfirms.length})` : ''}
          </Text>
          {tab === 'received' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, tab === 'sent' && styles.tabItemActive]} onPress={() => setTab('sent')}>
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            Sent {sent.length + sentConfirms.length > 0 ? `(${sent.length + sentConfirms.length})` : ''}
          </Text>
          {tab === 'sent' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Entries / Repayments */}
      <View style={styles.subTabRow}>
        <TouchableOpacity style={[styles.subTabBtn, subTab === 'entries' && styles.subTabBtnActive]} onPress={() => setSubTab('entries')}>
          <Text style={[styles.subTabText, subTab === 'entries' && styles.subTabTextActive]}>
            Entries {entryData.length > 0 ? `(${entryData.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTabBtn, subTab === 'confirmations' && styles.subTabBtnActive]} onPress={() => setSubTab('confirmations')}>
          <Text style={[styles.subTabText, subTab === 'confirmations' && styles.subTabTextActive]}>
            Repayments {confirmData.length > 0 ? `(${confirmData.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : displayData}
        keyExtractor={item => subTab === 'entries' ? String(item.entry_id) : `${item.kind}-${item.id}`}
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
                {subTab === 'entries'
                  ? (tab === 'received' ? 'No incoming requests' : 'No outgoing requests')
                  : (tab === 'received' ? 'Nothing awaiting confirmation' : 'No pending confirmations sent')}
              </Text>
              <Text style={styles.emptySub}>
                {subTab === 'entries'
                  ? (tab === 'received'
                      ? 'When someone sends you a ledger entry, it will appear here.'
                      : 'Entries you send to registered users that are awaiting acceptance will appear here.')
                  : (tab === 'received'
                      ? 'Repayments or settle-ups others propose against your shared ledger will appear here.'
                      : 'Repayments or settle-ups you propose that need their confirmation will appear here.')}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) =>
          subTab === 'entries' ? (
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
          ) : (
            <ConfirmationCard
              item={item}
              direction={tab}
              onAccept={() => handleConfirmAccept(item)}
              onReject={() => handleConfirmReject(item)}
              onCancel={() => handleConfirmCancel(item)}
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
  subTabRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: COLORS.surface2,
    padding: 4,
    margin: SPACING.base,
    marginBottom: 0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  subTabBtn: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: RADIUS.sm },
  subTabBtnActive: { backgroundColor: COLORS.surface },
  subTabText: { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  subTabTextActive: { color: COLORS.text },
});