// --- frontend/src/pages/Loans.jsx ---
// UPDATED: Two sections — "Money I Lent" and "Money I Borrowed"
// Each with their own summary, filter tabs, and card grid.

import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import AddEntryModal from "../components/AddEntryModal";
import { Icons } from "../utils/Icons";

const STYLES = `
  @keyframes ldPulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes ldFadeUp {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .ld-page-tabs {
    display: flex; gap: 0;
    border-bottom: 2px solid var(--border);
    margin-bottom: 28px;
  }
  .ld-page-tab {
    padding: 10px 22px; font-size: 14px; font-weight: 600;
    font-family: inherit; cursor: pointer; border: none;
    background: transparent; color: var(--text2);
    border-bottom: 2px solid transparent; margin-bottom: -2px;
    transition: all 0.14s;
  }
  .ld-page-tab:hover { color: var(--text); }
  .ld-page-tab.active { color: var(--text); border-bottom-color: var(--primary-h); }

  .ld-summary {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 14px; margin-bottom: 22px;
  }
  .ld-sum-card {
    border-radius: 12px; border: 1px solid var(--border);
    background: var(--surface); padding: 16px 18px 14px;
    animation: ldFadeUp 0.25s ease both;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ld-sum-card:hover { border-color: var(--border2); box-shadow: 0 4px 18px rgba(0,0,0,0.2); }
  .ld-sum-label { font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text3); margin-bottom: 9px; }
  .ld-sum-val   { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-bottom: 4px; }
  .ld-sum-sub   { font-size: 12px; color: var(--text3); }

  .ld-filter-tabs {
    display: flex; gap: 4px;
    background: var(--surface2); padding: 4px;
    border-radius: 10px; border: 1px solid var(--border);
    margin-bottom: 18px; width: fit-content;
  }
  .ld-ftab {
    padding: 5px 16px; border-radius: 7px;
    font-size: 12.5px; font-weight: 600; font-family: inherit;
    cursor: pointer; border: none; background: transparent;
    color: var(--text2); transition: all 0.13s;
  }
  .ld-ftab:hover  { color: var(--text); }
  .ld-ftab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.3); }

  .ld-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .ld-card {
    border-radius: 14px; border: 1px solid var(--border);
    background: var(--surface); padding: 20px;
    display: flex; flex-direction: column; gap: 13px;
    animation: ldFadeUp 0.22s ease both;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .ld-card:hover { border-color: var(--border2); box-shadow: 0 5px 24px rgba(0,0,0,0.22); }
  .ld-card.repaid { opacity: 0.6; }

  .ld-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 8px; border-radius: 20px;
  }
  .ld-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
  .ld-badge.active { background: rgba(245,158,11,0.12); color: #f59e0b; }
  .ld-badge.active .ld-badge-dot { background: #f59e0b; }
  .ld-badge.repaid { background: rgba(16,185,129,0.10); color: #10b981; }
  .ld-badge.repaid .ld-badge-dot { background: #10b981; }

  /* Borrow card has different accent */
  .ld-card.borrow-card { border-color: rgba(99,102,241,0.15); }
  .ld-card.borrow-card:hover { border-color: rgba(99,102,241,0.4); }

  .ld-progress-wrap { width: 100%; height: 5px; border-radius: 3px; background: var(--surface3); overflow: hidden; }
  .ld-progress-bar  { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

  .ld-repay-row { display: flex; gap: 8px; align-items: center; }
  .ld-repay-input {
    flex: 1; padding: 7px 10px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text); font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.13s;
  }
  .ld-repay-input:focus { border-color: var(--border2); }
  .ld-repay-input::placeholder { color: var(--text3); }
  .ld-repay-btn {
    padding: 7px 14px; border-radius: 8px;
    color: #fff; border: none;
    font-size: 12px; font-weight: 700; font-family: inherit;
    cursor: pointer; transition: background 0.12s; white-space: nowrap;
  }
  .ld-repay-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ld-err { font-size: 12px; color: #f87171; margin-top: -6px; }

  .ld-del {
    padding: 5px 8px; border-radius: 7px;
    background: none; border: 1px solid var(--border);
    color: var(--text3); cursor: pointer; font-size: 11px;
    font-family: inherit; transition: all 0.12s;
  }
  .ld-del:hover { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.25); }

  .ld-empty { text-align: center; padding: 52px 24px; color: var(--text3); }
  .ld-empty-icon { font-size: 38px; margin-bottom: 12px; opacity: 0.35; }

  .ld-skel { animation: ldPulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }
`;

// ─────────────────────────────────────────────
//  LoanCard — for loans given
// ─────────────────────────────────────────────
function LoanCard({ item, onRefresh, idx, accentColor = "#f59e0b", btnColor = "#10b981", btnHover = "#0d9e6e", isLent = true }) {
  const [repayAmt, setRepayAmt] = useState("");
  const [repayErr, setRepayErr] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pct = item.amount > 0
    ? Math.round(((item.amount - item.remaining_amount) / item.amount) * 100)
    : 100;

  const personLabel  = isLent ? item.borrower_name : item.lender_name;
  const dateField    = isLent ? item.loan_date      : item.borrow_date;
  const idField      = isLent ? item.loan_id        : item.borrow_id;
  const repayEndpt   = isLent ? `/loans/${idField}/repay/`   : `/borrows/${idField}/repay/`;
  const deleteEndpt  = isLent ? `/loans/${idField}/`          : `/borrows/${idField}/`;
  const directionLbl = isLent ? "Lent to"       : "Borrowed from";
  const dateLbl      = isLent ? "Lent on"       : "Borrowed on";
  const remainLabel  = isLent ? "Remaining to receive" : "Remaining to repay";

  async function handleRepay() {
    setRepayErr("");
    const amt = parseFloat(repayAmt);
    if (isNaN(amt) || amt <= 0) { setRepayErr("Enter a valid amount."); return; }
    if (amt > item.remaining_amount) {
      setRepayErr(`Max is ₹${item.remaining_amount.toLocaleString("en-IN")}`);
      return;
    }
    setSaving(true);
    try {
      await api.post(repayEndpt, {
        [isLent ? "repayment_amount" : "repayment_amount"]: amt,
      });
      setRepayAmt("");
      onRefresh();
    } catch (ex) {
      setRepayErr(ex?.response?.data?.detail || "Failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this record?`)) return;
    setDeleting(true);
    try { await api.delete(deleteEndpt); onRefresh(); }
    catch { setDeleting(false); }
  }

  return (
    <div className={`ld-card ${item.status} ${!isLent ? "borrow-card" : ""}`}
         style={{ animationDelay: `${idx * 0.04}s` }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 3 }}>{directionLbl}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
            {personLabel}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className={`ld-badge ${item.status}`}>
              <span className="ld-badge-dot" />
              {item.status === "active" ? "Active" : "Settled"}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>
            {isLent ? "Amount Lent" : "Amount Borrowed"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
            ₹{item.amount.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {item.note && (
        <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: -5 }}>{item.note}</div>
      )}

      {/* Progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>
            {item.status === "repaid" ? "Fully settled" : `${pct}% recovered`}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: item.status === "repaid" ? "var(--success)" : accentColor }}>
            {item.status === "repaid"
              ? "Done"
              : `₹${item.remaining_amount.toLocaleString("en-IN")} left`}
          </span>
        </div>
        <div className="ld-progress-wrap">
          <div className="ld-progress-bar" style={{
            width: `${pct}%`,
            background: item.status === "repaid" ? "#10b981" : accentColor,
          }} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--text3)" }}>
        {dateLbl}{" "}
        {dateField
          ? new Date(dateField + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : "—"}
      </div>

      {/* Repay form */}
      {item.status === "active" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div className="ld-repay-row">
            <input
              className="ld-repay-input"
              type="number" min="0" step="0.01"
              placeholder={`Amount (max ₹${item.remaining_amount.toLocaleString("en-IN")})`}
              value={repayAmt}
              onChange={e => { setRepayAmt(e.target.value); setRepayErr(""); }}
            />
            <button
              className="ld-repay-btn"
              style={{ background: btnColor }}
              onMouseEnter={e => e.currentTarget.style.background = btnHover}
              onMouseLeave={e => e.currentTarget.style.background = btnColor}
              disabled={saving || !repayAmt}
              onClick={handleRepay}
            >
              {saving ? "…" : isLent ? "Record" : "Repay"}
            </button>
          </div>
          {repayErr && <div className="ld-err">{repayErr}</div>}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="ld-del" disabled={deleting} onClick={handleDelete}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Loans page
// ─────────────────────────────────────────────
export default function Loans() {
  const [loans,    setLoans]    = useState([]);
  const [borrows,  setBorrows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pageTab,  setPageTab]  = useState("lent");   // lent | borrowed
  const [filterTab, setFilterTab] = useState("all"); // all | active | repaid

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lR, bR] = await Promise.all([
        api.get("/loans/"),
        api.get("/borrows/"),
      ]);
      setLoans(lR.data || []);
      setBorrows(bR.data || []);
    } catch {
      setLoans([]); setBorrows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = pageTab === "lent" ? loans : borrows;

  const visible = items.filter(i =>
    filterTab === "all"    ? true
    : filterTab === "active" ? i.status === "active"
    : i.status === "repaid"
  );

  // Summary numbers
  const totalLent        = loans.reduce((s, l) => s + l.amount, 0);
  const outstandingLent  = loans.filter(l => l.status === "active").reduce((s, l) => s + l.remaining_amount, 0);
  const totalBorrowed    = borrows.reduce((s, b) => s + b.amount, 0);
  const outstandingBorrow = borrows.filter(b => b.status === "active").reduce((s, b) => s + b.remaining_amount, 0);

  const lentSummary = [
    { label: "Total Lent",    value: totalLent,       color: "#f59e0b", sub: `${loans.length} loan${loans.length !== 1 ? "s" : ""}` },
    { label: "Outstanding",   value: outstandingLent, color: "var(--danger)", sub: `${loans.filter(l=>l.status==="active").length} active` },
    { label: "Recovered",     value: totalLent - loans.reduce((s,l) => s + l.remaining_amount, 0), color: "var(--success)", sub: `${loans.filter(l=>l.status==="repaid").length} fully repaid` },
  ];

  const borrowSummary = [
    { label: "Total Borrowed",  value: totalBorrowed,       color: "#818cf8", sub: `${borrows.length} borrow${borrows.length !== 1 ? "s" : ""}` },
    { label: "Still to Repay",  value: outstandingBorrow,   color: "var(--danger)", sub: `${borrows.filter(b=>b.status==="active").length} active` },
    { label: "Already Repaid",  value: totalBorrowed - borrows.reduce((s,b) => s + b.remaining_amount, 0), color: "var(--success)", sub: `${borrows.filter(b=>b.status==="repaid").length} fully repaid` },
  ];

  const summaryCards = pageTab === "lent" ? lentSummary : borrowSummary;

  // Add Entry modal opens on "lend" or "borrow" tab based on which page tab is active
  const modalTab = pageTab === "lent" ? "lend" : "borrow";
  const actions  = <AddEntryModal onSuccess={load} defaultTab={modalTab} />;

  return (
    <>
      <style>{STYLES}</style>

      <AppShell title="Loans" actions={actions}>

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 4 }}>
            Loans
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)" }}>
            Track money you've lent and borrowed
          </p>
        </div>

        {/* Page-level tabs: Money I Lent / Money I Borrowed */}
        <div className="ld-page-tabs">
          <button
            className={`ld-page-tab ${pageTab === "lent" ? "active" : ""}`}
            onClick={() => { setPageTab("lent"); setFilterTab("all"); }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {Icons.moneyLent} Money Lent
            </span>
          </button>
          <button
            className={`ld-page-tab ${pageTab === "borrowed" ? "active" : ""}`}
            onClick={() => { setPageTab("borrowed"); setFilterTab("all"); }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {Icons.moneyBorrowed} Money Borrowed
            </span>
          </button>
        </div>

        {/* Summary row */}
        <div className="ld-summary">
          {summaryCards.map((c, i) => (
            <div key={c.label} className="ld-sum-card" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="ld-sum-label">{c.label}</div>
              {loading
                ? <span className="ld-skel" style={{ width: "55%", height: 22, marginBottom: 7 }} />
                : <div className="ld-sum-val" style={{ color: c.color }}>
                    ₹{c.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>}
              <div className="ld-sum-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="ld-filter-tabs">
          {[
            { id: "all",    label: `All (${items.length})` },
            { id: "active", label: `Active (${items.filter(i=>i.status==="active").length})` },
            { id: "repaid", label: `Settled (${items.filter(i=>i.status==="repaid").length})` },
          ].map(t => (
            <button key={t.id} className={`ld-ftab ${filterTab === t.id ? "active" : ""}`}
                    onClick={() => setFilterTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="ld-grid">
            {[0,1,2].map(i => (
              <div key={i} className="ld-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="ld-skel" style={{ width: 110, height: 18, marginBottom: 10 }} />
                  <span className="ld-skel" style={{ width: 70, height: 22 }} />
                </div>
                <span className="ld-skel" style={{ width: "100%", height: 5, borderRadius: 3 }} />
                <span className="ld-skel" style={{ width: "40%", height: 10 }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="ld-empty">
            <div className="ld-empty-icon">{pageTab === "lent" ? "🤝" : "🏦"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)", marginBottom: 5 }}>
              {filterTab === "all"
                ? `No ${pageTab === "lent" ? "loans" : "borrows"} yet`
                : `No ${filterTab} ${pageTab === "lent" ? "loans" : "borrows"}`}
            </div>
            <div style={{ fontSize: 13 }}>
              {filterTab === "all"
                ? `Use "+ Add Entry" → "${pageTab === "lent" ? "Lend Money" : "Borrow Money"}" to record one.`
                : ""}
            </div>
          </div>
        ) : (
          <div className="ld-grid">
            {visible.map((item, i) => (
              <LoanCard
                key={pageTab === "lent" ? item.loan_id : item.borrow_id}
                item={item}
                idx={i}
                onRefresh={load}
                isLent={pageTab === "lent"}
                accentColor={pageTab === "lent" ? "#f59e0b" : "#818cf8"}
                btnColor={pageTab === "lent" ? "#10b981" : "#6366f1"}
                btnHover={pageTab === "lent" ? "#0d9e6e" : "#4f46e5"}
              />
            ))}
          </div>
        )}

      </AppShell>
    </>
  );
}