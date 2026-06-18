// web/src/pages/People.jsx
import { useState, useEffect, useCallback } from "react";
import AppShell from "../components/AppShell";
import * as peopleApi from "../api/people";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().split("T")[0];

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f43f5e", "#14b8a6"];
function getAvatarBg(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}
function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

// ── Icons (Inline for drop-in ease) ───────────────────────────────────────────
const Icons = {
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  arrowUp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
  arrowDn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
  trash:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>,
  clock:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
};

// ── Components ────────────────────────────────────────────────────────────────
function ContactRow({ person, selected, onClick }) {
  const net = person.net_balance;
  const isOwed = net > 0;
  const isOwe = net < 0;

  return (
    <div
      onClick={onClick}
      className={`hover-bg ${selected ? "selected-contact" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
        cursor: "pointer", borderBottom: "1px solid var(--border)",
        background: selected ? "var(--surface2)" : "transparent",
        borderLeft: `4px solid ${selected ? "var(--primary)" : "transparent"}`,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%", background: getAvatarBg(person.display_name),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0
      }}>
        {getInitials(person.display_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {person.display_name}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: isOwed ? "#f59e0b" : isOwe ? "#818cf8" : "var(--text3)" }}>
          {isOwed ? `Owes you ₹${fmt(Math.abs(net))}` : isOwe ? `You owe ₹${fmt(Math.abs(net))}` : "Settled up"}
        </div>
      </div>
    </div>
  );
}

function LedgerRow({ entry, onDelete }) {
  const isLent = entry.direction === "lent";
  const isPending = entry.status === "pending";
  const isSettlement = entry.direction === "settlement";

  const color = isSettlement ? "var(--success)" : isPending ? "var(--text3)" : isLent ? "#f59e0b" : "#818cf8";
  const bg = isSettlement ? "rgba(16,185,129,0.15)" : isPending ? "var(--surface3)" : isLent ? "rgba(245,158,11,0.15)" : "rgba(129,140,248,0.15)";
  const icon = isSettlement ? Icons.check : isLent ? Icons.arrowUp : Icons.arrowDn;
  const title = isSettlement ? "Net Settlement" : isLent ? "You Lent" : "You Borrowed";

  const dateStr = entry.entry_date ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="hover-bg" style={{
      display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
      borderBottom: "1px solid var(--border)", opacity: isPending ? 0.6 : 1, transition: "background 0.15s ease"
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: bg, color: color,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</span>
          {isPending && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--warning)", background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 12 }}>
              {Icons.clock} Pending
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {dateStr} {entry.note ? ` • ${entry.note}` : ""}
        </div>
      </div>

      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: color, fontVariantNumeric: "tabular-nums" }}>
          ₹{fmt(entry.amount)}
        </div>
        {!isPending && !isSettlement && (
          <div style={{ fontSize: 12, fontWeight: 500, color: entry.status === "repaid" ? "var(--success)" : "var(--text3)" }}>
            {entry.status === "repaid" ? "Fully settled" : `₹${fmt(entry.remaining_amount)} left`}
          </div>
        )}
      </div>

      {entry.can_delete && !isSettlement && (
        <button onClick={onDelete} title="Delete entry" style={{
          background: "none", border: "none", padding: 8, cursor: "pointer",
          color: "var(--text3)", marginLeft: 8, borderRadius: 8, transition: "all 0.15s ease"
        }} onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
           onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.background = "none"; }}>
          {Icons.trash}
        </button>
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function AddPersonModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(v) {
    setName(v); setSelected(null); setError("");
    if (v.trim().length < 2) { setResults([]); return; }
    peopleApi.searchUsers(v.trim()).then(r => setResults(r.data || [])).catch(() => setResults([]));
  }

  async function handleSubmit() {
    if (!name.trim()) return; setSaving(true);
    try { await peopleApi.createPerson({ display_name: name.trim(), linked_user_id: selected?.user_id || null }); onSuccess(); onClose(); }
    catch (err) { setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to add person"); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title">Add Contact</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NAME OR EMAIL</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Search users or add custom name..." autoFocus />
          </div>

          {results.length > 0 && !selected && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {results.map(u => (
                <div key={u.user_id} className="hover-bg" onClick={() => { setName(u.name); setSelected(u); setResults([]); }}
                     style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
             <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", background: "rgba(16,185,129,0.1)", padding: "10px 14px", borderRadius: 8 }}>
               ✓ Linked to registered user
             </div>
          )}

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={!name.trim() || saving}>{saving ? "Saving…" : "Add Contact"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEntryModal({ personName, onClose, onSuccess }) {
  const [direction, setDirection] = useState("lent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(+amount) || +amount <= 0) { setError("Invalid amount"); return; }
    setSaving(true);
    try { await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date }); onClose(); }
    catch (err) { setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to save"); setSaving(false); }
  }

  const accent = direction === "lent" ? "#f59e0b" : "#818cf8";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <div className="modal-title">Add Entry with {personName}</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="split-toggle">
            <button className={`split-opt ${direction === "lent" ? "on" : ""}`} onClick={() => setDirection("lent")} type="button">↑ You Lent</button>
            <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`} onClick={() => setDirection("borrowed")} type="button">↓ You Borrowed</button>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">AMOUNT</label>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 12, paddingLeft: 16 }}>
              <span style={{ fontSize: 24, color: accent, fontWeight: 700 }}>₹</span>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00"
                style={{ border: "none", background: "transparent", fontSize: 28, fontWeight: 800, color: accent, padding: "12px 8px", width: "100%", outline: "none" }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">DATE</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">NOTE</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Dinner, movie tickets..." /></div>

          <button className="btn" style={{ background: accent, color: "#fff", fontWeight: 700, padding: 14, marginTop: 8, opacity: !amount || saving ? 0.6 : 1 }}
            onClick={handleSubmit} disabled={!amount || saving}>
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function People() {
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);

  const notify = (msg, isErr = false) => { setToast({ msg, isErr }); setTimeout(() => setToast(null), 3000); };

  const loadPeople = useCallback(async () => {
    setLoading(true); try { const r = await peopleApi.getPeople(); setPeople(r.data || []); } catch { notify("Failed to load contacts", true); } finally { setLoading(false); }
  }, []);

  const loadEntries = useCallback(async (id) => {
    setEntryLoading(true); try { const r = await peopleApi.getEntries(id); setEntries(r.data || []); } catch { notify("Failed to load ledger", true); } finally { setEntryLoading(false); }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { if (selected) loadEntries(selected); else setEntries([]); }, [selected, loadEntries]);

  async function handleDeletePerson(id, name) {
    if (!window.confirm(`Delete ${name} and all their entries?`)) return;
    try { await peopleApi.deletePerson(id); if (selected === id) setSelected(null); notify(`${name} deleted`); loadPeople(); } catch { notify("Failed to delete", true); }
  }

  async function handleDeleteEntry(id) {
    if (!window.confirm("Delete this entry?")) return;
    try { await peopleApi.deleteEntry(id); notify("Entry deleted"); loadEntries(selected); loadPeople(); } catch { notify("Failed to delete", true); }
  }

  async function handleAddEntry(payload) {
    await peopleApi.addEntry(selected, payload); notify("Entry added"); loadEntries(selected); loadPeople();
  }

  async function handleSettleUp() {
    if (!window.confirm("Record a settlement to bring this balance to ₹0?")) return;
    setSettling(true);
    try { await peopleApi.settleUp(selected); notify("Balance settled"); loadEntries(selected); loadPeople(); }
    catch { notify("Failed to settle", true); } finally { setSettling(false); }
  }

  const selectedPerson = people.find(p => p.person_id === selected);
  const net = selectedPerson?.net_balance ?? 0;
  const filtered = search.trim() ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase())) : people;
  const visibleEntries = entries.filter(e => filterStatus === "all" ? true : filterStatus === "active" ? e.status === "active" : e.status === "repaid");

  return (
    <>
      <style>{`
        .hover-bg:hover { background: var(--surface2) !important; }
        .filter-tab { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--text2); transition: all 0.2s; }
        .filter-tab:hover { color: var(--text); background: var(--surface2); }
        .filter-tab.active { background: var(--text); color: var(--bg); }
        /* Scrollbar hiding for clean look */
        .no-scroll::-webkit-scrollbar { display: none; }
        .no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: `1px solid ${toast.isErr ? "var(--danger)" : "var(--success)"}`, padding: "14px 20px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", color: "var(--text)", fontWeight: 600, fontSize: 14, animation: "fadeUp 0.2s ease-out" }}>
          {toast.isErr ? <span style={{color: "var(--danger)"}}>✕</span> : <span style={{color: "var(--success)"}}>✓</span>} {toast.msg}
        </div>
      )}

      <AppShell title="Ledger">
        <div style={{ display: "flex", height: "calc(100vh - 120px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>

          {/* ── Left Sidebar: Contacts ── */}
          <div style={{ width: 340, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
            <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Contacts</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddPerson(true)}>+ New</button>
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 14, outline: "none", color: "var(--text)" }} />
            </div>

            <div className="no-scroll" style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 24, color: "var(--text3)", textAlign: "center", fontSize: 14 }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>No contacts found.</div>
              ) : (
                filtered.map(p => <ContactRow key={p.person_id} person={p} selected={selected === p.person_id} onClick={() => setSelected(p.person_id)} />)
              )}
            </div>
          </div>

          {/* ── Right Content: Ledger Details ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
            {selected && selectedPerson ? (
              <>
                {/* Detail Header */}
                <div style={{ padding: "32px 40px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: getAvatarBg(selectedPerson.display_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>
                        {getInitials(selectedPerson.display_name)}
                      </div>
                      <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>{selectedPerson.display_name}</h1>
                        <div style={{ fontSize: 15, fontWeight: 600, color: net > 0 ? "#f59e0b" : net < 0 ? "#818cf8" : "var(--text3)" }}>
                          {net > 0 ? `Owes you ₹${fmt(Math.abs(net))}` : net < 0 ? `You owe ₹${fmt(Math.abs(net))}` : "All settled up"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        {net !== 0 && (
                          <button className="btn" style={{ background: net > 0 ? "rgba(245,158,11,0.1)" : "rgba(129,140,248,0.1)", color: net > 0 ? "#f59e0b" : "#818cf8", border: `1px solid ${net > 0 ? "rgba(245,158,11,0.2)" : "rgba(129,140,248,0.2)"}`, fontWeight: 700 }} onClick={handleSettleUp} disabled={settling}>
                            {settling ? "Settling…" : "Settle Up"}
                          </button>
                        )}
                        <button className="btn btn-primary" onClick={() => setShowAddEntry(true)}>+ Add Entry</button>
                      </div>
                      <button onClick={() => handleDeletePerson(selectedPerson.person_id, selectedPerson.display_name)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "underline", padding: 0 }} onMouseEnter={e=>e.currentTarget.style.color="var(--danger)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>
                        Delete contact
                      </button>
                    </div>

                  </div>
                </div>

                {/* Ledger Transactions */}
                <div className="no-scroll" style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                    {[{ id: "all", label: "All Transactions" }, { id: "active", label: "Active" }, { id: "repaid", label: "Settled" }].map(t => (
                      <button key={t.id} className={`filter-tab ${filterStatus === t.id ? "active" : ""}`} onClick={() => setFilterStatus(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {entryLoading ? (
                    <div style={{ color: "var(--text3)", textAlign: "center", padding: 40 }}>Loading entries...</div>
                  ) : visibleEntries.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text3)" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>No {filterStatus === "all" ? "" : filterStatus} entries found.</div>
                      <div style={{ fontSize: 14, marginTop: 4 }}>Add an entry to start tracking shared expenses.</div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      {visibleEntries.map(e => <LedgerRow key={e.entry_id} entry={e} onDelete={() => handleDeleteEntry(e.entry_id)} />)}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", flexDirection: "column", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👋</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>Select a contact to view their ledger</div>
              </div>
            )}
          </div>
        </div>

        {showAddPerson && <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={loadPeople} />}
        {showAddEntry && selected && <AddEntryModal personName={selectedPerson?.display_name || ""} onClose={() => setShowAddEntry(false)} onSuccess={handleAddEntry} />}
      </AppShell>
    </>
  );
}