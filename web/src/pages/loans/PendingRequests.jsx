// web/src/pages/loans/PendingRequests.jsx

// Received/Sent tabs × Entries/Confirmations sub-tabs.


import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as peopleApi from "../../api/people";
import * as ledgerNotifsApi from "../../api/ledgerNotifications";
import { Icons } from "../../components/icons";
import Toast from "../../components/common/Toast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Received entry card ────────────────────────────────────────────────────
function RequestCard({ item, onAccept, onReject }) {
  const [processing, setProcessing] = useState(null);
  const isLent = item.direction === "lent";
  const accentColor = isLent ? "#f59e0b" : "#818cf8";

  async function run(action, fn) {
    setProcessing(action);
    try { await fn(); } catch { /* parent shows toast */ } finally { setProcessing(null); }
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
          borderRadius: 20, background: accentColor + "18", color: accentColor, fontSize: 12, fontWeight: 700 }}>
          {isLent ? <Icons.sendMoney size={13} /> : <Icons.receiveMoney size={13} />}
          {isLent ? "They lent you" : "They borrowed"}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
          ₹{fmt(item.amount)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text2)" }}>
        <Icons.profile size={14} color="var(--text3)" />
        Requested by <strong style={{ color: "var(--text)" }}>{item.requested_by}</strong>
      </div>
      {item.note && <div style={{ fontSize: 13, color: "var(--text3)" }}>{item.note}</div>}
      <div style={{ fontSize: 12, color: "var(--text3)" }}>On {fmtDate(item.entry_date)}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1, color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
          disabled={processing !== null} onClick={() => run("reject", onReject)}>
          {processing === "reject" ? "…" : "Decline"}
        </button>
        <button className="btn" style={{ flex: 2, background: "var(--success)", color: "#fff", fontWeight: 700 }}
          disabled={processing !== null} onClick={() => run("accept", onAccept)}>
          {processing === "accept" ? "…" : "Accept"}
        </button>
      </div>
    </div>
  );
}

// ── Sent entry card (outgoing, awaiting acceptance) ────────────────────────
function SentRequestCard({ item, onCancel }) {
  const isLent = item.direction === "lent";
  const accentColor = isLent ? "#f59e0b" : "#818cf8";
  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, borderColor: accentColor + "30" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
          borderRadius: 20, background: accentColor + "18", color: accentColor, fontSize: 12, fontWeight: 700 }}>
          {isLent ? <Icons.sendMoney size={13} /> : <Icons.receiveMoney size={13} />}
          {isLent ? "You lent" : "You borrowed"}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
          ₹{fmt(item.amount)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text2)" }}>
        <Icons.profile size={14} color="var(--text3)" />
        Sent to <strong style={{ color: "var(--text)" }}>{item.sent_to || item.person_name}</strong>
      </div>
      {item.note && <div style={{ fontSize: 13, color: "var(--text3)" }}>{item.note}</div>}
      <div style={{ fontSize: 12, color: "var(--text3)" }}>On {fmtDate(item.entry_date)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8,
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
        fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>
        <Icons.clockPending size={13} />
        Awaiting their acceptance
      </div>
      <button className="btn btn-ghost" style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }} onClick={onCancel}>
        Cancel & Delete
      </button>
    </div>
  );
}

// ── Confirmation card — covers both repayments and settlements ────────────
function ConfirmationCard({ item, direction, onAccept, onReject, onCancel }) {
  const [processing, setProcessing] = useState(null);
  const isSettlement = item.kind === "settlement";
  const accentColor = isSettlement ? "var(--success)" : (item.direction === "lent" ? "#f59e0b" : "#818cf8");

  async function run(action, fn) {
    setProcessing(action);
    try { await fn(); } catch { /* parent shows toast */ } finally { setProcessing(null); }
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10,
      borderColor: direction === "sent" ? accentColor + "30" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
          borderRadius: 20, background: accentColor + "18", color: accentColor, fontSize: 12, fontWeight: 700 }}>
          <Icons.checkCircle size={13} />
          {isSettlement ? "Settle up" : "Repayment"}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
          ₹{fmt(item.amount)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text2)" }}>
        <Icons.profile size={14} color="var(--text3)" />
        {direction === "received"
          ? <>Proposed by <strong style={{ color: "var(--text)" }}>{item.requested_by}</strong></>
          : <>Sent to <strong style={{ color: "var(--text)" }}>{item.sent_to || item.person_name}</strong></>}
      </div>
      {!isSettlement && item.entry_date && (
        <div style={{ fontSize: 12, color: "var(--text3)" }}>Against entry from {fmtDate(item.entry_date)}</div>
      )}
      {direction === "received" ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1, color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
            disabled={processing !== null} onClick={() => run("reject", onReject)}>
            {processing === "reject" ? "…" : "Decline"}
          </button>
          <button className="btn" style={{ flex: 2, background: "var(--success)", color: "#fff", fontWeight: 700 }}
            disabled={processing !== null} onClick={() => run("accept", onAccept)}>
            {processing === "accept" ? "…" : "Confirm"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>
            <Icons.clockPending size={13} />
            Awaiting their confirmation
          </div>
          <button className="btn btn-ghost" style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
            disabled={processing !== null} onClick={() => run("cancel", onCancel)}>
            {processing === "cancel" ? "…" : "Cancel"}
          </button>
        </>
      )}
    </div>
  );
}

export default function PendingRequests() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("received");       // 'received' | 'sent'
  const [subTab, setSubTab] = useState("entries");   // 'entries' | 'confirmations'

  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [receivedConfirms, setReceivedConfirms] = useState([]);
  const [sentConfirms, setSentConfirms] = useState([]);

  const [loading, setLoading] = useState(true);
  const { toast, notify } = useToast(3000);
  const { confirm, dialogProps } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, sentRes, recRepay, sentRepay, recSettle, sentSettle] = await Promise.allSettled([
        peopleApi.getPendingRequests(),
        peopleApi.getSentRequests(),
        peopleApi.getPendingRepayments(),
        peopleApi.getSentRepayments(),
        peopleApi.getPendingSettlements(),
        peopleApi.getSentSettlements(),
      ]);
      setReceived(recRes.status === "fulfilled" ? (recRes.value.data || []) : []);
      setSent(sentRes.status === "fulfilled" ? (sentRes.value.data || []) : []);

      const repayIn   = recRepay.status  === "fulfilled" ? (recRepay.value.data  || []) : [];
      const settleIn  = recSettle.status === "fulfilled" ? (recSettle.value.data || []) : [];
      const repayOut  = sentRepay.status  === "fulfilled" ? (sentRepay.value.data  || []) : [];
      const settleOut = sentSettle.status === "fulfilled" ? (sentSettle.value.data || []) : [];

      setReceivedConfirms([
        ...repayIn.map(r => ({ ...r, kind: "repayment", id: r.repayment_id })),
        ...settleIn.map(r => ({ ...r, kind: "settlement", id: r.request_id, amount: r.net_amount })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      setSentConfirms([
        ...repayOut.map(r => ({ ...r, kind: "repayment", id: r.repayment_id })),
        ...settleOut.map(r => ({ ...r, kind: "settlement", id: r.request_id, amount: r.net_amount })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      setReceived([]); setSent([]); setReceivedConfirms([]); setSentConfirms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Badges are now driven by real pending status (see
  // people_repository.fetch_pending_action_counts), not by
  // Ledger_Notifications.is_read, so there is nothing to mark read here
  // just from viewing a sub-tab — the dot only clears once the item is
  // actually accepted, rejected, confirmed, declined, or cancelled below.

  async function handleAccept(entryId) {
    try {
      await peopleApi.acceptEntry(entryId);
      setReceived(prev => prev.filter(r => r.entry_id !== entryId));
      notify("Entry accepted");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to accept", true);
    }
  }

  async function handleReject(entryId) {
    const ok = await confirm({ title: "Decline this request?", danger: true, confirmLabel: "Decline" });
    if (!ok) return;
    try {
      await peopleApi.rejectEntry(entryId);
      setReceived(prev => prev.filter(r => r.entry_id !== entryId));
      notify("Request declined");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to decline", true);
    }
  }

  async function handleCancelSent(entryId) {
    const ok = await confirm({ title: "Cancel this request?", message: "It will be deleted and they won't be notified.", danger: true, confirmLabel: "Cancel Request" });
    if (!ok) return;
    try {
      await peopleApi.deleteEntry(entryId);
      setSent(prev => prev.filter(r => r.entry_id !== entryId));
      notify("Request cancelled");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to cancel", true);
    }
  }

  async function handleConfirmAccept(item) {
    try {
      if (item.kind === "repayment") await peopleApi.acceptRepayment(item.id);
      else await peopleApi.acceptSettlement(item.id);
      setReceivedConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      notify(item.kind === "repayment" ? "Repayment confirmed" : "Settlement confirmed");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to confirm", true);
      throw err;
    }
  }

  async function handleConfirmReject(item) {
    try {
      if (item.kind === "repayment") await peopleApi.rejectRepayment(item.id);
      else await peopleApi.rejectSettlement(item.id);
      setReceivedConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      notify(item.kind === "repayment" ? "Repayment declined" : "Settlement declined");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to decline", true);
      throw err;
    }
  }

  async function handleConfirmCancel(item) {
    try {
      if (item.kind === "repayment") await peopleApi.cancelRepayment(item.id);
      else await peopleApi.cancelSettlement(item.id);
      setSentConfirms(prev => prev.filter(r => !(r.id === item.id && r.kind === item.kind)));
      notify("Request cancelled");
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to cancel", true);
      throw err;
    }
  }

  const entryData   = tab === "received" ? received : sent;
  const confirmData = tab === "received" ? receivedConfirms : sentConfirms;
  const displayData = subTab === "entries" ? entryData : confirmData;

  return (
    <>
      <Toast toast={toast} />

      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/loans")} style={{ marginBottom: 12 }}>
          ← Back to Loans
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", margin: 0 }}>
          Pending Requests
        </h1>
        <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 4 }}>
          Ledger entries, repayments, and settle-ups awaiting action
        </p>
      </div>

      {/* Received / Sent */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 16 }}>
        {[
          { id: "received", label: `Received ${received.length + receivedConfirms.length > 0 ? `(${received.length + receivedConfirms.length})` : ""}` },
          { id: "sent",     label: `Sent ${sent.length + sentConfirms.length > 0 ? `(${sent.length + sentConfirms.length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              cursor: "pointer", border: "none", background: "transparent",
              color: tab === t.id ? "var(--text)" : "var(--text2)",
              borderBottom: `2px solid ${tab === t.id ? "var(--primary-h)" : "transparent"}`,
              marginBottom: -2, transition: "all 0.14s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Entries / Confirmations */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface2)", padding: 4, borderRadius: 8,
        border: "1px solid var(--border)", marginBottom: 20, width: "fit-content" }}>
        {[
          { id: "entries",       label: `Entries ${entryData.length > 0 ? `(${entryData.length})` : ""}` },
          { id: "confirmations", label: `Repayments ${confirmData.length > 0 ? `(${confirmData.length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "none", fontFamily: "inherit",
              background: subTab === t.id ? "var(--surface)" : "transparent",
              color: subTab === t.id ? "var(--text)" : "var(--text2)",
              boxShadow: subTab === t.id ? "0 1px 4px rgba(0,0,0,0.25)" : "none",
              transition: "all 0.12s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading…</div>
      ) : displayData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ display: "flex", justifyContent: "center", opacity: 0.35 }}>
            <Icons.check size={36} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)" }}>
            {subTab === "entries"
              ? (tab === "received" ? "No incoming requests" : "No outgoing requests")
              : (tab === "received" ? "Nothing awaiting confirmation" : "No pending confirmations sent")}
          </div>
          <div style={{ fontSize: 14, color: "var(--text3)", marginTop: 4 }}>
            {subTab === "entries"
              ? (tab === "received"
                  ? "When someone sends you a ledger entry, it will appear here."
                  : "Entries you send to registered users that are awaiting acceptance will appear here.")
              : (tab === "received"
                  ? "Repayments or settle-ups others propose against your shared ledger will appear here."
                  : "Repayments or settle-ups you propose that need their confirmation will appear here.")}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {displayData.map(item => (
            subTab === "entries" ? (
              tab === "received" ? (
                <RequestCard
                  key={item.entry_id}
                  item={item}
                  onAccept={() => handleAccept(item.entry_id)}
                  onReject={() => handleReject(item.entry_id)}
                />
              ) : (
                <SentRequestCard
                  key={item.entry_id}
                  item={item}
                  onCancel={() => handleCancelSent(item.entry_id)}
                />
              )
            ) : (
              <ConfirmationCard
                key={`${item.kind}-${item.id}`}
                item={item}
                direction={tab}
                onAccept={() => handleConfirmAccept(item)}
                onReject={() => handleConfirmReject(item)}
                onCancel={() => handleConfirmCancel(item)}
              />
            )
          ))}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </>
  );
}