// --- frontend/src/components/AddEntryModal.jsx ---
// FIXED:
//  1. navigate() called BEFORE close (was unmounting component first)
//  2. All API paths end with trailing slash to match FastAPI routes
//  3. Redirect types: navigate fires immediately in handleSubmit, no race
//  4. defaultTab prop — lets parent control which tab opens
//  5. Added "Borrow Money" type alongside "Lend Money"
//  6. Summary: 6 entry types now
//  7. ReceiptScanner integrated into Personal Expense tab

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import ReceiptScanner from "./ReceiptScanner";

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const STYLES = `
  .aem-fab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 16px; height: 34px; border-radius: 9px;
    background: var(--primary); color: #fff;
    font-size: 13px; font-weight: 700; font-family: inherit;
    border: none; cursor: pointer; letter-spacing: 0.01em;
    transition: background 0.12s, transform 0.1s;
  }
  .aem-fab:hover  { background: var(--primary-h); }
  .aem-fab:active { transform: scale(0.96); }

  .aem-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(3px);
    z-index: 900;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: aemFade 0.15s ease;
  }
  @keyframes aemFade  { from { opacity:0 } to { opacity:1 } }
  @keyframes aemSlide {
    from { opacity:0; transform:translateY(14px) scale(0.97) }
    to   { opacity:1; transform:translateY(0)    scale(1)    }
  }

  .aem-box {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 16px;
    width: 100%; max-width: 500px;
    max-height: 90vh; overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0,0,0,0.7);
    animation: aemSlide 0.18s ease;
  }

  .aem-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px 16px;
    border-bottom: 1px solid var(--border);
  }
  .aem-head-title { font-size: 16px; font-weight: 700; color: var(--text); }
  .aem-close {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text2); cursor: pointer; display: flex;
    align-items: center; justify-content: center; font-size: 14px;
    transition: background 0.1s;
  }
  .aem-close:hover { background: var(--surface3); color: var(--text); }

  /* 6-column type grid */
  .aem-type-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }
  .aem-type-pill {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 9px 4px 7px;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer;
    transition: all 0.13s; font-family: inherit;
  }
  .aem-type-pill:hover { background: var(--surface3); border-color: var(--border2); }
  .aem-type-pill.active {
    background: rgba(37,99,235,0.12);
    border-color: rgba(37,99,235,0.45);
  }
  .aem-type-icon {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  .aem-type-label {
    font-size: 9.5px; font-weight: 600; text-align: center;
    letter-spacing: 0.02em; color: var(--text2); line-height: 1.2;
  }
  .aem-type-pill.active .aem-type-label { color: var(--primary-h); }

  /* Form */
  .aem-body   { padding: 16px 20px; }
  .aem-field  { margin-bottom: 13px; }
  .aem-label  {
    display: block; font-size: 11px; font-weight: 700;
    color: var(--text3); letter-spacing: 0.06em;
    text-transform: uppercase; margin-bottom: 5px;
  }
  .aem-input {
    width: 100%; padding: 9px 12px;
    border-radius: 9px; border: 1px solid var(--border);
    background: var(--surface2); color: var(--text);
    font-size: 14px; font-family: inherit; outline: none;
    box-sizing: border-box; transition: border-color 0.14s;
  }
  .aem-input:focus      { border-color: var(--border2); }
  .aem-input::placeholder { color: var(--text3); }

  .aem-row              { display: flex; gap: 10px; }
  .aem-row .aem-field   { flex: 1; }

  .aem-err {
    padding: 9px 12px; border-radius: 8px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
    color: #f87171; font-size: 13px; margin-bottom: 13px;
  }

  /* Redirect notice */
  .aem-redirect {
    padding: 16px 20px 10px;
    font-size: 13.5px; color: var(--text2);
    line-height: 1.65; text-align: center;
  }
  .aem-redirect strong { color: var(--text); }

  .aem-footer {
    display: flex; gap: 8px; justify-content: flex-end;
    padding: 0 20px 20px;
  }
  .aem-btn {
    padding: 0 18px; height: 36px; border-radius: 9px;
    font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all 0.12s; border: none;
  }
  .aem-btn:active { transform: scale(0.96); }
  .aem-btn.cancel {
    background: var(--surface2); color: var(--text2);
    border: 1px solid var(--border);
  }
  .aem-btn.cancel:hover { background: var(--surface3); }
  .aem-btn.submit { background: var(--primary); color: #fff; }
  .aem-btn.submit:hover    { background: var(--primary-h); }
  .aem-btn.submit:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─────────────────────────────────────────────
//  Entry types
// ─────────────────────────────────────────────
import { Icons } from "../utils/Icons";

const TYPES = [
  {
    id: "personal",
    label: "Personal\nExpense",
    icon: Icons.personalExpense,
    iconBg: "rgba(239,68,68,0.15)",
  },
  {
    id: "income",
    label: "Income",
    icon: Icons.income,
    iconBg: "rgba(16,185,129,0.15)",
  },
  {
    id: "lend",
    label: "Lend\nMoney",
    icon: Icons.lendMoney,
    iconBg: "rgba(245,158,11,0.15)",
  },
  {
    id: "borrow",
    label: "Borrow\nMoney",
    icon: Icons.borrowMoney,
    iconBg: "rgba(99,102,241,0.15)",
  },
  {
    id: "group_exp",
    label: "Group\nExpense",
    icon: Icons.groupExpense,
    iconBg: "rgba(37,99,235,0.15)",
  },
  {
    id: "settlement",
    label: "Settlement",
    icon: Icons.settlement,
    iconBg: "rgba(16,185,129,0.15)",
  },
];

const SOURCE_LABELS = {
  salary: "Salary",
  pocket_money: "Pocket Money",
  stipend: "Stipend",
  other: "Other",
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────
//  Component
//  Props:
//    onSuccess   — called after successful save so parent can reload
//    defaultTab  — which tab to open (optional, defaults to "personal")
// ─────────────────────────────────────────────
export default function AddEntryModal({ onSuccess, defaultTab = "personal" }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState(defaultTab);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [groups, setGroups] = useState([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [sourceType, setSourceType] = useState("other");
  const [personName, setPersonName] = useState(""); // lender or borrower name
  const [groupId, setGroupId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [merchantName, setMerchantName] = useState("");

  // Load groups once when modal opens
  useEffect(() => {
    if (open && groups.length === 0) {
      api
        .get("/groups/")
        .then((r) => {
          setGroups(r.data || []);
          if (r.data?.length > 0) setGroupId(String(r.data[0].group_id));
        })
        .catch(() => {});
    }
  }, [open]);

  function reset() {
    setErr("");
    setAmount("");
    setCategory("General");
    setNote("");
    setDate(todayStr());
    setSourceType("other");
    setPersonName("");
    setGroupId("");
    setSubcategoryId(null);
    setMerchantName("");
  }

  function handleOpen() {
    reset();
    // Always open on whatever defaultTab the parent specifies
    setType(defaultTab);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  // ── Receipt Scanner result handler (Personal Expense only) ──────────────────
  // function handlePersonalScanResult(data) {
  //   setAmount(data.amount       ? String(data.amount) : amount);
  //   setNote(data.description                           || note);
  //   setDate(data.expense_date                          || date);
  //   setCategory(data.category_name                     || category);
  //   // If your backend returns category_id instead of category_name, swap the
  //   // line above for: setCategory(data.category_id || category);
  // }

  function handlePersonalScanResult(data) {
    setAmount(data.amount ? String(data.amount) : amount);
    setNote(data.description || note);
    setDate(data.expense_date || date);
    setCategory(data.category_name || category);
    setSubcategoryId(data.subcategory_id ?? null);
    setMerchantName(data.merchant_name || "");
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setErr("");
    const amt = parseFloat(amount);

    // ── Redirect types: navigate FIRST, then close ──
    // This is the critical fix — calling handleClose() before navigate()
    // was unmounting the component before navigation could fire.
    if (type === "group_exp") {
      const target = groupId ? `/groups/${groupId}/add-expense` : "/groups";
      navigate(target); // navigate first
      setOpen(false); // then close
      return;
    }
    if (type === "settlement") {
      const target = groupId ? `/groups/${groupId}/add-payment` : "/groups";
      navigate(target);
      setOpen(false);
      return;
    }

    // ── API types: validate then POST ──
    if (isNaN(amt) || amt <= 0) {
      setErr("Enter a valid positive amount.");
      return;
    }

    setSaving(true);
    try {
      if (type === "personal") {
        // Route: POST /personal-expenses/
        // FIX: trailing slash required for FastAPI redirect-free matching
        await api.post("/personal-expenses/", {
          amount: amt,
          category: category.trim() || "General",
          note: note.trim() || null,
          expense_date: date,
          subcategory_id: subcategoryId || null,
          merchant_name: merchantName.trim() || null,
        });
      } else if (type === "income") {
        // Route: POST /income/
        await api.post("/income/", {
          amount: amt,
          source_type: sourceType,
          note: note.trim() || null,
          income_date: date,
        });
      } else if (type === "lend") {
        // Route: POST /loans/
        if (!personName.trim()) {
          setErr("Enter the borrower's name.");
          setSaving(false);
          return;
        }
        await api.post("/loans/", {
          borrower_name: personName.trim(),
          amount: amt,
          note: note.trim() || null,
          loan_date: date,
        });
      } else if (type === "borrow") {
        // Route: POST /borrows/
        if (!personName.trim()) {
          setErr("Enter the lender's name.");
          setSaving(false);
          return;
        }
        await api.post("/borrows/", {
          lender_name: personName.trim(),
          amount: amt,
          note: note.trim() || null,
          borrow_date: date,
        });
      }

      setOpen(false);
      onSuccess?.();
    } catch (ex) {
      // Show specific backend error if available
      const detail = ex?.response?.data?.detail;
      setErr(
        typeof detail === "string"
          ? detail
          : "Something went wrong. Check the backend.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isRedirect = type === "group_exp" || type === "settlement";

  // ── Submit button label ──
  const submitLabel = saving
    ? "Saving…"
    : type === "group_exp"
      ? "Go to Form →"
      : type === "settlement"
        ? "Go to Form →"
        : type === "personal"
          ? "Add Expense"
          : type === "income"
            ? "Record Income"
            : type === "lend"
              ? "Record Loan"
              : type === "borrow"
                ? "Record Borrow"
                : "Save";

  return (
    <>
      <style>{STYLES}</style>

      {/* Trigger button */}
      <button className="aem-fab" onClick={handleOpen}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Entry
      </button>

      {/* Modal */}
      {open && (
        <div
          className="aem-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="aem-box">
            {/* Header */}
            <div className="aem-head">
              <span className="aem-head-title">Add Entry</span>
              <button className="aem-close" onClick={handleClose}>
                ✕
              </button>
            </div>

            {/* Type selector */}
            <div className="aem-type-grid">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`aem-type-pill ${type === t.id ? "active" : ""}`}
                  onClick={() => {
                    setType(t.id);
                    setErr("");
                  }}
                >
                  <div
                    className="aem-type-icon"
                    style={{ background: t.iconBg }}
                  >
                    {t.icon}
                  </div>
                  <span className="aem-type-label">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Redirect notice */}
            {isRedirect ? (
              <div className="aem-redirect">
                <strong>
                  {type === "group_exp" ? "Group Expense" : "Settlement"}
                </strong>{" "}
                uses the full {type === "group_exp" ? "expense" : "payment"}{" "}
                form.
                <br />
                Select a group to continue:
                <div style={{ marginTop: 12, marginBottom: 4 }}>
                  <select
                    className="aem-input"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    {groups.length === 0 ? (
                      <option value="">No groups available</option>
                    ) : (
                      groups.map((g) => (
                        <option key={g.group_id} value={g.group_id}>
                          {g.group_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            ) : (
              /* Direct form */
              <div className="aem-body">
                {err && <div className="aem-err">{err}</div>}

                {/* ── Receipt Scanner — Personal Expense only ── */}
                {type === "personal" && (
                  <div style={{ marginBottom: 12 }}>
                    <ReceiptScanner
                      onResult={handlePersonalScanResult}
                      compact
                    />
                  </div>
                )}

                {/* Amount + Date */}
                <div className="aem-row">
                  <div className="aem-field">
                    <label className="aem-label">Amount (₹)</label>
                    <input
                      className="aem-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="aem-field">
                    <label className="aem-label">Date</label>
                    <input
                      className="aem-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Personal: category */}
                {type === "personal" && (
                  <div className="aem-field">
                    <label className="aem-label">Category</label>
                    <input
                      className="aem-input"
                      type="text"
                      placeholder="Food, Transport, Shopping…"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                )}

                {/* Scan-filled metadata chips — shown only when populated by scanner */}
                {type === "personal" && (merchantName || subcategoryId) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 13,
                      flexWrap: "wrap",
                    }}
                  >
                    {merchantName && (
                      <span
                        style={{
                          fontSize: 11.5,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(99,102,241,0.1)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.2)",
                          fontWeight: 600,
                        }}
                      >
                        🏪 {merchantName}
                      </span>
                    )}
                    {subcategoryId && (
                      <span
                        style={{
                          fontSize: 11.5,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: "rgba(16,185,129,0.1)",
                          color: "#10b981",
                          border: "1px solid rgba(16,185,129,0.2)",
                          fontWeight: 600,
                        }}
                      >
                        # subcategory linked
                      </span>
                    )}
                  </div>
                )}

                {/* Income: source type */}
                {type === "income" && (
                  <div className="aem-field">
                    <label className="aem-label">Source</label>
                    <select
                      className="aem-input"
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                    >
                      {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lend: borrower name */}
                {type === "lend" && (
                  <div className="aem-field">
                    <label className="aem-label">Borrower Name</label>
                    <input
                      className="aem-input"
                      type="text"
                      placeholder="Who are you lending to?"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                    />
                  </div>
                )}

                {/* Borrow: lender name */}
                {type === "borrow" && (
                  <div className="aem-field">
                    <label className="aem-label">Lender Name</label>
                    <input
                      className="aem-input"
                      type="text"
                      placeholder="Who are you borrowing from?"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                    />
                  </div>
                )}

                {/* Note — all types */}
                <div className="aem-field">
                  <label className="aem-label">
                    Note{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        letterSpacing: 0,
                        color: "var(--text3)",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    className="aem-input"
                    type="text"
                    placeholder="What's this for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="aem-footer">
              <button className="aem-btn cancel" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="aem-btn submit"
                disabled={saving}
                onClick={handleSubmit}
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
