// web/src/pages/People.jsx
import { useState, useEffect, useCallback } from "react";
import AppShell from "../components/AppShell";
import * as peopleApi from "../api/people";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Person list ──────────────────────────────────────────────────────────────
function PersonRow({ person, selected, onClick, onDelete }) {
  const net      = person.net_balance;
  const netColor = net > 0 ? "var(--warning)" : net < 0 ? "#818cf8" : "var(--text3)";
  const netLabel = net > 0
    ? `Owes you ₹${fmt(Math.abs(net))}`
    : net < 0
    ? `You owe ₹${fmt(Math.abs(net))}`
    : "Settled";

  const initials = person.display_name
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
  const COLORS   = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2"];
  let hash = 0;
  for (const c of person.display_name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  const avatarBg = COLORS[Math.abs(hash) % COLORS.length];

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer", borderRadius: 10,
        background: selected ? "rgba(37,99,235,0.08)" : "transparent",
        border: `1px solid ${selected ? "rgba(37,99,235,0.3)" : "transparent"}`,
        transition: "all 0.12s",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: avatarBg, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, fontWeight: 700,
        color: "#fff", flexShrink: 0,
      }}>{initials || "?"}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {person.display_name}
        </div>
        <div style={{ fontSize: 12, color: netColor, fontWeight: 600, marginTop: 2 }}>
          {netLabel}
        </div>
        {person.active_entries > 0 && (
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
            {person.active_entries} active {person.active_entries === 1 ? "entry" : "entries"}
          </div>
        )}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="btn btn-ghost btn-xs"
        style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.25)" }}
      >
        Delete
      </button>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }) {
  const isLent     = entry.direction === "lent";
  const isPending  = entry.status === "pending";
  const isSettlement = entry.direction === "settlement";
  const accentColor = isSettlement ? "var(--success)"
    : isPending ? "var(--text3)"
    : isLent ? "#f59e0b" : "#818cf8";

  const pct = entry.amount > 0
    ? Math.round(((entry.amount - entry.remaining_amount) / entry.amount) * 100)
    : 100;

  const dateStr = entry.entry_date
    ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  const dirLabel = isSettlement ? "Settlement"
    : isLent ? "Lent" : "Borrowed";

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${
        isPending ? "rgba(245,158,11,0.3)"
        : isSettlement ? "rgba(16,185,129,0.3)"
        : "var(--border)"}`,
      borderRadius: 12, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: accentColor + "18", borderRadius: 20,
          padding: "3px 10px", fontSize: 11, fontWeight: 700,
          color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em",
        }}>{dirLabel}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: accentColor,
          fontVariantNumeric: "tabular-nums" }}>
          ₹{fmt(entry.amount)}
        </div>
      </div>

      {entry.note && (
        <div style={{ fontSize: 12, color: "var(--text3)" }}>{entry.note}</div>
      )}

      {isPending && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 12,
          color: "var(--warning)", background: "rgba(245,158,11,0.08)",
          borderRadius: 7, padding: "6px 10px",
          border: "1px solid rgba(245,158,11,0.2)",
        }}>
          ⏳ Awaiting acknowledgement
        </div>
      )}

      {!isPending && !isSettlement && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>
              {entry.status === "repaid" ? "Fully settled" : `${pct}% settled`}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: entry.status === "repaid"
              ? "var(--success)" : accentColor }}>
              {entry.status === "repaid" ? "Done" : `₹${fmt(entry.remaining_amount)} left`}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--surface3)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`,
              background: entry.status === "repaid" ? "var(--success)" : accentColor,
              transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          {isLent ? "Lent" : isSettlement ? "Settled" : "Borrowed"} on {dateStr}
        </div>
        {entry.can_delete && !isSettlement && (
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-xs"
            style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.25)" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Person modal ──────────────────────────────────────────────────────────
function AddPersonModal({ onClose, onSuccess }) {
  const [name, setName]           = useState("");
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const timerRef                  = useState(null);

  function handleNameChange(v) {
    setName(v); setSelected(null); setError("");
    clearTimeout(timerRef[0]);
    if (v.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    timerRef[0] = setTimeout(async () => {
      try {
        const r = await peopleApi.searchUsers(v.trim());
        setResults(r.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      await peopleApi.createPerson({
        display_name: name.trim(),
        linked_user_id: selected?.user_id || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to add person");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title">Add Person</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NAME OR EMAIL</label>
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Search by name or add custom…"
              autoFocus
            />
          </div>

          {results.length > 0 && !selected && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
                textTransform: "uppercase", color: "var(--text3)",
                padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>
                Registered Users
              </div>
              {results.map(u => (
                <div key={u.user_id}
                  onClick={() => { setName(u.name); setSelected(u); setResults([]); }}
                  style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%",
                    background: "var(--primary)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              color: "var(--success)", background: "rgba(16,185,129,0.08)",
              borderRadius: 7, padding: "8px 12px", border: "1px solid rgba(16,185,129,0.2)" }}>
              ✓ Linked to registered user — entries will require acknowledgement
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary" style={{ flex: 2 }}
              onClick={handleSubmit} disabled={!name.trim() || saving}
            >
              {saving ? "Saving…" : "Add Person"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Entry modal ───────────────────────────────────────────────────────────
function AddEntryModal({ personName, onClose, onSuccess }) {
  const [direction, setDirection] = useState("lent");
  const [amount, setAmount]       = useState("");
  const [date, setDate]           = useState(todayStr());
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(+amount) || +amount <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date });
      onClose();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to save");
      setSaving(false);
    }
  }

  const accent = direction === "lent" ? "#f59e0b" : "#818cf8";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title">Add Entry — {personName}</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">DIRECTION</label>
            <div className="split-toggle">
              <button className={`split-opt ${direction === "lent" ? "on" : ""}`}
                onClick={() => setDirection("lent")} type="button">
                ↑ I Lent
              </button>
              <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`}
                onClick={() => setDirection("borrowed")} type="button">
                ↓ I Borrowed
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">AMOUNT</label>
            <div style={{ display: "flex", alignItems: "center",
              background: "var(--surface2)", border: "1px solid var(--border2)",
              borderRadius: 8, paddingLeft: 12 }}>
              <span style={{ fontSize: 20, color: accent, fontWeight: 700 }}>₹</span>
              <input
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" type="number" min="0" step="0.01"
                style={{ border: "none", background: "transparent", fontSize: 22,
                  fontWeight: 800, color: accent, paddingLeft: 6 }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NOTE — optional</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Purpose, notes…" />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className="btn" style={{ flex: 2, background: accent, color: "#fff",
                fontWeight: 700, opacity: !amount || saving ? 0.5 : 1 }}
              onClick={handleSubmit} disabled={!amount || saving}
            >
              {saving ? "Saving…" : "Add Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function People() {
  const [people, setPeople]         = useState([]);
  const [selected, setSelected]     = useState(null); // person_id
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [settling, setSettling]     = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddEntry, setShowAddEntry]   = useState(false);
  const [search, setSearch]         = useState("");
  const [toast, setToast]           = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const r = await peopleApi.getPeople();
      setPeople(r.data || []);
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async (personId) => {
    setEntryLoading(true);
    try {
      const r = await peopleApi.getEntries(personId);
      setEntries(r.data || []);
    } catch {
      setEntries([]);
    } finally {
      setEntryLoading(false);
    }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => {
    if (selected) loadEntries(selected);
    else setEntries([]);
  }, [selected, loadEntries]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleDeletePerson(personId, name) {
    if (!window.confirm(`Delete ${name} and all their entries?`)) return;
    try {
      await peopleApi.deletePerson(personId);
      if (selected === personId) setSelected(null);
      showToast(`${name} deleted`);
      loadPeople();
    } catch {
      showToast("Failed to delete");
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await peopleApi.deleteEntry(entryId);
      showToast("Entry deleted");
      loadEntries(selected);
      loadPeople();
    } catch (err) {
      const d = err.response?.data?.detail;
      showToast(typeof d === "string" ? d : "Failed to delete");
    }
  }

  async function handleAddEntry(payload) {
    await peopleApi.addEntry(selected, payload);
    showToast("Entry added");
    loadEntries(selected);
    loadPeople();
  }

  async function handleSettleUp() {
    if (!window.confirm(`This will mark all active entries as settled and bring the net balance to ₹0. Continue?`))
      return;
    setSettling(true);
    try {
      await peopleApi.settleUp(selected);
      showToast("Settled up successfully");
      loadEntries(selected);
      loadPeople();
    } catch (err) {
      const d = err.response?.data?.detail;
      showToast(typeof d === "string" ? d : "Failed to settle");
    } finally {
      setSettling(false);
    }
  }

  const selectedPerson = people.find(p => p.person_id === selected);

  const net = selectedPerson?.net_balance ?? 0;
  const netColor = net > 0 ? "#f59e0b" : net < 0 ? "#818cf8" : "var(--success)";
  const netLabel = net > 0
    ? `Owes you ₹${fmt(Math.abs(net))}`
    : net < 0
    ? `You owe ₹${fmt(Math.abs(net))}`
    : "All settled up";

  const totalOwedToMe = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalIOwe     = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  const filtered = search.trim()
    ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()))
    : people;

  const visibleEntries = entries.filter(e =>
    filterStatus === "all" ? true
    : filterStatus === "active" ? e.status === "active"
    : e.status === "repaid"
  );

  return (
    <>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "12px 18px", fontSize: 14,
          fontWeight: 600, color: "var(--text)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      <AppShell title="People">
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start", height: "calc(100vh - 100px)" }}>

          {/* ── Left: People list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14, overflow: "hidden", height: "100%" }}>

            {/* Summary strip */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, padding: "12px 14px", borderRight: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
                  textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
                  Owed to You
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b",
                  fontVariantNumeric: "tabular-nums" }}>
                  ₹{fmt(totalOwedToMe)}
                </div>
              </div>
              <div style={{ flex: 1, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
                  textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
                  You Owe
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8",
                  fontVariantNumeric: "tabular-nums" }}>
                  ₹{fmt(totalIOwe)}
                </div>
              </div>
            </div>

            {/* Search + Add */}
            <div style={{ display: "flex", gap: 8, padding: "10px 10px 6px" }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search people…"
                style={{ flex: 1, fontSize: 13, padding: "7px 10px" }}
              />
              <button className="btn btn-primary btn-sm"
                onClick={() => setShowAddPerson(true)}>
                + Add
              </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px 10px" }}>
              {loading ? (
                <div className="loading" style={{ padding: 32 }}>
                  <div className="spinner" />Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text3)", fontSize: 14 }}>
                  {search ? "No results" : "No people yet. Add someone to get started."}
                </div>
              ) : filtered.map(p => (
                <PersonRow
                  key={p.person_id}
                  person={p}
                  selected={selected === p.person_id}
                  onClick={() => { setSelected(p.person_id); setFilterStatus("all"); }}
                  onDelete={() => handleDeletePerson(p.person_id, p.display_name)}
                />
              ))}
            </div>
          </div>

          {/* ── Right: Entries ── */}
          {selected && selectedPerson ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Net balance card */}
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, overflow: "hidden",
              }}>
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
                    textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>
                    Net Balance with {selectedPerson.display_name}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: netColor,
                    fontVariantNumeric: "tabular-nums" }}>
                    {netLabel}
                  </div>
                </div>

                <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                      You Lent
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b",
                      fontVariantNumeric: "tabular-nums" }}>
                      ₹{fmt(entries.filter(e => e.direction === "lent")
                          .reduce((s, e) => s + e.amount, 0))}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "12px 20px" }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                      You Borrowed
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8",
                      fontVariantNumeric: "tabular-nums" }}>
                      ₹{fmt(entries.filter(e => e.direction === "borrowed")
                          .reduce((s, e) => s + e.amount, 0))}
                    </div>
                  </div>
                </div>

                {/* Settle Up button */}
                {net !== 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "12px 20px" }}>
                    <button
                      className="btn"
                      style={{
                        background: net > 0 ? "rgba(245,158,11,0.12)" : "rgba(129,140,248,0.12)",
                        color: net > 0 ? "#f59e0b" : "#818cf8",
                        border: `1px solid ${net > 0 ? "rgba(245,158,11,0.3)" : "rgba(129,140,248,0.3)"}`,
                        fontWeight: 700, width: "100%",
                        opacity: settling ? 0.6 : 1,
                      }}
                      onClick={handleSettleUp}
                      disabled={settling}
                    >
                      {settling
                        ? "Settling…"
                        : net > 0
                        ? `Mark ₹${fmt(Math.abs(net))} as Received`
                        : `Mark ₹${fmt(Math.abs(net))} as Paid`}
                    </button>
                  </div>
                )}
              </div>

              {/* Entries header */}
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", gap: 4, background: "var(--surface2)",
                  padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
                  {[
                    { id: "all",     label: `All (${entries.length})` },
                    { id: "active",  label: `Active (${entries.filter(e => e.status === "active").length})` },
                    { id: "repaid",  label: `Settled (${entries.filter(e => e.status === "repaid").length})` },
                  ].map(t => (
                    <button key={t.id}
                      className={`ld-ftab ${filterStatus === t.id ? "active" : ""}`}
                      onClick={() => setFilterStatus(t.id)} style={{ fontFamily: "inherit" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm"
                  onClick={() => setShowAddEntry(true)}>
                  + Add Entry
                </button>
              </div>

              {/* Entry cards */}
              {entryLoading ? (
                <div className="loading"><div className="spinner" />Loading entries…</div>
              ) : visibleEntries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px",
                  color: "var(--text3)", fontSize: 14 }}>
                  {filterStatus === "all"
                    ? "No entries yet. Add an entry to start tracking."
                    : `No ${filterStatus} entries.`}
                </div>
              ) : (
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {visibleEntries.map(e => (
                    <EntryCard
                      key={e.entry_id}
                      entry={e}
                      onDelete={() => handleDeleteEntry(e.entry_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: "var(--text3)", fontSize: 15 }}>
              Select a person to view their ledger
            </div>
          )}
        </div>

        {showAddPerson && (
          <AddPersonModal
            onClose={() => setShowAddPerson(false)}
            onSuccess={loadPeople}
          />
        )}
        {showAddEntry && selected && (
          <AddEntryModal
            personName={selectedPerson?.display_name || ""}
            onClose={() => setShowAddEntry(false)}
            onSuccess={handleAddEntry}
          />
        )}
      </AppShell>

      <style>{`
        .ld-ftab { padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
          cursor: pointer; border: none; background: transparent; color: var(--text2);
          transition: all 0.12s; }
        .ld-ftab:hover { color: var(--text); }
        .ld-ftab.active { background: var(--surface); color: var(--text);
          box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
      `}</style>
    </>
  );
}