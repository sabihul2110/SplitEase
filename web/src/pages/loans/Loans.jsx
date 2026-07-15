// web/src/pages/loans/Loans.jsx


import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { getLoans, deleteLoan, repayLoan, getBorrows, deleteBorrow, repayBorrow } from "../../api/loans";
import * as peopleApi from "../../api/people";
import * as ledgerNotifsApi from "../../api/ledgerNotifications";
import AddEntryModal from "../../components/feature/AddEntryModal";
import { Icons } from "../../components/icons";
import Toast from "../../components/common/Toast";
import DateInput from "../../components/common/DateInput";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().split("T")[0];

const AVATAR_PALETTE = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#f43f5e","#14b8a6"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

// ── People Ledger tab ─────────────────────────────────────────────────────────
function PeopleLedger() {
  const [people, setPeople]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [settling, setSettling]     = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddEntry, setShowAddEntry]   = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast]           = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleDate, setSettleDate] = useState(todayStr());
  const navigate = useNavigate();

  const notify = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, rr] = await Promise.allSettled([peopleApi.getPeople(), peopleApi.getPendingRequests()]);
      setPeople(pr.status === "fulfilled" ? pr.value.data || [] : []);
      setPendingCount(rr.status === "fulfilled" ? (rr.value.data || []).length : 0);
    } catch { setPeople([]); }
    finally { setLoading(false); }
  }, []);

  const loadEntries = useCallback(async (id) => {
    setEntryLoading(true);
    try { const r = await peopleApi.getEntries(id); setEntries(r.data || []); }
    catch { setEntries([]); }
    finally { setEntryLoading(false); }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { if (selected) loadEntries(selected); else setEntries([]); }, [selected, loadEntries]);

  const selectedPerson = people.find(p => p.person_id === selected);
  const net = selectedPerson?.net_balance ?? 0;

  const filtered = search.trim()
    ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()))
    : people;

  const visibleEntries = entries.filter(e =>
    filterStatus === "all" ? true
    : filterStatus === "active" ? e.status === "active"
    : e.status === "repaid"
  );

  async function handleDeletePerson(id, name) {
    if (!window.confirm(`Delete ${name} and all their entries?`)) return;
    try { await peopleApi.deletePerson(id); if (selected === id) setSelected(null); notify(`${name} deleted`); loadPeople(); }
    catch { notify("Failed to delete", true); }
  }

  async function handleDeleteEntry(id) {
    if (!window.confirm("Delete this entry?")) return;
    try { await peopleApi.deleteEntry(id); notify("Entry deleted"); loadEntries(selected); loadPeople(); }
    catch (err) { notify(err.response?.data?.detail || "Failed to delete", true); }
  }

  async function handleAddEntry(payload) {
    await peopleApi.addEntry(selected, payload);
    notify("Entry added"); loadEntries(selected); loadPeople();
  }

  function handleSettleUp() {
    setSettleDate(todayStr());
    setShowSettleModal(true);
  }

  async function confirmSettleUp() {
    setShowSettleModal(false);
    setSettling(true);
    try {
      const res = await peopleApi.settleUp(selected, settleDate);
      if (res?.data?.pending_settlement) notify("Settle request sent — awaiting their confirmation");
      else notify("Balance settled");
      loadEntries(selected); loadPeople();
    } catch (err) { notify(err.response?.data?.detail || "Failed to settle", true); }
    finally { setSettling(false); }
  }

  const totalOwedToMe = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalIOwe     = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  return (
    <>
      <Toast toast={toast} />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0,
        border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
        minHeight: 560, height: "calc(100vh - 260px)", background: "var(--surface)" }}>

        {/* Left: contact list */}
        <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>

          {/* Summary */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            <div style={{ flex: 1, padding: "16px", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>Owed to You</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b",
                fontVariantNumeric: "tabular-nums" }}>₹{fmt(totalOwedToMe)}</div>
            </div>
            <div style={{ flex: 1, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>You Owe</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#818cf8",
                fontVariantNumeric: "tabular-nums" }}>₹{fmt(totalIOwe)}</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "12px", display: "flex", gap: 8,
            borderBottom: "1px solid var(--border)" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search people…"
              style={{ flex: 1, fontSize: 13, padding: "8px 12px",
                borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--surface2)", color: "var(--text)", outline: "none" }} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddPerson(true)}>+ Add</button>
          </div>

          {/* Pending requests banner */}
          {pendingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(245,158,11,0.08)",
              borderBottom: "1px solid rgba(245,158,11,0.2)", fontSize: 13,
              color: "var(--warning)", fontWeight: 600, cursor: "pointer" }}
              onClick={() => navigate("/people/pending")}>
              <Icons.clockPending size={14} />
              {pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting your review →
            </div>
          )}

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div className="loading" style={{ padding: 32 }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
                {search ? "No matches found." : "No people yet. Add someone to start tracking."}
              </div>
            ) : filtered.map(p => {
              const pnet = p.net_balance;
              const isOwed = pnet > 0, isOwe = pnet < 0;
              const netColor = isOwed ? "#f59e0b" : isOwe ? "#818cf8" : "var(--text3)";
              const isSelected = selected === p.person_id;
              return (
                <div key={p.person_id} onClick={() => setSelected(p.person_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${isSelected ? "var(--primary)" : "transparent"}`,
                    background: isSelected ? "var(--surface2)" : "transparent",
                    transition: "all 0.1s",
                  }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%",
                    background: avatarBg(p.display_name), display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {initials(p.display_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.display_name}
                    </div>
                    <div style={{ fontSize: 12, color: netColor, fontWeight: 600, marginTop: 2 }}>
                      {isOwed ? `Owes you ₹${fmt(Math.abs(pnet))}`
                        : isOwe ? `You owe ₹${fmt(Math.abs(pnet))}`
                        : "Settled up"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: entries */}
        {selected && selectedPerson ? (
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)" }}>

            {/* Person header */}
            <div style={{ padding: "24px 32px", background: "var(--surface)",
              borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%",
                    background: avatarBg(selectedPerson.display_name),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 700, color: "#fff" }}>
                    {initials(selectedPerson.display_name)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px",
                      letterSpacing: "-0.02em", color: "var(--text)" }}>
                      {selectedPerson.display_name}
                    </h2>
                    <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                      color: net > 0 ? "#f59e0b" : net < 0 ? "#818cf8" : "var(--success)" }}>
                      {net > 0 ? `Owes you ₹${fmt(Math.abs(net))}`
                        : net < 0 ? `You owe ₹${fmt(Math.abs(net))}`
                        : <>All settled up <Icons.check size={13} /></>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button className="btn btn-ghost btn-sm"
                    style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                    onClick={() => handleDeletePerson(selectedPerson.person_id, selectedPerson.display_name)}>
                    Delete Contact
                  </button>
                  {net !== 0 && (
                    <button className="btn btn-sm" disabled={settling}
                      style={{
                        background: net > 0 ? "rgba(245,158,11,0.1)" : "rgba(129,140,248,0.1)",
                        color: net > 0 ? "#f59e0b" : "#818cf8",
                        border: `1px solid ${net > 0 ? "rgba(245,158,11,0.3)" : "rgba(129,140,248,0.3)"}`,
                        fontWeight: 700,
                      }}
                      onClick={handleSettleUp}>
                      {settling ? "Settling…" : `Settle Up ₹${fmt(Math.abs(net))}`}
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddEntry(true)}>
                    + Add Entry
                  </button>
                </div>
              </div>

              {/* Mini stats */}
              <div style={{ display: "flex", gap: 24, marginTop: 16,
                paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>You Lent</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b",
                    fontVariantNumeric: "tabular-nums" }}>
                    ₹{fmt(entries.filter(e => e.direction === "lent").reduce((s, e) => s + e.amount, 0))}
                  </div>
                </div>
                <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>You Borrowed</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8",
                    fontVariantNumeric: "tabular-nums" }}>
                    ₹{fmt(entries.filter(e => e.direction === "borrowed").reduce((s, e) => s + e.amount, 0))}
                  </div>
                </div>
                <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>Entries</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    {entries.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter tabs + entries */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 20,
                background: "var(--surface)", padding: 4, borderRadius: 8,
                border: "1px solid var(--border)", width: "fit-content" }}>
                {[
                  { id: "all",    label: `All (${entries.length})` },
                  { id: "active", label: `Active (${entries.filter(e => e.status === "active").length})` },
                  { id: "repaid", label: `Settled (${entries.filter(e => e.status === "repaid").length})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setFilterStatus(t.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", border: "none", fontFamily: "inherit",
                      background: filterStatus === t.id ? "var(--primary)" : "transparent",
                      color: filterStatus === t.id ? "#fff" : "var(--text2)",
                      transition: "all 0.12s",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {entryLoading ? (
                <div className="loading"><div className="spinner" />Loading entries…</div>
              ) : visibleEntries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ display: "flex", justifyContent: "center", opacity: 0.35 }}>
                    <Icons.document size={36} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)" }}>
                    No {filterStatus !== "all" ? filterStatus : ""} entries yet
                  </div>
                  {filterStatus === "all" && (
                    <div style={{ fontSize: 14, color: "var(--text3)", marginTop: 4 }}>
                      Add an entry to start tracking with {selectedPerson.display_name}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0,
                  border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
                  background: "var(--surface)" }}>
                  {visibleEntries.map((e, idx) => {
                    const isLent = e.direction === "lent";
                    const isSettlement = e.direction === "settlement";
                    const isPending = e.status === "pending";
                    const color = isSettlement ? "var(--success)"
                      : isPending ? "var(--text3)"
                      : isLent ? "#f59e0b" : "#818cf8";
                    const dateStr = e.entry_date
                      ? new Date(e.entry_date + "T00:00:00").toLocaleDateString("en-IN",
                          { day: "numeric", month: "short", year: "numeric" })
                      : "—";
                    const pct = e.amount > 0
                      ? Math.round(((e.amount - e.remaining_amount) / e.amount) * 100)
                      : 100;

                    return (
                      <div key={e.entry_id} style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "16px 20px",
                        borderBottom: idx < visibleEntries.length - 1 ? "1px solid var(--border)" : "none",
                        opacity: isPending ? 0.7 : 1,
                      }}>
                        {/* Direction icon */}
                        <div style={{ width: 36, height: 36, borderRadius: 9,
                          background: color + "18", display: "flex", alignItems: "center",
                          justifyContent: "center", flexShrink: 0, color }}>
                          {isSettlement ? <Icons.check size={15} /> : isLent ? <Icons.arrowUp size={15} /> : <Icons.arrowDown size={15} />}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                              {isSettlement ? "Net Settlement"
                                : isLent ? "You lent" : "You borrowed"}
                            </span>
                            {isPending && (
                              <span style={{ fontSize: 10, fontWeight: 700,
                                background: "rgba(245,158,11,0.12)", color: "var(--warning)",
                                padding: "2px 7px", borderRadius: 20 }}>PENDING</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>
                            {dateStr}{e.note ? ` · ${e.note}` : ""}
                          </div>
                          {!isPending && !isSettlement && e.status === "active" && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ height: 3, borderRadius: 2,
                                background: "var(--surface3)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 2,
                                  width: `${pct}%`, background: color,
                                  transition: "width 0.3s ease" }} />
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                                {pct}% settled · ₹{fmt(e.remaining_amount)} remaining
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Amount + delete */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color,
                            fontVariantNumeric: "tabular-nums" }}>
                            ₹{fmt(e.amount)}
                          </div>
                          {e.status === "repaid" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--success)", fontWeight: 600, marginTop: 2 }}>
                              Settled <Icons.check size={10} />
                            </div>
                          )}
                        </div>
                        {e.can_delete && !isSettlement && (
                          <button onClick={() => handleDeleteEntry(e.entry_id)}
                            className="btn btn-ghost btn-xs"
                            style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)",
                              flexShrink: 0 }}>
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12, color: "var(--text3)", background: "var(--bg)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16,
              background: "var(--surface2)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.profile size={26} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Select a person to view their ledger</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddPerson(true)}>
              + Add First Person
            </button>
          </div>
        )}
      </div>

      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <div className="modal-title">Settle Up with {selectedPerson?.display_name}</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowSettleModal(false)}><Icons.close size={13} /></button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5, margin: 0 }}>
                This marks all active entries as settled. The net amount changes to ₹0. This cannot be undone.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SETTLEMENT DATE</label>
                <DateInput value={settleDate} onChange={setSettleDate} maxDate={new Date()} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSettleModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirmSettleUp} disabled={settling}>
                  {settling ? "Settling…" : "Settle Up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddPerson && <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={loadPeople} />}
      {showAddEntry && selected && (
        <AddEntryModal2
          personName={selectedPerson?.display_name || ""}
          onClose={() => setShowAddEntry(false)}
          onSuccess={handleAddEntry}
        />
      )}
    </>
  );
}

// ── Add Person modal ──────────────────────────────────────────────────────────
function AddPersonModal({ onClose, onSuccess }) {
  const [name, setName]         = useState("");
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  function handleChange(v) {
    setName(v); setSelected(null); setError("");
    if (v.trim().length < 2) { setResults([]); return; }
    peopleApi.searchUsers(v.trim())
      .then(r => setResults(r.data || []))
      .catch(() => setResults([]));
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await peopleApi.createPerson({ display_name: name.trim(), linked_user_id: selected?.user_id || null });
      onSuccess(); onClose();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to add");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title">Add Person</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}><Icons.close size={13} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NAME OR EMAIL</label>
            <input value={name} onChange={e => handleChange(e.target.value)}
              placeholder="Search or enter a name…" autoFocus />
          </div>
          {results.length > 0 && !selected && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
                textTransform: "uppercase", color: "var(--text3)",
                padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
                Registered Users
              </div>
              {results.map(u => (
                <div key={u.user_id}
                  onClick={() => { setName(u.name); setSelected(u); setResults([]); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    cursor: "pointer", borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%",
                    background: "var(--primary)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--success)",
              background: "rgba(16,185,129,0.08)", padding: "10px 14px", borderRadius: 8 }}>
              <Icons.check size={12} /> Linked to registered user — entries will need acceptance
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }}
              onClick={submit} disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Add Person"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Entry modal (for People tab) ─────────────────────────────────────────
function AddEntryModal2({ personName, onClose, onSuccess }) {
  const [direction, setDirection] = useState("lent");
  const [amount, setAmount]       = useState("");
  const [date, setDate]           = useState(todayStr());
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!amount || +amount <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed");
      setSaving(false);
    }
  }

  const accent = direction === "lent" ? "#f59e0b" : "#818cf8";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title">Add Entry — {personName}</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}><Icons.close size={13} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="split-toggle">
            <button className={`split-opt ${direction === "lent" ? "on" : ""}`}
              onClick={() => setDirection("lent")} type="button" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icons.arrowUp size={13} /> You Lent
            </button>
            <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`}
              onClick={() => setDirection("borrowed")} type="button" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icons.arrowDown size={13} /> You Borrowed
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">AMOUNT</label>
            <div style={{ display: "flex", alignItems: "center",
              background: "var(--surface2)", border: "1px solid var(--border2)",
              borderRadius: 8, paddingLeft: 12 }}>
              <span style={{ fontSize: 22, color: accent, fontWeight: 700 }}>₹</span>
              <input value={amount} onChange={e => setAmount(e.target.value)}
                type="number" step="0.01" placeholder="0.00"
                style={{ border: "none", background: "transparent", fontSize: 24,
                  fontWeight: 800, color: accent, padding: "10px 8px", outline: "none" }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">DATE</label>
            <DateInput value={date} onChange={setDate} maxDate={new Date()} accentColor={accent} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NOTE — optional</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Purpose…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn" style={{ flex: 2, background: accent, color: "#fff",
              fontWeight: 700, opacity: !amount || saving ? 0.5 : 1 }}
              onClick={submit} disabled={!amount || saving}>
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LoanCard (Normal Loans tab) ───────────────────────────────────────────────
function LoanCard({ item, onRefresh, idx, accentColor, btnColor, btnHover, isLent }) {
  const [repayAmt, setRepayAmt] = useState("");
  const [repayDate, setRepayDate] = useState(todayStr());
  const [repayErr, setRepayErr] = useState("");
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pct = item.amount > 0
    ? Math.round(((item.amount - item.remaining_amount) / item.amount) * 100)
    : 100;
  const personLabel = isLent ? item.borrower_name : item.lender_name;
  const dateField   = isLent ? item.loan_date : item.borrow_date;
  const idField     = isLent ? item.loan_id : item.borrow_id;

  async function handleRepay() {
    setRepayErr("");
    const amt = parseFloat(repayAmt);
    if (isNaN(amt) || amt <= 0) { setRepayErr("Enter a valid amount."); return; }
    if (amt > item.remaining_amount) { setRepayErr(`Max ₹${fmt(item.remaining_amount)}`); return; }
    setSaving(true);
    try {
      await (isLent
        ? repayLoan(idField, { repayment_amount: amt, repayment_date: repayDate })
        : repayBorrow(idField, { repayment_amount: amt, repayment_date: repayDate }));
      setRepayAmt(""); setRepayDate(todayStr()); onRefresh();
    } catch (ex) { setRepayErr(ex?.response?.data?.detail || "Failed."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this record?")) return;
    setDeleting(true);
    try { await (isLent ? deleteLoan(idField) : deleteBorrow(idField)); onRefresh(); }
    catch { setDeleting(false); }
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column",
      gap: 12, transition: "border-color 0.15s, box-shadow 0.15s",
      borderLeft: `3px solid ${item.status === "repaid" ? "var(--success)" : accentColor}` }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            {isLent ? "Lent to" : "Borrowed from"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{personLabel}</div>
          <div style={{ marginTop: 6 }}>
            <span className={`badge ${item.status === "active" ? "badge-amber" : "badge-success"}`}>
              {item.status === "active" ? "Active" : "Settled"}
            </span>
            {item.status === "pending" && (
              <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Pending</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            {isLent ? "Amount Lent" : "Amount Borrowed"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: accentColor,
            fontVariantNumeric: "tabular-nums" }}>
            ₹{fmt(item.amount)}
          </div>
        </div>
      </div>

      {item.note && (
        <div style={{ fontSize: 13, color: "var(--text3)" }}>{item.note}</div>
      )}

      {item.status !== "pending" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>
              {item.status === "repaid" ? "Fully settled" : `${pct}% recovered`}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: item.status === "repaid" ? "var(--success)" : accentColor }}>
              {item.status === "repaid" ? "Done" : `₹${fmt(item.remaining_amount)} left`}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "var(--surface3)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`,
              background: item.status === "repaid" ? "var(--success)" : accentColor,
              transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--text3)" }}>
        {isLent ? "Lent" : "Borrowed"} on{" "}
        {dateField ? new Date(dateField + "T00:00:00").toLocaleDateString("en-IN",
          { day: "numeric", month: "short", year: "numeric" }) : "—"}
      </div>

      {item.status === "active" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <DateInput value={repayDate} onChange={setRepayDate} maxDate={new Date()} accentColor={btnColor} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" min="0" step="0.01"
              placeholder={`Amount (max ₹${fmt(item.remaining_amount)})`}
              value={repayAmt}
              onChange={e => { setRepayAmt(e.target.value); setRepayErr(""); }}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 7,
                border: "1px solid var(--border)", background: "var(--surface2)",
                color: "var(--text)", fontSize: 13, outline: "none" }} />
            <button onClick={handleRepay} disabled={saving || !repayAmt}
              style={{ padding: "7px 14px", borderRadius: 7, border: "none",
                background: btnColor, color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", opacity: saving || !repayAmt ? 0.5 : 1,
                transition: "background 0.12s", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = btnHover}
              onMouseLeave={e => e.currentTarget.style.background = btnColor}>
              {saving ? "…" : isLent ? "Record" : "Repay"}
            </button>
          </div>
          {repayErr && <div style={{ fontSize: 12, color: "var(--danger)" }}>{repayErr}</div>}
        </div>
      )}

      {isLent && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleDelete} disabled={deleting}
            className="btn btn-ghost btn-xs"
            style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.25)" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Loans page ───────────────────────────────────────────────────────────
export default function Loans() {
  const [loans, setLoans]       = useState([]);
  const [borrows, setBorrows]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pageTab, setPageTab]   = useState("people");   // people | lent | borrowed
  const [filterTab, setFilterTab] = useState("all");
  const [ledgerDot, setLedgerDot] = useState(false);

  const fetchLedgerBadge = useCallback(async () => {
    try {
      const { data } = await ledgerNotifsApi.getLedgerUnread();
      setLedgerDot((data?.count || 0) > 0);
    } catch { setLedgerDot(false); }
  }, []);

  useEffect(() => {
    fetchLedgerBadge();
    window.__refreshLedgerBadge = fetchLedgerBadge;
    const id = setInterval(fetchLedgerBadge, 15000);
    return () => { clearInterval(id); if (window.__refreshLedgerBadge === fetchLedgerBadge) window.__refreshLedgerBadge = null; };
  }, [fetchLedgerBadge]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lR, bR] = await Promise.all([getLoans(), getBorrows()]);
      setLoans(lR.data || []);
      setBorrows(bR.data || []);
    } catch { setLoans([]); setBorrows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items   = pageTab === "lent" ? loans : borrows;
  const visible = items.filter(i =>
    filterTab === "all" ? true
    : filterTab === "active" ? (i.status === "active" || i.status === "pending")
    : i.status === "repaid"
  );

  const totalLent        = loans.reduce((s, l) => s + l.amount, 0);
  const outstandingLent  = loans.filter(l => l.status === "active").reduce((s, l) => s + l.remaining_amount, 0);
  const totalBorrowed    = borrows.reduce((s, b) => s + b.amount, 0);
  const outstandingBorrow = borrows.filter(b => b.status === "active").reduce((s, b) => s + b.remaining_amount, 0);

  const summaryCards = pageTab === "lent" ? [
    { label: "Total Lent",  value: totalLent, color: "#f59e0b",
      sub: `${loans.length} loan${loans.length !== 1 ? "s" : ""}` },
    { label: "Outstanding", value: outstandingLent, color: "var(--danger)",
      sub: `${loans.filter(l => l.status === "active").length} active` },
    { label: "Recovered",   value: totalLent - loans.reduce((s, l) => s + l.remaining_amount, 0),
      color: "var(--success)", sub: `${loans.filter(l => l.status === "repaid").length} fully repaid` },
  ] : [
    { label: "Total Borrowed",  value: totalBorrowed, color: "#818cf8",
      sub: `${borrows.length} borrow${borrows.length !== 1 ? "s" : ""}` },
    { label: "Still to Repay",  value: outstandingBorrow, color: "var(--danger)",
      sub: `${borrows.filter(b => b.status === "active").length} active` },
    { label: "Already Repaid",  value: totalBorrowed - borrows.reduce((s, b) => s + b.remaining_amount, 0),
      color: "var(--success)", sub: `${borrows.filter(b => b.status === "repaid").length} fully repaid` },
  ];

  const { setPageActions } = useOutletContext();
  useEffect(() => {
    setPageActions(pageTab !== "people"
      ? <AddEntryModal onSuccess={load} defaultTab={pageTab === "lent" ? "lend" : "borrow"} />
      : null);
    return () => setPageActions(null);
  }, [pageTab]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em",
          color: "var(--text)", margin: 0 }}>Loans & Ledger</h1>
        <p style={{ fontSize: 14, color: "var(--text3)", marginTop: 4 }}>
          Track money between people, with full net settlement support
        </p>
      </div>

      {/* Page tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)",
        marginBottom: 24 }}>
        {[
          { id: "people",   label: "People Ledger" },
          { id: "lent",     label: "Money Lent" },
          { id: "borrowed", label: "Money Borrowed" },
        ].map(t => (
          <button key={t.id} onClick={() => { setPageTab(t.id); setFilterTab("all"); }}
            style={{
              padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              cursor: "pointer", border: "none", background: "transparent",
              color: pageTab === t.id ? "var(--text)" : "var(--text2)",
              borderBottom: `2px solid ${pageTab === t.id ? "var(--primary-h)" : "transparent"}`,
              marginBottom: -2, transition: "all 0.14s",
              position: "relative",
            }}>
            {t.label}
            {t.id === "people" && ledgerDot && (
              <span style={{
                position: "absolute", top: 6, right: 4,
                width: 7, height: 7, borderRadius: 4,
                background: "var(--danger)", border: "2px solid var(--bg)",
              }} />
            )}
          </button>
        ))}
      </div>

      {/* People Ledger tab */}
      {pageTab === "people" && <PeopleLedger />}

      {/* Lent / Borrowed tabs */}
      {pageTab !== "people" && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {summaryCards.map(c => (
              <div key={c.label} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
                  {c.label}
                </div>
                {loading
                  ? <div style={{ height: 24, background: "var(--surface3)",
                      borderRadius: 4, marginBottom: 6 }} />
                  : <div style={{ fontSize: 22, fontWeight: 800, color: c.color,
                      fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>
                      ₹{fmt(c.value)}
                    </div>}
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display: "flex", gap: 4, background: "var(--surface2)", padding: 4,
            borderRadius: 8, border: "1px solid var(--border)",
            marginBottom: 20, width: "fit-content" }}>
            {[
              { id: "all",    label: `All (${items.length})` },
              { id: "active", label: `Active (${items.filter(i => i.status === "active" || i.status === "pending").length})` },
              { id: "repaid", label: `Settled (${items.filter(i => i.status === "repaid").length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setFilterTab(t.id)}
                style={{ padding: "5px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", border: "none", fontFamily: "inherit",
                  background: filterTab === t.id ? "var(--surface)" : "transparent",
                  color: filterTab === t.id ? "var(--text)" : "var(--text2)",
                  boxShadow: filterTab === t.id ? "0 1px 4px rgba(0,0,0,0.25)" : "none",
                  transition: "all 0.12s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="loading"><div className="spinner" />Loading…</div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
                  <div className="empty-icon" style={{ display: "flex", justifyContent: "center", opacity: 0.35 }}>
                    <Icons.history size={36} />
                  </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)" }}>
                {filterTab === "all"
                  ? `No ${pageTab === "lent" ? "loans" : "borrows"} yet`
                  : `No ${filterTab} entries`}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {visible.map((item, i) => (
                <LoanCard key={pageTab === "lent" ? item.loan_id : item.borrow_id}
                  item={item} idx={i} onRefresh={load}
                  isLent={pageTab === "lent"}
                  accentColor={pageTab === "lent" ? "#f59e0b" : "#818cf8"}
                  btnColor={pageTab === "lent" ? "#10b981" : "#6366f1"}
                  btnHover={pageTab === "lent" ? "#0d9e6e" : "#4f46e5"} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}