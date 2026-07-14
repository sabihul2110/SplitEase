// SplitEase/mobile/src/screens/loans/PersonLedgerScreen.jsx


import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as peopleApi from '../../api/people';
import { useAuth } from '../../context/AuthContext';
import AppAlert from '../../components/common/AppAlert';
import DatePickerInput from '../../components/common/DatePickerInput';
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

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  const safeWidth = isNaN(pct) ? 0 : Math.min(Math.max(pct, 0), 100);
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressBar, { width: `${safeWidth}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Net balance summary bar ───────────────────────────────────────────────────
function NetBar({ entries, onSettleUp, settling }) {
  const net = entries.reduce((s, e) => {
    const rem = Number(e.remaining_amount);
    return e.direction === 'lent' ? s + rem : s - rem;
  }, 0);

  const isOwed   = net > 0;
  const isOwe    = net < 0;
  const netColor = isOwed ? '#f59e0b' : isOwe ? '#818cf8' : COLORS.success;
  // const netLabel = isOwed
  //   ? `Owes you ₹${fmt(Math.abs(net))}`
  //   : isOwe
  //   ? `You owe ₹${fmt(Math.abs(net))}`
  //   : 'All settled up';
  const activeCount = entries.filter(e => e.status === 'active').length;
  const netLabel = isOwed
    ? `Owes you ₹${fmt(Math.abs(net))}`
    : isOwe
    ? `You owe ₹${fmt(Math.abs(net))}`
    : activeCount > 0 ? 'Net zero — entries still open' : 'All settled up';

  const totalLent     = entries.filter(e => e.direction === 'lent').reduce((s, e) => s + Number(e.amount), 0);
  const totalBorrowed = entries.filter(e => e.direction === 'borrowed').reduce((s, e) => s + Number(e.amount), 0);

  // return (
  //   <View style={styles.netBar}>
  //     <View style={styles.netMain}>
  //       <Text style={styles.netLabel}>NET BALANCE</Text>
  //       <Text style={[styles.netVal, { color: netColor }]}>{netLabel}</Text>
  //     </View>
  //     <View style={styles.netSubs}>
  //       <View style={styles.netSubItem}>
  //         <Text style={styles.netSubLabel}>You lent</Text>
  //         <Text style={[styles.netSubVal, { color: '#f59e0b' }]}>₹{fmt(totalLent)}</Text>
  //       </View>
  //       <View style={[styles.netSubItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
  //         <Text style={styles.netSubLabel}>You borrowed</Text>
  //         <Text style={[styles.netSubVal, { color: '#818cf8' }]}>₹{fmt(totalBorrowed)}</Text>
  //       </View>
  //     </View>
  //   </View>
  // );
  return (
    <View style={styles.netBar}>
      <View style={styles.netMain}>
        <Text style={styles.netLabel}>NET BALANCE</Text>
        <Text style={[styles.netVal, { color: netColor }]}>{netLabel}</Text>
      </View>
      <View style={styles.netSubs}>
        <View style={styles.netSubItem}>
          <Text style={styles.netSubLabel}>You lent</Text>
          <Text style={[styles.netSubVal, { color: '#f59e0b' }]}>₹{fmt(totalLent)}</Text>
        </View>
        <View style={[styles.netSubItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
          <Text style={styles.netSubLabel}>You borrowed</Text>
          <Text style={[styles.netSubVal, { color: '#818cf8' }]}>₹{fmt(totalBorrowed)}</Text>
        </View>
      </View>
      {/* Settle Up button — shown when there is an active net balance */}
      {(isOwed || isOwe) && (
        <TouchableOpacity
          style={[
            styles.settleBtn,
            { backgroundColor: isOwed ? 'rgba(245,158,11,0.12)' : 'rgba(129,140,248,0.12)' },
            settling && { opacity: 0.6 },
          ]}
          onPress={onSettleUp}
          disabled={settling}
          activeOpacity={0.75}
        >
          <Icons.checkCircle size={16} color={isOwed ? '#f59e0b' : '#818cf8'} />
          <Text style={[styles.settleBtnText, { color: isOwed ? '#f59e0b' : '#818cf8' }]}>
            {settling
              ? 'Settling…'
              : isOwed
              ? `Mark ₹${fmt(Math.abs(net))} as Received`
              : `Mark ₹${fmt(Math.abs(net))} as Paid`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
// function EntryCard({ item, onRefresh, showToast, setAlert, isSelecting, isSelected, onLongPress, onSelect }) {
//   const [repayAmt, setRepayAmt] = useState('');
//   const [repayErr, setRepayErr] = useState('');
//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const mountedRef = useRef(true);

//   useEffect(() => {
//     mountedRef.current = true;
//     return () => { mountedRef.current = false; };
//   }, []);

//   const isLent = item.direction === 'lent';
//   const isPending = item.status === 'pending';
//   const isRejected = item.status === 'rejected';
//   const accentColor = isPending ? COLORS.text3 : isRejected ? COLORS.danger : isLent ? '#f59e0b' : '#818cf8';
//   const dirLabel = isLent ? 'Lent' : 'Borrowed';
//   const dateLabel = isLent ? 'Lent on' : 'Borrowed on';

//   const safeAmt = Number(item.amount) || 0;
//   const safeRem = Number(item.remaining_amount) || 0;
//   const pct = safeAmt > 0 ? Math.round(((safeAmt - safeRem) / safeAmt) * 100) : 100;

//   let dateStr = '—';
//   if (item.entry_date) {
//     const d = new Date(item.entry_date + 'T00:00:00');
//     if (!isNaN(d.getTime()))
//       dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
//   }

//   async function handleRepay() {
//     Keyboard.dismiss();
//     setRepayErr('');
//     const amountInput = parseFloat(repayAmt);
//     if (isNaN(amountInput) || amountInput <= 0) { setRepayErr('Enter a valid amount'); return; }
//     if (amountInput > safeRem) { setRepayErr(`Max ₹${safeRem.toLocaleString('en-IN')}`); return; }
//     setSaving(true);
//     setTimeout(async () => {
//       try {
//         await peopleApi.repayEntry(item.entry_id, amountInput);
//         if (!mountedRef.current) return;
//         setRepayAmt('');
//         showToast?.('Repayment recorded');
//         onRefresh?.();
//       } catch (ex) {
//         if (!mountedRef.current) return;
//         const detail = ex?.response?.data?.detail;
//         setRepayErr(typeof detail === 'string' ? detail : 'Failed');
//       } finally {
//         if (mountedRef.current) setSaving(false);
//       }
//     }, 250);
//   }

//   function handleDelete() {
//     Keyboard.dismiss();
//     setAlert({
//       title: 'Delete entry?',
//       message: 'This cannot be undone.',
//       buttons: [
//         { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
//         {
//           text: 'Delete', style: 'destructive',
//           onPress: async () => {
//             setAlert(null); setDeleting(true);
//             try {
//               await peopleApi.deleteEntry(item.entry_id);
//               showToast?.('Deleted');
//               onRefresh?.();
//             } catch (err) {
//               setDeleting(false);
//               const detail = err?.response?.data?.detail;
//               showToast?.(typeof detail === 'string' ? detail : 'Failed to delete', 'error');
//             }
//           },
//         },
//       ],
//     });
//   }

//   return (
//     <TouchableOpacity
//       style={[
//         styles.entryCard,
//         isSelected && styles.entryCardSelected,
//         isPending && styles.entryCardPending,
//         isRejected && styles.entryCardRejected,
//       ]}
//       onLongPress={onLongPress}
//       onPress={isSelecting ? onSelect : undefined}
//       activeOpacity={isSelecting ? 0.7 : 1}
//       delayLongPress={350}
//     >
//       {/* Selection indicator */}
//       {isSelecting && (
//         <View style={styles.selectionIndicator}>
//           {isSelected
//             ? <Icons.checkSquare size={20} color={COLORS.primary} />
//             : <Icons.square size={20} color={COLORS.text3} />
//           }
//         </View>
//       )}
//       {/* Header row */}
//       <View style={styles.entryHead}>
//         <View style={[styles.dirBadge, { backgroundColor: accentColor + '18' }]}>
//           {isLent
//             ? <Icons.sendMoney size={14} color={accentColor} />
//             : <Icons.receiveMoney size={14} color={accentColor} />
//           }
//           <Text style={[styles.dirText, { color: accentColor }]}>{dirLabel}</Text>
//         </View>
//         <Text style={[styles.entryAmt, { color: accentColor }]}>₹{fmt(item.amount)}</Text>
//       </View>

//       {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}

//       {isPending && (
//         <View style={styles.statusBanner}>
//           <Icons.clockPending size={13} color={COLORS.warning} />
//           <Text style={[styles.statusBannerText, { color: COLORS.warning }]}>
//             Awaiting acknowledgement from the other person
//           </Text>
//         </View>
//       )}
//       {isRejected && (
//         <View style={[styles.statusBanner, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: 'rgba(255,69,58,0.2)' }]}>
//           <Icons.close size={13} color={COLORS.danger} />
//           <Text style={[styles.statusBannerText, { color: COLORS.danger }]}>
//             Declined — delete and re-request if needed
//           </Text>
//         </View>
//       )}

//       {/* Progress — only for active/repaid */}
//       {!isPending && !isRejected && (
//         <View>
//           <View style={styles.progressHead}>
//             <Text style={styles.progressLabel}>
//               {item.status === 'repaid' ? 'Fully settled' : `${pct}% settled`}
//             </Text>
//             <Text style={[styles.progressRight, { color: item.status === 'repaid' ? COLORS.success : accentColor }]}>
//               {item.status === 'repaid' ? 'Done' : `₹${safeRem.toLocaleString('en-IN')} left`}
//             </Text>
//           </View>
//           <ProgressBar pct={pct} color={item.status === 'repaid' ? COLORS.success : accentColor} />
//         </View>
//       )}

//       <Text style={styles.entryDate}>{dateLabel} {dateStr}</Text>

//       {/* Repay input (active only) */}
//       {/* {item.status === 'active' && (
//         <View style={styles.repaySection}>
//           <View style={styles.repayRow}>
//             <TextInput
//               style={styles.repayInput}
//               value={repayAmt}
//               onChangeText={v => { setRepayAmt(v); setRepayErr(''); }}
//               placeholder={`Max ₹${safeRem.toLocaleString('en-IN')}`}
//               placeholderTextColor={COLORS.text3}
//               keyboardType="decimal-pad"
//             />
//             <TouchableOpacity
//               style={[styles.repayBtn, { backgroundColor: accentColor, opacity: saving || !repayAmt ? 0.5 : 1 }]}
//               onPress={handleRepay}
//               disabled={saving || !repayAmt}
//             >
//               <Text style={styles.repayBtnText}>{saving ? '…' : 'Record'}</Text>
//             </TouchableOpacity>
//           </View>
//           {!!repayErr && <Text style={styles.repayErr}>{repayErr}</Text>}
//         </View>
//       )} */}
//       {/* No per-entry repayment — settle via the "Settle Up" button on the net bar */}

//       {/* Delete — only creator can delete, hidden during multi-select */}
//       {!isSelecting && item.can_delete !== false && (
//         <View style={{ alignItems: 'flex-end' }}>
//           <TouchableOpacity style={styles.delBtn} onPress={handleDelete} disabled={deleting}>
//             <Text style={styles.delText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </TouchableOpacity>
//   );
// }

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ 
  item, onRefresh, showToast, setAlert, 
  isSelecting, isSelected, onLongPress, onSelect 
}) {
  const [deleting, setDeleting] = useState(false);

  const isLent       = item.direction === 'lent';
  const isPending    = item.status === 'pending';
  const isRejected   = item.status === 'rejected';
  const isSettlement = item.direction === 'settlement';

  const accentColor = isSettlement ? COLORS.success 
                    : isPending ? COLORS.text3 
                    : isRejected ? COLORS.danger 
                    : isLent ? '#f59e0b' : '#818cf8';

  const safeAmt = Number(item.amount) || 0;
  const safeRem = Number(item.remaining_amount) || 0;
  const pct = safeAmt > 0 ? Math.round(((safeAmt - safeRem) / safeAmt) * 100) : 100;

  let dateStr = '—';
  if (item.entry_date) {
    const d = new Date(item.entry_date + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  const dirLabel  = isSettlement ? 'Settlement' : isLent ? 'Lent' : 'Borrowed';
  const dateLabel = isSettlement ? 'Settled on' : isLent ? 'Lent on' : 'Borrowed on';

  function handleDelete() {
    setAlert({
      title: 'Delete entry?',
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setAlert(null); setDeleting(true);
            try {
              await peopleApi.deleteEntry(item.entry_id);
              showToast?.('Deleted');
              onRefresh?.();
            } catch (err) {
              setDeleting(false);
              const detail = err?.response?.data?.detail;
              showToast?.(typeof detail === 'string' ? detail : 'Failed to delete', 'error');
            }
          },
        },
      ],
    });
  }

  return (
    <TouchableOpacity
      style={[
        styles.entryCard,
        isSelected && styles.entryCardSelected,
        isPending && styles.entryCardPending,
        isRejected && styles.entryCardRejected,
      ]}
      onLongPress={onLongPress}
      onPress={isSelecting ? onSelect : undefined}
      activeOpacity={isSelecting ? 0.7 : 1}
      delayLongPress={350}
    >
      {/* Selection indicator */}
      {isSelecting && (
        <View style={styles.selectionIndicator}>
          {isSelected
            ? <Icons.checkSquare size={20} color={COLORS.primary} />
            : <Icons.square size={20} color={COLORS.text3} />
          }
        </View>
      )}

      {/* Header row */}
      <View style={styles.entryHead}>
        <View style={[styles.dirBadge, { backgroundColor: accentColor + '18' }]}>
          {isSettlement ? <Icons.checkCircle size={14} color={accentColor} />
            : isLent ? <Icons.sendMoney size={14} color={accentColor} />
            : <Icons.receiveMoney size={14} color={accentColor} />
          }
          <Text style={[styles.dirText, { color: accentColor }]}>{dirLabel}</Text>
        </View>
        <Text style={[styles.entryAmt, { color: accentColor }]}>₹{fmt(item.amount)}</Text>
      </View>

      {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}

      {isPending && (
        <View style={styles.statusBanner}>
          <Icons.clockPending size={13} color={COLORS.warning} />
          <Text style={[styles.statusBannerText, { color: COLORS.warning }]}>
            Awaiting acknowledgement
          </Text>
        </View>
      )}
      {isRejected && (
        <View style={[styles.statusBanner, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: 'rgba(255,69,58,0.2)' }]}>
          <Icons.close size={13} color={COLORS.danger} />
          <Text style={[styles.statusBannerText, { color: COLORS.danger }]}>
            Declined — delete and re-request if needed
          </Text>
        </View>
      )}

      {/* Progress — hide for pending, rejected, and settlements */}
      {!isPending && !isRejected && !isSettlement && (
        <View>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>
              {item.status === 'repaid' ? 'Fully settled' : `${pct}% settled`}
            </Text>
            <Text style={[styles.progressRight, { color: item.status === 'repaid' ? COLORS.success : accentColor }]}>
              {item.status === 'repaid' ? 'Done' : `₹${safeRem.toLocaleString('en-IN')} left`}
            </Text>
          </View>
          <ProgressBar pct={pct} color={item.status === 'repaid' ? COLORS.success : accentColor} />
        </View>
      )}

      <Text style={styles.entryDate}>{dateLabel} {dateStr}</Text>

      {/* Delete — hidden during multi-select OR if it is a settlement record */}
      {!isSelecting && item.can_delete !== false && !isSettlement && (
        <View style={{ alignItems: 'flex-end' }}>
          <TouchableOpacity style={styles.delBtn} onPress={handleDelete} disabled={deleting}>
            <Text style={styles.delText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Add entry modal ───────────────────────────────────────────────────────────
function AddEntryModal({ visible, onClose, personName, onSuccess }) {
  const [direction, setDirection] = useState('lent');
  const [amount, setAmount]       = useState('');
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote]           = useState('');
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (visible) {
      setDirection('lent'); setAmount(''); setNote(''); setError('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [visible]);

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Enter a valid amount'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Use YYYY-MM-DD format'); return; }
    setSaving(true); setError('');
    setTimeout(async () => {
      try {
        await onSuccess?.({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date, sender_name: undefined });
        onClose();
      } catch (err) {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Failed to save');
      } finally {
        setSaving(false);
      }
    }, 250);
  }

  const isLent      = direction === 'lent';
  const accentColor = isLent ? '#f59e0b' : '#818cf8';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={entryModal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={entryModal.sheet}>
          <View style={entryModal.handle} />

          <View style={entryModal.header}>
            <View style={[entryModal.headerIcon, { backgroundColor: accentColor + '20' }]}>
              {isLent ? <Icons.sendMoney size={18} color={accentColor} /> : <Icons.receiveMoney size={18} color={accentColor} />}
            </View>
            <Text style={entryModal.title}>Add Entry — {personName}</Text>
            <TouchableOpacity style={entryModal.closeBtn} onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.close size={16} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={entryModal.scroll}>
            {!!error && (
              <View style={entryModal.errorBanner}>
                <Text style={entryModal.errorText}>{error}</Text>
              </View>
            )}

            {/* Direction toggle */}
            <View style={{ gap: SPACING.xs }}>
              <Text style={entryModal.label}>DIRECTION</Text>
              <View style={entryModal.toggleRow}>
                {[
                  { id: 'lent',     label: '↑ I Lent',     color: '#f59e0b' },
                  { id: 'borrowed', label: '↓ I Borrowed',  color: '#818cf8' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      entryModal.toggleBtn,
                      direction === opt.id && { backgroundColor: opt.color + '20', borderColor: opt.color },
                    ]}
                    onPress={() => setDirection(opt.id)}
                  >
                    <Text style={[
                      entryModal.toggleText,
                      direction === opt.id && { color: opt.color, fontWeight: FONT_WEIGHT.bold },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount */}
            <View style={{ gap: SPACING.xs }}>
              <Text style={entryModal.label}>AMOUNT</Text>
              <View style={entryModal.amountWrap}>
                <Text style={[entryModal.currencySymbol, { color: accentColor }]}>₹</Text>
                <TextInput
                  style={[entryModal.amountInput, { color: accentColor }]}
                  value={amount}
                  onChangeText={v => { setAmount(v); setError(''); }}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Date */}
            <View style={{ gap: SPACING.xs }}>
              <Text style={entryModal.label}>DATE</Text>
              <DatePickerInput value={date} onChange={v => { setDate(v); setError(''); }} accentColor={accentColor} />
            </View>

            {/* Note */}
            <View style={{ gap: SPACING.xs }}>
              <Text style={entryModal.label}>
                NOTE{'  '}<Text style={{ color: COLORS.text3, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>— optional</Text>
              </Text>
              <View style={[entryModal.inputRow, { alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[entryModal.inputText, { height: 64, textAlignVertical: 'top' }]}
                  value={note} onChangeText={setNote}
                  placeholder="Purpose, notes…" placeholderTextColor={COLORS.text3} multiline
                />
              </View>
            </View>
          </ScrollView>

          <View style={entryModal.footer}>
            <TouchableOpacity style={entryModal.cancelBtn} onPress={onClose}>
              <Text style={entryModal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[entryModal.submitBtn, { backgroundColor: accentColor }, (!amount || saving) && { opacity: 0.55 }]}
              onPress={handleSubmit}
              disabled={!amount || saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Icons.plus size={15} color="#fff" />
                  <Text style={entryModal.submitText}>Add Entry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PersonLedgerScreen({ navigation, route }) {
  const { personId, personName } = route.params;
  const { user } = useAuth();
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [settling, setSettling]     = useState(false);
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const [alert, setAlert]           = useState(null);
  const [selected, setSelected]     = useState(new Set());
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const isSelecting                 = selected.size > 0;

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await peopleApi.getEntries(personId);
      setEntries(res.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [personId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));


  function handleSettleUp() {
    setSettleDate(new Date().toISOString().split('T')[0]);
    setShowSettleModal(true);
  }

  async function confirmSettleUp() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settleDate)) {
      showToast('Use YYYY-MM-DD format for the date', 'error');
      return;
    }
    setShowSettleModal(false);
    setSettling(true);
    try {
      const res = await peopleApi.settleUp(personId, settleDate);
      if (res?.data?.pending_settlement) {
        showToast('Settle request sent — awaiting their confirmation', 'warning');
      } else {
        showToast('Settled up successfully');
      }
      load(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === 'string' ? detail : 'Failed to settle', 'error');
    } finally {
      setSettling(false);
    }
  }


  // Handle entry submission (called from modal with payload)
  async function handleAddEntry(payload) {
    await peopleApi.addEntry(personId, { ...payload, sender_name: user?.name });
    showToast('Entry added');
    load(true);
  }

  function toggleSelect(entryId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(entryId) ? next.delete(entryId) : next.add(entryId);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleBulkDelete() {
    setAlert({
      title: `Delete ${selected.size} entr${selected.size === 1 ? 'y' : 'ies'}?`,
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlert(null) },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setAlert(null);
            const ids = [...selected];
            clearSelection();
            await Promise.all(ids.map(id => peopleApi.deleteEntry(id)));
            showToast(`${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} deleted`);
            load(true);
          },
        },
      ],
    });
  }

  const visible = entries.filter(e =>
    filterStatus === 'all' ? true
    : filterStatus === 'active' ? e.status === 'active'
    : e.status === 'repaid'
  );

  const filterCounts = {
    all:     entries.length,
    active:  entries.filter(e => e.status === 'active').length,
    settled: entries.filter(e => e.status === 'repaid').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {isSelecting ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={clearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icons.close size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selected.size} selected</Text>
          <TouchableOpacity style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
            <Icons.trash size={15} color="#fff" />
            <Text style={styles.bulkDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScreenHeader
          title={personName}
          compact
          showBack
          onBack={() => navigation.goBack()}
          actions={
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <Icons.plus size={15} color="#fff" />
              <Text style={styles.addBtnText}>Add Entry</Text>
            </TouchableOpacity>
          }
        />
      )}

      <FlatList
        data={loading ? [] : visible}
        keyExtractor={item => String(item.entry_id)}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {entries.length > 0 && (
              <NetBar
                entries={entries}
                onSettleUp={handleSettleUp}
                settling={settling}
              />
            )}
            <View style={styles.filterTabs}>
              {[
                { id: 'all',     label: `All (${filterCounts.all})` },
                { id: 'active',  label: `Active (${filterCounts.active})` },
                { id: 'settled', label: `Settled (${filterCounts.settled})` },
              ].map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.filterTab, filterStatus === t.id && styles.filterTabActive]}
                  onPress={() => setFilterStatus(t.id)}
                >
                  <Text style={[styles.filterTabText, filterStatus === t.id && styles.filterTabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={() =>
          loading ? (
            <LoadingState label="Loading entries…" />
          ) : (
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}>
                <Icons.receipt size={36} color="#818cf8" />
              </View>
              <Text style={styles.emptyTitle}>
                {filterStatus === 'all' ? 'No entries yet' : `No ${filterStatus} entries`}
              </Text>
              {filterStatus === 'all' && (
                <>
                  <Text style={styles.emptySub}>
                    Record money you lent to or borrowed from {personName}.
                  </Text>
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#818cf8' }]}
                    onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                    <Icons.plus size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Add First Entry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <EntryCard
            item={item}
            onRefresh={() => load(true)}
            showToast={showToast}
            setAlert={setAlert}
            isSelecting={isSelecting}
            isSelected={selected.has(item.entry_id)}
            onLongPress={() => item.can_delete !== false && toggleSelect(item.entry_id)}
            onSelect={() => item.can_delete !== false && toggleSelect(item.entry_id)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + SPACING.base }]}
      />

      <AddEntryModal
        visible={showAdd}
        onClose={() => {
          Keyboard.dismiss();
          setTimeout(() => setShowAdd(false), Platform.OS === 'android' ? 300 : 150);
        }}
        personName={personName}
        onSuccess={async (payload) => {
          await handleAddEntry(payload);
        }}
      />
      <Modal visible={showSettleModal} animationType="fade" transparent onRequestClose={() => setShowSettleModal(false)}>
        <KeyboardAvoidingView style={settleModalStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSettleModal(false)} activeOpacity={1} />
          <View style={settleModalStyles.box}>
            <Text style={settleModalStyles.title}>Settle Up with {personName}</Text>
            <Text style={settleModalStyles.subtitle}>
              This marks all active entries as settled. The net amount changes to ₹0. This cannot be undone.
            </Text>
            <Text style={settleModalStyles.label}>SETTLEMENT DATE</Text>
            <DatePickerInput value={settleDate} onChange={setSettleDate} accentColor={COLORS.primary} />
            <View style={settleModalStyles.actions}>
              <TouchableOpacity style={settleModalStyles.cancelBtn} onPress={() => setShowSettleModal(false)}>
                <Text style={settleModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={settleModalStyles.confirmBtn} onPress={confirmSettleUp} disabled={settling}>
                <Text style={settleModalStyles.confirmText}>{settling ? 'Settling…' : 'Settle Up'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Toast config={toast} />
      <AppAlert config={alert} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.bg },
  list:  { padding: SPACING.base, gap: SPACING.md },
  listHeader: { gap: SPACING.base, marginBottom: SPACING.sm },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
  },
  addBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },

  netBar: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  netMain: { padding: SPACING.base, gap: 4 },
  netLabel: {
    fontSize: 9, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase',
  },
  netVal: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.extrabold },
  netSubs: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  netSubItem: { flex: 1, padding: SPACING.md, gap: 2 },
  netSubLabel: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  netSubVal: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  netNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  netNoticeText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    lineHeight: 16,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settleBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },

  filterTabs: {
    flexDirection: 'row', gap: 4,
    backgroundColor: COLORS.surface2, padding: 4,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  filterTab:         { paddingVertical: 5, paddingHorizontal: 14, borderRadius: RADIUS.sm },
  filterTabActive:   { backgroundColor: COLORS.surface },
  filterTabText:     { fontSize: FONT_SIZE.sm, color: COLORS.text2, fontWeight: FONT_WEIGHT.semibold },
  filterTabTextActive: { color: COLORS.text },

  entryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, gap: SPACING.md,
  },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dirBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  dirText:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.5 },
  entryAmt: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.extrabold },
  entryNote: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },
  entryDate: { fontSize: FONT_SIZE.sm, color: COLORS.text3 },

  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: FONT_SIZE.xs, color: COLORS.text3, fontWeight: FONT_WEIGHT.semibold },
  progressRight: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  progressWrap: { height: 5, borderRadius: 3, backgroundColor: COLORS.surface3, overflow: 'hidden' },
  progressBar:  { height: '100%', borderRadius: 3 },

  // repaySection: { gap: 5 },
  // repayRow:     { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  // repayInput: {
  //   flex: 1, paddingVertical: 7, paddingHorizontal: 10,
  //   borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  //   backgroundColor: COLORS.surface2, color: COLORS.text, fontSize: FONT_SIZE.sm,
  // },
  // repayBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: RADIUS.md },
  // repayBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  // repayErr: { fontSize: FONT_SIZE.xs, color: COLORS.danger },

  repaySection: { display: 'none' }, // kept for safety, repayment moved to Settle Up

  entryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },
  entryCardPending: {
    borderColor: 'rgba(245,158,11,0.4)',
    backgroundColor: 'rgba(245,158,11,0.04)',
  },
  entryCardRejected: {
    borderColor: 'rgba(255,69,58,0.3)',
    backgroundColor: 'rgba(255,69,58,0.04)',
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: SPACING.sm,
  },
  statusBannerText: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 16 },
  selectionIndicator: {
    position: 'absolute',
    top: SPACING.base,
    right: SPACING.base,
    zIndex: 1,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionCount: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  bulkDeleteText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },

  delBtn: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)',
    backgroundColor: 'rgba(255,69,58,0.05)',
  },
  delText: { fontSize: FONT_SIZE.xs, color: COLORS.danger, fontWeight: FONT_WEIGHT.semibold },

  emptyBox: {
    alignItems: 'center', paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, textAlign: 'center' },
  emptySub:   { fontSize: FONT_SIZE.base, color: COLORS.text2, textAlign: 'center', lineHeight: 21 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: 13, marginTop: SPACING.sm,
  },
  emptyBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const settleModalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: SPACING.base },
  box: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.base, gap: SPACING.sm,
  },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.text3, lineHeight: 18, marginBottom: 4 },
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase', marginTop: 4,
  },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border2, alignItems: 'center',
  },
  cancelText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2 },
  confirmBtn: {
    flex: 2, paddingVertical: 13, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  confirmText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});

const entryModal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.border, maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
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
  title: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: SPACING.base, gap: SPACING.md, paddingBottom: SPACING.lg },
  label: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text3, letterSpacing: 0.9, textTransform: 'uppercase',
  },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  toggleText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text2 },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
  },
  currencySymbol: { fontSize: FONT_SIZE.xl, marginRight: SPACING.sm },
  amountInput: { flex: 1, fontSize: 28, fontWeight: FONT_WEIGHT.extrabold, paddingVertical: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  inputText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, padding: 0 },
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
    justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: RADIUS.lg,
  },
  submitText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
});