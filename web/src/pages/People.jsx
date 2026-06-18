// // web/src/pages/People.jsx
// import { useState, useEffect, useCallback } from "react";
// import AppShell from "../components/AppShell";
// import * as peopleApi from "../api/people";

// function fmt(n) {
//   return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
// }

// function todayStr() {
//   return new Date().toISOString().split("T")[0];
// }

// // ── Person list ──────────────────────────────────────────────────────────────
// function PersonRow({ person, selected, onClick, onDelete }) {
//   const net      = person.net_balance;
//   const netColor = net > 0 ? "var(--warning)" : net < 0 ? "#818cf8" : "var(--text3)";
//   const netLabel = net > 0
//     ? `Owes you ₹${fmt(Math.abs(net))}`
//     : net < 0
//     ? `You owe ₹${fmt(Math.abs(net))}`
//     : "Settled";

//   const initials = person.display_name
//     .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
//   const COLORS   = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2"];
//   let hash = 0;
//   for (const c of person.display_name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
//   const avatarBg = COLORS[Math.abs(hash) % COLORS.length];

//   return (
//     <div
//       onClick={onClick}
//       style={{
//         display: "flex", alignItems: "center", gap: 12,
//         padding: "12px 16px", cursor: "pointer", borderRadius: 10,
//         background: selected ? "rgba(37,99,235,0.08)" : "transparent",
//         border: `1px solid ${selected ? "rgba(37,99,235,0.3)" : "transparent"}`,
//         transition: "all 0.12s",
//       }}
//     >
//       <div style={{
//         width: 40, height: 40, borderRadius: "50%",
//         background: avatarBg, display: "flex", alignItems: "center",
//         justifyContent: "center", fontSize: 14, fontWeight: 700,
//         color: "#fff", flexShrink: 0,
//       }}>{initials || "?"}</div>

//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
//           {person.display_name}
//         </div>
//         <div style={{ fontSize: 12, color: netColor, fontWeight: 600, marginTop: 2 }}>
//           {netLabel}
//         </div>
//         {person.active_entries > 0 && (
//           <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
//             {person.active_entries} active {person.active_entries === 1 ? "entry" : "entries"}
//           </div>
//         )}
//       </div>

//       <button
//         onClick={e => { e.stopPropagation(); onDelete(); }}
//         className="btn btn-ghost btn-xs"
//         style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.25)" }}
//       >
//         Delete
//       </button>
//     </div>
//   );
// }

// // ── Entry card ────────────────────────────────────────────────────────────────
// function EntryCard({ entry, onDelete }) {
//   const isLent     = entry.direction === "lent";
//   const isPending  = entry.status === "pending";
//   const isSettlement = entry.direction === "settlement";
//   const accentColor = isSettlement ? "var(--success)"
//     : isPending ? "var(--text3)"
//     : isLent ? "#f59e0b" : "#818cf8";

//   const pct = entry.amount > 0
//     ? Math.round(((entry.amount - entry.remaining_amount) / entry.amount) * 100)
//     : 100;

//   const dateStr = entry.entry_date
//     ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", {
//         day: "numeric", month: "short", year: "numeric",
//       })
//     : "—";

//   const dirLabel = isSettlement ? "Settlement"
//     : isLent ? "Lent" : "Borrowed";

//   return (
//     <div style={{
//       background: "var(--surface)", border: `1px solid ${
//         isPending ? "rgba(245,158,11,0.3)"
//         : isSettlement ? "rgba(16,185,129,0.3)"
//         : "var(--border)"}`,
//       borderRadius: 12, padding: "16px 18px",
//       display: "flex", flexDirection: "column", gap: 10,
//     }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//         <div style={{
//           display: "inline-flex", alignItems: "center", gap: 6,
//           background: accentColor + "18", borderRadius: 20,
//           padding: "3px 10px", fontSize: 11, fontWeight: 700,
//           color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em",
//         }}>{dirLabel}</div>
//         <div style={{ fontSize: 17, fontWeight: 800, color: accentColor,
//           fontVariantNumeric: "tabular-nums" }}>
//           ₹{fmt(entry.amount)}
//         </div>
//       </div>

//       {entry.note && (
//         <div style={{ fontSize: 12, color: "var(--text3)" }}>{entry.note}</div>
//       )}

//       {isPending && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: 6, fontSize: 12,
//           color: "var(--warning)", background: "rgba(245,158,11,0.08)",
//           borderRadius: 7, padding: "6px 10px",
//           border: "1px solid rgba(245,158,11,0.2)",
//         }}>
//           ⏳ Awaiting acknowledgement
//         </div>
//       )}

//       {!isPending && !isSettlement && (
//         <div>
//           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
//             <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>
//               {entry.status === "repaid" ? "Fully settled" : `${pct}% settled`}
//             </span>
//             <span style={{ fontSize: 12, fontWeight: 700, color: entry.status === "repaid"
//               ? "var(--success)" : accentColor }}>
//               {entry.status === "repaid" ? "Done" : `₹${fmt(entry.remaining_amount)} left`}
//             </span>
//           </div>
//           <div style={{ height: 4, borderRadius: 2, background: "var(--surface3)", overflow: "hidden" }}>
//             <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`,
//               background: entry.status === "repaid" ? "var(--success)" : accentColor,
//               transition: "width 0.3s ease" }} />
//           </div>
//         </div>
//       )}

//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//         <div style={{ fontSize: 12, color: "var(--text3)" }}>
//           {isLent ? "Lent" : isSettlement ? "Settled" : "Borrowed"} on {dateStr}
//         </div>
//         {entry.can_delete && !isSettlement && (
//           <button
//             onClick={onDelete}
//             className="btn btn-ghost btn-xs"
//             style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.25)" }}
//           >
//             Delete
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── Add Person modal ──────────────────────────────────────────────────────────
// function AddPersonModal({ onClose, onSuccess }) {
//   const [name, setName]           = useState("");
//   const [results, setResults]     = useState([]);
//   const [selected, setSelected]   = useState(null);
//   const [searching, setSearching] = useState(false);
//   const [saving, setSaving]       = useState(false);
//   const [error, setError]         = useState("");
//   const timerRef                  = useState(null);

//   function handleNameChange(v) {
//     setName(v); setSelected(null); setError("");
//     clearTimeout(timerRef[0]);
//     if (v.trim().length < 2) { setResults([]); return; }
//     setSearching(true);
//     timerRef[0] = setTimeout(async () => {
//       try {
//         const r = await peopleApi.searchUsers(v.trim());
//         setResults(r.data || []);
//       } catch { setResults([]); }
//       finally { setSearching(false); }
//     }, 350);
//   }

//   async function handleSubmit() {
//     if (!name.trim()) { setError("Name is required"); return; }
//     setSaving(true);
//     try {
//       await peopleApi.createPerson({
//         display_name: name.trim(),
//         linked_user_id: selected?.user_id || null,
//       });
//       onSuccess();
//       onClose();
//     } catch (err) {
//       const d = err.response?.data?.detail;
//       setError(typeof d === "string" ? d : "Failed to add person");
//       setSaving(false);
//     }
//   }

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
//         <div className="modal-head">
//           <div className="modal-title">Add Person</div>
//           <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
//         </div>
//         <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//           {error && <div className="alert alert-error">{error}</div>}
//           <div className="form-group" style={{ marginBottom: 0 }}>
//             <label className="form-label">NAME OR EMAIL</label>
//             <input
//               value={name}
//               onChange={e => handleNameChange(e.target.value)}
//               placeholder="Search by name or add custom…"
//               autoFocus
//             />
//           </div>

//           {results.length > 0 && !selected && (
//             <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
//               <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
//                 textTransform: "uppercase", color: "var(--text3)",
//                 padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>
//                 Registered Users
//               </div>
//               {results.map(u => (
//                 <div key={u.user_id}
//                   onClick={() => { setName(u.name); setSelected(u); setResults([]); }}
//                   style={{ display: "flex", alignItems: "center", gap: 10,
//                     padding: "10px 12px", cursor: "pointer",
//                     borderBottom: "1px solid var(--border)",
//                     transition: "background 0.1s" }}
//                   onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
//                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}
//                 >
//                   <div style={{ width: 28, height: 28, borderRadius: "50%",
//                     background: "var(--primary)", display: "flex", alignItems: "center",
//                     justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
//                     {u.name[0]?.toUpperCase()}
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
//                     <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {selected && (
//             <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12,
//               color: "var(--success)", background: "rgba(16,185,129,0.08)",
//               borderRadius: 7, padding: "8px 12px", border: "1px solid rgba(16,185,129,0.2)" }}>
//               ✓ Linked to registered user — entries will require acknowledgement
//             </div>
//           )}

//           <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
//             <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
//             <button
//               className="btn btn-primary" style={{ flex: 2 }}
//               onClick={handleSubmit} disabled={!name.trim() || saving}
//             >
//               {saving ? "Saving…" : "Add Person"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Add Entry modal ───────────────────────────────────────────────────────────
// function AddEntryModal({ personName, onClose, onSuccess }) {
//   const [direction, setDirection] = useState("lent");
//   const [amount, setAmount]       = useState("");
//   const [date, setDate]           = useState(todayStr());
//   const [note, setNote]           = useState("");
//   const [saving, setSaving]       = useState(false);
//   const [error, setError]         = useState("");

//   async function handleSubmit(e) {
//     e.preventDefault();
//     if (!amount || isNaN(+amount) || +amount <= 0) { setError("Enter a valid amount"); return; }
//     setSaving(true);
//     try {
//       await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date });
//       onClose();
//     } catch (err) {
//       const d = err.response?.data?.detail;
//       setError(typeof d === "string" ? d : "Failed to save");
//       setSaving(false);
//     }
//   }

//   const accent = direction === "lent" ? "#f59e0b" : "#818cf8";

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
//         <div className="modal-head">
//           <div className="modal-title">Add Entry — {personName}</div>
//           <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
//         </div>
//         <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//           {error && <div className="alert alert-error">{error}</div>}

//           <div className="form-group" style={{ marginBottom: 0 }}>
//             <label className="form-label">DIRECTION</label>
//             <div className="split-toggle">
//               <button className={`split-opt ${direction === "lent" ? "on" : ""}`}
//                 onClick={() => setDirection("lent")} type="button">
//                 ↑ I Lent
//               </button>
//               <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`}
//                 onClick={() => setDirection("borrowed")} type="button">
//                 ↓ I Borrowed
//               </button>
//             </div>
//           </div>

//           <div className="form-group" style={{ marginBottom: 0 }}>
//             <label className="form-label">AMOUNT</label>
//             <div style={{ display: "flex", alignItems: "center",
//               background: "var(--surface2)", border: "1px solid var(--border2)",
//               borderRadius: 8, paddingLeft: 12 }}>
//               <span style={{ fontSize: 20, color: accent, fontWeight: 700 }}>₹</span>
//               <input
//                 value={amount} onChange={e => setAmount(e.target.value)}
//                 placeholder="0.00" type="number" min="0" step="0.01"
//                 style={{ border: "none", background: "transparent", fontSize: 22,
//                   fontWeight: 800, color: accent, paddingLeft: 6 }}
//               />
//             </div>
//           </div>

//           <div className="form-group" style={{ marginBottom: 0 }}>
//             <label className="form-label">DATE</label>
//             <input type="date" value={date} onChange={e => setDate(e.target.value)} />
//           </div>

//           <div className="form-group" style={{ marginBottom: 0 }}>
//             <label className="form-label">NOTE — optional</label>
//             <input value={note} onChange={e => setNote(e.target.value)}
//               placeholder="Purpose, notes…" />
//           </div>

//           <div style={{ display: "flex", gap: 8 }}>
//             <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
//             <button
//               className="btn" style={{ flex: 2, background: accent, color: "#fff",
//                 fontWeight: 700, opacity: !amount || saving ? 0.5 : 1 }}
//               onClick={handleSubmit} disabled={!amount || saving}
//             >
//               {saving ? "Saving…" : "Add Entry"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main page ─────────────────────────────────────────────────────────────────
// export default function People() {
//   const [people, setPeople]         = useState([]);
//   const [selected, setSelected]     = useState(null); // person_id
//   const [entries, setEntries]       = useState([]);
//   const [loading, setLoading]       = useState(true);
//   const [entryLoading, setEntryLoading] = useState(false);
//   const [settling, setSettling]     = useState(false);
//   const [showAddPerson, setShowAddPerson] = useState(false);
//   const [showAddEntry, setShowAddEntry]   = useState(false);
//   const [search, setSearch]         = useState("");
//   const [toast, setToast]           = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");

//   const loadPeople = useCallback(async () => {
//     setLoading(true);
//     try {
//       const r = await peopleApi.getPeople();
//       setPeople(r.data || []);
//     } catch {
//       setPeople([]);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const loadEntries = useCallback(async (personId) => {
//     setEntryLoading(true);
//     try {
//       const r = await peopleApi.getEntries(personId);
//       setEntries(r.data || []);
//     } catch {
//       setEntries([]);
//     } finally {
//       setEntryLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadPeople(); }, [loadPeople]);
//   useEffect(() => {
//     if (selected) loadEntries(selected);
//     else setEntries([]);
//   }, [selected, loadEntries]);

//   function showToast(msg) {
//     setToast(msg);
//     setTimeout(() => setToast(""), 3000);
//   }

//   async function handleDeletePerson(personId, name) {
//     if (!window.confirm(`Delete ${name} and all their entries?`)) return;
//     try {
//       await peopleApi.deletePerson(personId);
//       if (selected === personId) setSelected(null);
//       showToast(`${name} deleted`);
//       loadPeople();
//     } catch {
//       showToast("Failed to delete");
//     }
//   }

//   async function handleDeleteEntry(entryId) {
//     if (!window.confirm("Delete this entry?")) return;
//     try {
//       await peopleApi.deleteEntry(entryId);
//       showToast("Entry deleted");
//       loadEntries(selected);
//       loadPeople();
//     } catch (err) {
//       const d = err.response?.data?.detail;
//       showToast(typeof d === "string" ? d : "Failed to delete");
//     }
//   }

//   async function handleAddEntry(payload) {
//     await peopleApi.addEntry(selected, payload);
//     showToast("Entry added");
//     loadEntries(selected);
//     loadPeople();
//   }

//   async function handleSettleUp() {
//     if (!window.confirm(`This will mark all active entries as settled and bring the net balance to ₹0. Continue?`))
//       return;
//     setSettling(true);
//     try {
//       await peopleApi.settleUp(selected);
//       showToast("Settled up successfully");
//       loadEntries(selected);
//       loadPeople();
//     } catch (err) {
//       const d = err.response?.data?.detail;
//       showToast(typeof d === "string" ? d : "Failed to settle");
//     } finally {
//       setSettling(false);
//     }
//   }

//   const selectedPerson = people.find(p => p.person_id === selected);

//   const net = selectedPerson?.net_balance ?? 0;
//   const netColor = net > 0 ? "#f59e0b" : net < 0 ? "#818cf8" : "var(--success)";
//   const netLabel = net > 0
//     ? `Owes you ₹${fmt(Math.abs(net))}`
//     : net < 0
//     ? `You owe ₹${fmt(Math.abs(net))}`
//     : "All settled up";

//   const totalOwedToMe = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
//   const totalIOwe     = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

//   const filtered = search.trim()
//     ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()))
//     : people;

//   const visibleEntries = entries.filter(e =>
//     filterStatus === "all" ? true
//     : filterStatus === "active" ? e.status === "active"
//     : e.status === "repaid"
//   );

//   return (
//     <>
//       {toast && (
//         <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999,
//           background: "var(--surface)", border: "1px solid var(--border)",
//           borderRadius: 10, padding: "12px 18px", fontSize: 14,
//           fontWeight: 600, color: "var(--text)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
//           {toast}
//         </div>
//       )}

//       <AppShell title="People">
//         <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start", height: "calc(100vh - 100px)" }}>

//           {/* ── Left: People list ── */}
//           <div style={{ display: "flex", flexDirection: "column", gap: 0,
//             background: "var(--surface)", border: "1px solid var(--border)",
//             borderRadius: 14, overflow: "hidden", height: "100%" }}>

//             {/* Summary strip */}
//             <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
//               <div style={{ flex: 1, padding: "12px 14px", borderRight: "1px solid var(--border)" }}>
//                 <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
//                   textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
//                   Owed to You
//                 </div>
//                 <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b",
//                   fontVariantNumeric: "tabular-nums" }}>
//                   ₹{fmt(totalOwedToMe)}
//                 </div>
//               </div>
//               <div style={{ flex: 1, padding: "12px 14px" }}>
//                 <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
//                   textTransform: "uppercase", color: "var(--text3)", marginBottom: 4 }}>
//                   You Owe
//                 </div>
//                 <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8",
//                   fontVariantNumeric: "tabular-nums" }}>
//                   ₹{fmt(totalIOwe)}
//                 </div>
//               </div>
//             </div>

//             {/* Search + Add */}
//             <div style={{ display: "flex", gap: 8, padding: "10px 10px 6px" }}>
//               <input
//                 value={search} onChange={e => setSearch(e.target.value)}
//                 placeholder="Search people…"
//                 style={{ flex: 1, fontSize: 13, padding: "7px 10px" }}
//               />
//               <button className="btn btn-primary btn-sm"
//                 onClick={() => setShowAddPerson(true)}>
//                 + Add
//               </button>
//             </div>

//             {/* List */}
//             <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px 10px" }}>
//               {loading ? (
//                 <div className="loading" style={{ padding: 32 }}>
//                   <div className="spinner" />Loading…
//                 </div>
//               ) : filtered.length === 0 ? (
//                 <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text3)", fontSize: 14 }}>
//                   {search ? "No results" : "No people yet. Add someone to get started."}
//                 </div>
//               ) : filtered.map(p => (
//                 <PersonRow
//                   key={p.person_id}
//                   person={p}
//                   selected={selected === p.person_id}
//                   onClick={() => { setSelected(p.person_id); setFilterStatus("all"); }}
//                   onDelete={() => handleDeletePerson(p.person_id, p.display_name)}
//                 />
//               ))}
//             </div>
//           </div>

//           {/* ── Right: Entries ── */}
//           {selected && selectedPerson ? (
//             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

//               {/* Net balance card */}
//               <div style={{
//                 background: "var(--surface)", border: "1px solid var(--border)",
//                 borderRadius: 14, overflow: "hidden",
//               }}>
//                 <div style={{ padding: "18px 20px" }}>
//                   <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
//                     textTransform: "uppercase", color: "var(--text3)", marginBottom: 6 }}>
//                     Net Balance with {selectedPerson.display_name}
//                   </div>
//                   <div style={{ fontSize: 28, fontWeight: 800, color: netColor,
//                     fontVariantNumeric: "tabular-nums" }}>
//                     {netLabel}
//                   </div>
//                 </div>

//                 <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
//                   <div style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid var(--border)" }}>
//                     <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600,
//                       textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
//                       You Lent
//                     </div>
//                     <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b",
//                       fontVariantNumeric: "tabular-nums" }}>
//                       ₹{fmt(entries.filter(e => e.direction === "lent")
//                           .reduce((s, e) => s + e.amount, 0))}
//                     </div>
//                   </div>
//                   <div style={{ flex: 1, padding: "12px 20px" }}>
//                     <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600,
//                       textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
//                       You Borrowed
//                     </div>
//                     <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8",
//                       fontVariantNumeric: "tabular-nums" }}>
//                       ₹{fmt(entries.filter(e => e.direction === "borrowed")
//                           .reduce((s, e) => s + e.amount, 0))}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Settle Up button */}
//                 {net !== 0 && (
//                   <div style={{ borderTop: "1px solid var(--border)", padding: "12px 20px" }}>
//                     <button
//                       className="btn"
//                       style={{
//                         background: net > 0 ? "rgba(245,158,11,0.12)" : "rgba(129,140,248,0.12)",
//                         color: net > 0 ? "#f59e0b" : "#818cf8",
//                         border: `1px solid ${net > 0 ? "rgba(245,158,11,0.3)" : "rgba(129,140,248,0.3)"}`,
//                         fontWeight: 700, width: "100%",
//                         opacity: settling ? 0.6 : 1,
//                       }}
//                       onClick={handleSettleUp}
//                       disabled={settling}
//                     >
//                       {settling
//                         ? "Settling…"
//                         : net > 0
//                         ? `Mark ₹${fmt(Math.abs(net))} as Received`
//                         : `Mark ₹${fmt(Math.abs(net))} as Paid`}
//                     </button>
//                   </div>
//                 )}
//               </div>

//               {/* Entries header */}
//               <div style={{ display: "flex", alignItems: "center",
//                 justifyContent: "space-between", gap: 12 }}>
//                 <div style={{ display: "flex", gap: 4, background: "var(--surface2)",
//                   padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
//                   {[
//                     { id: "all",     label: `All (${entries.length})` },
//                     { id: "active",  label: `Active (${entries.filter(e => e.status === "active").length})` },
//                     { id: "repaid",  label: `Settled (${entries.filter(e => e.status === "repaid").length})` },
//                   ].map(t => (
//                     <button key={t.id}
//                       className={`ld-ftab ${filterStatus === t.id ? "active" : ""}`}
//                       onClick={() => setFilterStatus(t.id)} style={{ fontFamily: "inherit" }}>
//                       {t.label}
//                     </button>
//                   ))}
//                 </div>
//                 <button className="btn btn-primary btn-sm"
//                   onClick={() => setShowAddEntry(true)}>
//                   + Add Entry
//                 </button>
//               </div>

//               {/* Entry cards */}
//               {entryLoading ? (
//                 <div className="loading"><div className="spinner" />Loading entries…</div>
//               ) : visibleEntries.length === 0 ? (
//                 <div style={{ textAlign: "center", padding: "48px 24px",
//                   color: "var(--text3)", fontSize: 14 }}>
//                   {filterStatus === "all"
//                     ? "No entries yet. Add an entry to start tracking."
//                     : `No ${filterStatus} entries.`}
//                 </div>
//               ) : (
//                 <div style={{ display: "grid",
//                   gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
//                   {visibleEntries.map(e => (
//                     <EntryCard
//                       key={e.entry_id}
//                       entry={e}
//                       onDelete={() => handleDeleteEntry(e.entry_id)}
//                     />
//                   ))}
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
//               height: "100%", color: "var(--text3)", fontSize: 15 }}>
//               Select a person to view their ledger
//             </div>
//           )}
//         </div>

//         {showAddPerson && (
//           <AddPersonModal
//             onClose={() => setShowAddPerson(false)}
//             onSuccess={loadPeople}
//           />
//         )}
//         {showAddEntry && selected && (
//           <AddEntryModal
//             personName={selectedPerson?.display_name || ""}
//             onClose={() => setShowAddEntry(false)}
//             onSuccess={handleAddEntry}
//           />
//         )}
//       </AppShell>

//       <style>{`
//         .ld-ftab { padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
//           cursor: pointer; border: none; background: transparent; color: var(--text2);
//           transition: all 0.12s; }
//         .ld-ftab:hover { color: var(--text); }
//         .ld-ftab.active { background: var(--surface); color: var(--text);
//           box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
//       `}</style>
//     </>
//   );
// }







// web/src/pages/People.jsx
// import { useState, useEffect, useCallback } from "react";
// import AppShell from "../components/AppShell";
// import * as peopleApi from "../api/people";

// function fmt(n) {
//   return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
// }

// function todayStr() {
//   return new Date().toISOString().split("T")[0];
// }

// // ── Person list Item ────────────────────────────────────────────────────────
// function PersonRow({ person, selected, onClick, onDelete }) {
//   const net      = person.net_balance;
//   const netColor = net > 0 ? "var(--warning)" : net < 0 ? "#818cf8" : "var(--text3)";
//   const netLabel = net > 0 ? `Owes you ₹${fmt(Math.abs(net))}`
//                  : net < 0 ? `You owe ₹${fmt(Math.abs(net))}` : "Settled";

//   const initials = person.display_name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
//   const COLORS   = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2"];
//   let hash = 0;
//   for (const c of person.display_name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
//   const avatarBg = COLORS[Math.abs(hash) % COLORS.length];

//   return (
//     <div
//       onClick={onClick}
//       style={{
//         display: "flex", alignItems: "center", gap: 14,
//         padding: "14px 16px", cursor: "pointer",
//         background: selected ? "var(--surface2)" : "transparent",
//         borderBottom: "1px solid var(--border)",
//         borderLeft: `3px solid ${selected ? "var(--primary)" : "transparent"}`,
//         transition: "background 0.15s ease",
//       }}
//       onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--surface)"; }}
//       onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
//     >
//       <div style={{
//         width: 42, height: 42, borderRadius: "50%",
//         background: avatarBg, display: "flex", alignItems: "center",
//         justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
//       }}>{initials || "?"}</div>

//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
//           <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//             {person.display_name}
//           </div>
//         </div>
//         <div style={{ fontSize: 13, color: netColor, fontWeight: 500, marginTop: 4 }}>
//           {netLabel}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Entry Row (Replaces Blocky Cards) ─────────────────────────────────────────
// function EntryRow({ entry, onDelete }) {
//   const isLent       = entry.direction === "lent";
//   const isPending    = entry.status === "pending";
//   const isSettlement = entry.direction === "settlement";
  
//   const accentColor = isSettlement ? "var(--success)" : isPending ? "var(--text3)" : isLent ? "#f59e0b" : "#818cf8";
  
//   const dateStr = entry.entry_date
//     ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
//     : "—";

//   return (
//     <div style={{
//       display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
//       padding: "16px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
//       opacity: isPending ? 0.7 : 1,
//     }}>
//       {/* Icon & Details */}
//       <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
//         <div style={{
//           width: 40, height: 40, borderRadius: 10, background: accentColor + "18",
//           display: "flex", alignItems: "center", justifyContent: "center", color: accentColor, flexShrink: 0
//         }}>
//           {isSettlement ? "✓" : isLent ? "↑" : "↓"}
//         </div>
//         <div>
//           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//             <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
//               {isSettlement ? "Settlement" : isLent ? "You Lent" : "You Borrowed"}
//             </span>
//             {isPending && (
//               <span style={{ fontSize: 11, background: "rgba(245,158,11,0.1)", color: "var(--warning)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
//                 Pending
//               </span>
//             )}
//           </div>
//           <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
//             {dateStr} {entry.note ? ` • ${entry.note}` : ""}
//           </div>
//         </div>
//       </div>

//       {/* Amount & Actions */}
//       <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
//         <div style={{ fontSize: 16, fontWeight: 700, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
//           ₹{fmt(entry.amount)}
//         </div>
//         {!isPending && !isSettlement && (
//           <div style={{ fontSize: 12, color: entry.status === "repaid" ? "var(--success)" : "var(--text3)", fontWeight: 500 }}>
//             {entry.status === "repaid" ? "Fully settled" : `₹${fmt(entry.remaining_amount)} left`}
//           </div>
//         )}
//       </div>

//       {entry.can_delete && !isSettlement && (
//         <button onClick={onDelete} style={{
//           background: "none", border: "none", color: "var(--danger)", cursor: "pointer", 
//           padding: 8, opacity: 0.6, transition: "opacity 0.2s"
//         }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
//           ✕
//         </button>
//       )}
//     </div>
//   );
// }

// // ── Modals ──
// // (Keeping your exactly perfectly working modals from before, just compacting them visually)
// function AddPersonModal({ onClose, onSuccess }) { /* Same logic as before */ 
//   const [name, setName] = useState(""); const [results, setResults] = useState([]); const [selected, setSelected] = useState(null);
//   const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const timerRef = useState(null);
//   function handleNameChange(v) {
//     setName(v); setSelected(null); setError(""); clearTimeout(timerRef[0]);
//     if (v.trim().length < 2) { setResults([]); return; }
//     timerRef[0] = setTimeout(async () => {
//       try { const r = await peopleApi.searchUsers(v.trim()); setResults(r.data || []); } catch { setResults([]); }
//     }, 350);
//   }
//   async function handleSubmit() {
//     if (!name.trim()) return; setSaving(true);
//     try { await peopleApi.createPerson({ display_name: name.trim(), linked_user_id: selected?.user_id || null }); onSuccess(); onClose(); } 
//     catch (err) { setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to add"); setSaving(false); }
//   }
//   return (
//     <div className="modal-overlay" onClick={onClose}><div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
//       <div className="modal-head"><div className="modal-title">Add Person</div><button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button></div>
//       <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//         {error && <div className="alert alert-error">{error}</div>}
//         <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">NAME OR EMAIL</label>
//           <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Search or add custom…" autoFocus />
//         </div>
//         {results.length > 0 && !selected && (
//           <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
//             {results.map(u => (
//               <div key={u.user_id} onClick={() => { setName(u.name); setSelected(u); setResults([]); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
//                 <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
//               </div>
//             ))}
//           </div>
//         )}
//         <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || saving}>{saving ? "Saving…" : "Add Person"}</button>
//       </div>
//     </div></div>
//   );
// }

// function AddEntryModal({ personName, onClose, onSuccess }) { /* Same logic as before */
//   const [direction, setDirection] = useState("lent"); const [amount, setAmount] = useState("");
//   const [date, setDate] = useState(todayStr()); const [note, setNote] = useState("");
//   const [saving, setSaving] = useState(false); const [error, setError] = useState("");
//   async function handleSubmit(e) {
//     e.preventDefault(); if (!amount || isNaN(+amount) || +amount <= 0) { setError("Invalid amount"); return; }
//     setSaving(true);
//     try { await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date }); onClose(); } 
//     catch (err) { setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to save"); setSaving(false); }
//   }
//   const accent = direction === "lent" ? "#f59e0b" : "#818cf8";
//   return (
//     <div className="modal-overlay" onClick={onClose}><div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
//       <div className="modal-head"><div className="modal-title">Add Entry — {personName}</div><button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button></div>
//       <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//         {error && <div className="alert alert-error">{error}</div>}
//         <div className="split-toggle">
//           <button className={`split-opt ${direction === "lent" ? "on" : ""}`} onClick={() => setDirection("lent")}>↑ I Lent</button>
//           <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`} onClick={() => setDirection("borrowed")}>↓ I Borrowed</button>
//         </div>
//         <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">AMOUNT</label>
//           <div style={{ display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, paddingLeft: 12 }}>
//             <span style={{ fontSize: 20, color: accent, fontWeight: 700 }}>₹</span>
//             <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" style={{ border: "none", background: "transparent", fontSize: 22, fontWeight: 800, color: accent, paddingLeft: 6 }} />
//           </div>
//         </div>
//         <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">DATE</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
//         <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">NOTE</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional details…" /></div>
//         <button className="btn" style={{ background: accent, color: "#fff", fontWeight: 700, opacity: !amount || saving ? 0.5 : 1 }} onClick={handleSubmit} disabled={!amount || saving}>{saving ? "Saving…" : "Add Entry"}</button>
//       </div>
//     </div></div>
//   );
// }

// // ── Main Page ─────────────────────────────────────────────────────────────────
// export default function People() {
//   const [people, setPeople] = useState([]); const [selected, setSelected] = useState(null);
//   const [entries, setEntries] = useState([]); const [loading, setLoading] = useState(true);
//   const [entryLoading, setEntryLoading] = useState(false); const [settling, setSettling] = useState(false);
//   const [showAddPerson, setShowAddPerson] = useState(false); const [showAddEntry, setShowAddEntry] = useState(false);
//   const [search, setSearch] = useState(""); const [filterStatus, setFilterStatus] = useState("all");

//   const loadPeople = useCallback(async () => {
//     setLoading(true); try { const r = await peopleApi.getPeople(); setPeople(r.data || []); } 
//     catch { setPeople([]); } finally { setLoading(false); }
//   }, []);

//   const loadEntries = useCallback(async (personId) => {
//     setEntryLoading(true); try { const r = await peopleApi.getEntries(personId); setEntries(r.data || []); } 
//     catch { setEntries([]); } finally { setEntryLoading(false); }
//   }, []);

//   useEffect(() => { loadPeople(); }, [loadPeople]);
//   useEffect(() => { if (selected) loadEntries(selected); else setEntries([]); }, [selected, loadEntries]);

//   async function handleDeletePerson(personId, name) {
//     if (!window.confirm(`Delete ${name} and all their entries?`)) return;
//     try { await peopleApi.deletePerson(personId); if (selected === personId) setSelected(null); loadPeople(); } catch {}
//   }
//   async function handleDeleteEntry(entryId) {
//     if (!window.confirm("Delete this entry?")) return;
//     try { await peopleApi.deleteEntry(entryId); loadEntries(selected); loadPeople(); } catch {}
//   }
//   async function handleAddEntry(payload) {
//     await peopleApi.addEntry(selected, payload); loadEntries(selected); loadPeople();
//   }
//   async function handleSettleUp() {
//     if (!window.confirm("Settle all active entries to ₹0?")) return;
//     setSettling(true);
//     try { await peopleApi.settleUp(selected); loadEntries(selected); loadPeople(); } 
//     catch {} finally { setSettling(false); }
//   }

//   const selectedPerson = people.find(p => p.person_id === selected);
//   const net = selectedPerson?.net_balance ?? 0;
//   const filtered = search.trim() ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase())) : people;
//   const visibleEntries = entries.filter(e => filterStatus === "all" ? true : filterStatus === "active" ? e.status === "active" : e.status === "repaid");

//   return (
//     <AppShell title="People">
//       <div style={{ display: "flex", height: "calc(100vh - 80px)", background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        
//         {/* ── Left Sidebar (People List) ── */}
//         <div style={{ width: 320, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--surface2)" }}>
//           <div style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
//               <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Contacts</h2>
//               <button className="btn btn-primary btn-sm" onClick={() => setShowAddPerson(true)}>+ Add</button>
//             </div>
//             <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }} />
//           </div>
//           <div style={{ flex: 1, overflowY: "auto" }}>
//             {loading ? <div style={{ padding: 20, color: "var(--text3)" }}>Loading...</div> : filtered.map(p => (
//               <PersonRow key={p.person_id} person={p} selected={selected === p.person_id} onClick={() => setSelected(p.person_id)} />
//             ))}
//           </div>
//         </div>

//         {/* ── Right Content (Ledger Detail) ── */}
//         <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
//           {selected && selectedPerson ? (
//             <>
//               {/* Header Profile Area */}
//               <div style={{ padding: "32px 40px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
//                 <div>
//                   <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
//                     <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>
//                       {selectedPerson.display_name.charAt(0).toUpperCase()}
//                     </div>
//                     <div>
//                       <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{selectedPerson.display_name}</h1>
//                       <button onClick={() => handleDeletePerson(selectedPerson.person_id, selectedPerson.display_name)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 13, cursor: "pointer", padding: 0 }}>Delete Contact</button>
//                     </div>
//                   </div>
                  
//                   <div style={{ display: "flex", gap: 32 }}>
//                     <div>
//                       <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" }}>Net Balance</div>
//                       <div style={{ fontSize: 20, fontWeight: 700, color: net > 0 ? "#f59e0b" : net < 0 ? "#818cf8" : "var(--success)" }}>
//                         {net > 0 ? `Owes you ₹${fmt(Math.abs(net))}` : net < 0 ? `You owe ₹${fmt(Math.abs(net))}` : "Settled up"}
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div style={{ display: "flex", gap: 12 }}>
//                   {net !== 0 && (
//                     <button className="btn" style={{ background: net > 0 ? "rgba(245,158,11,0.15)" : "rgba(129,140,248,0.15)", color: net > 0 ? "#f59e0b" : "#818cf8", fontWeight: 700 }} onClick={handleSettleUp} disabled={settling}>
//                       {settling ? "Settling…" : "Settle Balance"}
//                     </button>
//                   )}
//                   <button className="btn btn-primary" onClick={() => setShowAddEntry(true)}>+ Add Entry</button>
//                 </div>
//               </div>

//               {/* Transactions List */}
//               <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
//                 <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
//                   {["all", "active", "repaid"].map(t => (
//                     <button key={t} onClick={() => setFilterStatus(t)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: filterStatus === t ? "var(--text)" : "var(--surface)", color: filterStatus === t ? "var(--bg)" : "var(--text2)", transition: "all 0.2s" }}>
//                       {t.charAt(0).toUpperCase() + t.slice(1)}
//                     </button>
//                   ))}
//                 </div>

//                 {entryLoading ? (
//                   <div style={{ color: "var(--text3)" }}>Loading entries...</div>
//                 ) : visibleEntries.length === 0 ? (
//                   <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>No {filterStatus} entries found.</div>
//                 ) : (
//                   <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
//                     {visibleEntries.map(e => <EntryRow key={e.entry_id} entry={e} onDelete={() => handleDeleteEntry(e.entry_id)} />)}
//                   </div>
//                 )}
//               </div>
//             </>
//           ) : (
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", flexDirection: "column", gap: 16 }}>
//               <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👋</div>
//               Select a contact to view their ledger
//             </div>
//           )}
//         </div>
//       </div>
//       {showAddPerson && <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={loadPeople} />}
//       {showAddEntry && selected && <AddEntryModal personName={selectedPerson?.display_name || ""} onClose={() => setShowAddEntry(false)} onSuccess={handleAddEntry} />}
//     </AppShell>
//   );
// }


































// web/src/pages/People.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "../components/AppShell";
import * as peopleApi from "../api/people";

/* ────────────────────────────────────────────────────────────────────────
   Icons — ported 1:1 from mobile/src/components/icons/icons.jsx so the web
   ledger reads identically to the app. Once utils/Icons.js's export shape
   is confirmed, these should move there to dedupe with Loans.jsx.
   ──────────────────────────────────────────────────────────────────────── */
const ICON_BASE = { fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const Icon = {
  lendMoney: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <circle cx="12" cy="18" r="4" />
      <path d="M12 14V2" />
      <path d="M7 7l5-5 5 5" />
    </svg>
  ),
  borrowMoney: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <circle cx="12" cy="18" r="4" />
      <path d="M12 2v12" />
      <path d="M7 9l5 5 5-5" />
    </svg>
  ),
  settlement: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  ),
  userPlus: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  users: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  search: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  trash: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  sparkle: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
  clockPending: ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  checkCircle: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...ICON_BASE}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

const STYLES = `
  @keyframes ppFadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
  @keyframes ppPulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

  .pp-shell {
    display: flex; height: calc(100vh - 156px);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
  }

  .pp-sidebar {
    width: 320px; flex-shrink: 0; display: flex; flex-direction: column;
    background: var(--surface2); border-right: 1px solid var(--border);
  }
  .pp-sidebar-head { padding: 18px 18px 14px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
  .pp-sidebar-title-row { display: flex; align-items: center; justify-content: space-between; }
  .pp-sidebar-title { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; }

  .pp-search-wrap { position: relative; }
  .pp-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text3); display: flex; pointer-events: none; }
  .pp-search-input {
    width: 100%; padding: 9px 12px 9px 34px; border-radius: 9px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text); font-size: 13.5px; font-family: inherit; outline: none;
    transition: border-color 0.13s; box-sizing: border-box;
  }
  .pp-search-input:focus { border-color: var(--border2); }
  .pp-search-input::placeholder { color: var(--text3); }

  .pp-summary-strip { display: flex; border-bottom: 1px solid var(--border); }
  .pp-summary-cell { flex: 1; padding: 12px 16px; }
  .pp-summary-cell + .pp-summary-cell { border-left: 1px solid var(--border); }
  .pp-summary-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); margin-bottom: 5px; }
  .pp-summary-val { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }

  .pp-contact-list { flex: 1; overflow-y: auto; padding: 6px 0 10px; }
  .pp-contact-row {
    display: flex; align-items: center; gap: 12px; padding: 11px 16px; cursor: pointer;
    border-left: 2px solid transparent; transition: background 0.12s, border-color 0.12s;
    animation: ppFadeUp 0.18s ease both;
  }
  .pp-contact-row:hover { background: var(--surface3); }
  .pp-contact-row.active { background: var(--surface); border-left-color: var(--primary-h); }
  .pp-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; }
  .pp-contact-info { flex: 1; min-width: 0; }
  .pp-contact-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pp-contact-sub { font-size: 12.5px; font-weight: 600; margin-top: 2px; }
  .pp-contact-meta { font-size: 11px; color: var(--text3); margin-top: 1px; }

  .pp-empty-list { text-align: center; padding: 48px 20px; color: var(--text3); font-size: 13.5px; line-height: 1.5; }

  .pp-detail { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-width: 0; }
  .pp-detail-head {
    padding: 26px 32px; background: var(--surface); border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap;
  }
  .pp-profile-row { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
  .pp-profile-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 21px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .pp-profile-name { font-size: 21px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; margin-bottom: 4px; }
  .pp-profile-del { font-size: 12.5px; font-weight: 600; color: var(--text3); background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 5px; transition: color 0.12s; }
  .pp-profile-del:hover { color: var(--danger); }

  .pp-net-row { display: flex; gap: 28px; }
  .pp-net-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); margin-bottom: 5px; }
  .pp-net-val { font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; }

  .pp-detail-actions { display: flex; gap: 10px; }

  .pp-body { flex: 1; overflow-y: auto; padding: 26px 32px; }
  .pp-filter-tabs { display: flex; gap: 4px; background: var(--surface2); padding: 4px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 20px; width: fit-content; }
  .pp-ftab { padding: 6px 16px; border-radius: 7px; font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer; border: none; background: transparent; color: var(--text2); transition: all 0.13s; }
  .pp-ftab:hover { color: var(--text); }
  .pp-ftab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.3); }

  .pp-entries { border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--surface); }
  .pp-entry-row { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--border); animation: ppFadeUp 0.18s ease both; }
  .pp-entry-row:last-child { border-bottom: none; }
  .pp-entry-row.pending { opacity: 0.65; }
  .pp-entry-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pp-entry-title-row { display: flex; align-items: center; gap: 8px; }
  .pp-entry-title { font-size: 14px; font-weight: 600; color: var(--text); }
  .pp-entry-meta { font-size: 12px; color: var(--text3); margin-top: 3px; }
  .pp-entry-amount { font-size: 15.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .pp-entry-progress { font-size: 11.5px; font-weight: 600; margin-top: 3px; }
  .pp-pill { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; }
  .pp-entry-del { background: none; border: none; color: var(--text3); cursor: pointer; padding: 7px; border-radius: 7px; transition: all 0.12s; flex-shrink: 0; display: flex; }
  .pp-entry-del:hover { color: var(--danger); background: rgba(239,68,68,0.08); }

  .pp-empty-detail { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text3); gap: 14px; text-align: center; }
  .pp-empty-icon-circle { width: 64px; height: 64px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; }

  .pp-skel { animation: ppPulse 1.4s ease-in-out infinite; background: var(--surface3); border-radius: 5px; display: block; }

  .pp-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; align-items: center; gap: 10px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: 12px 18px;
    font-size: 13.5px; font-weight: 600; color: var(--text); box-shadow: 0 8px 30px rgba(0,0,0,0.35);
    animation: ppFadeUp 0.18s ease both;
  }

  .pp-search-result { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; }
  .pp-search-result:hover { background: var(--surface2); }
  .pp-search-result:last-child { border-bottom: none; }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Mirrors mobile Ui.jsx's AVATAR_COLORS + colorForName exactly, so the same
// contact gets the same avatar color on web and mobile.
const AVATAR_COLORS = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#65a30d","#9333ea","#e11d48","#0369a1"];
function colorForName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initialsFor(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

function Avatar({ name, size = 40, fontSize }) {
  return (
    <div className="pp-avatar" style={{ width: size, height: size, fontSize: fontSize || size * 0.34, background: colorForName(name) }}>
      {initialsFor(name)}
    </div>
  );
}

// ── Entry type config — mirrors mobile TYPE_ICONS for lend/borrow/settle ──
const ENTRY_CFG = {
  lent:       { Icon: Icon.lendMoney,   color: "#f59e0b",        bg: "rgba(245,158,11,0.14)", label: "You Lent" },
  borrowed:   { Icon: Icon.borrowMoney, color: "#818cf8",        bg: "rgba(129,140,248,0.14)", label: "You Borrowed" },
  settlement: { Icon: Icon.settlement,  color: "var(--success)", bg: "rgba(16,185,129,0.14)", label: "Settlement" },
};

// ── Contact row ─────────────────────────────────────────────────────────
function ContactRow({ person, selected, onClick }) {
  const net = person.net_balance;
  const netColor = net > 0 ? "var(--warning)" : net < 0 ? "#818cf8" : "var(--text3)";
  const netLabel = net > 0 ? `Owes you ₹${fmt(Math.abs(net))}` : net < 0 ? `You owe ₹${fmt(Math.abs(net))}` : "Settled";

  return (
    <div className={`pp-contact-row ${selected ? "active" : ""}`} onClick={onClick}>
      <Avatar name={person.display_name} />
      <div className="pp-contact-info">
        <div className="pp-contact-name">{person.display_name}</div>
        <div className="pp-contact-sub" style={{ color: netColor }}>{netLabel}</div>
        {!!person.active_entries && (
          <div className="pp-contact-meta">{person.active_entries} active {person.active_entries === 1 ? "entry" : "entries"}</div>
        )}
      </div>
    </div>
  );
}

// ── Entry row ───────────────────────────────────────────────────────────
function EntryRow({ entry, onDelete }) {
  const isPending = entry.status === "pending";
  const cfg = ENTRY_CFG[entry.direction] || ENTRY_CFG.lent;
  const dateStr = entry.entry_date
    ? new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className={`pp-entry-row ${isPending ? "pending" : ""}`}>
      <div className="pp-entry-icon" style={{ background: cfg.bg }}>
        <cfg.Icon size={18} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-entry-title-row">
          <span className="pp-entry-title">{cfg.label}</span>
          {isPending && (
            <span className="pp-pill" style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning)" }}>
              <Icon.clockPending size={11} color="var(--warning)" /> Pending
            </span>
          )}
        </div>
        <div className="pp-entry-meta">{dateStr}{entry.note ? ` • ${entry.note}` : ""}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="pp-entry-amount" style={{ color: cfg.color }}>₹{fmt(entry.amount)}</div>
        {!isPending && entry.direction !== "settlement" && (
          <div className="pp-entry-progress" style={{ color: entry.status === "repaid" ? "var(--success)" : "var(--text3)" }}>
            {entry.status === "repaid" ? "Fully settled" : `₹${fmt(entry.remaining_amount)} left`}
          </div>
        )}
      </div>
      {entry.can_delete && entry.direction !== "settlement" && (
        <button className="pp-entry-del" onClick={onDelete} title="Delete entry">
          <Icon.trash size={15} />
        </button>
      )}
    </div>
  );
}

// ── Add Person modal ────────────────────────────────────────────────────
function AddPersonModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  function handleNameChange(v) {
    setName(v); setSelected(null); setError("");
    clearTimeout(timerRef.current);
    if (v.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await peopleApi.searchUsers(v.trim());
        setResults(r.data || []);
      } catch {
        setResults([]);
      }
    }, 350);
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      await peopleApi.createPerson({ display_name: name.trim(), linked_user_id: selected?.user_id || null });
      onSuccess();
      onClose();
    } catch (err) {
      setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to add person");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon.userPlus size={17} /> Add Person
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}><Icon.close size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NAME OR EMAIL</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Search or add custom…" autoFocus />
          </div>

          {results.length > 0 && !selected && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {results.map(u => (
                <div key={u.user_id} className="pp-search-result" onClick={() => { setName(u.name); setSelected(u); setResults([]); }}>
                  <Avatar name={u.name} size={28} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--success)", background: "rgba(16,185,129,0.08)", borderRadius: 7, padding: "8px 12px", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Icon.checkCircle size={14} color="var(--success)" /> Linked to a registered user — entries will need acknowledgement
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Add Person"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Entry modal ─────────────────────────────────────────────────────
function AddEntryModal({ personName, onClose, onSuccess }) {
  const [direction, setDirection] = useState("lent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(+amount) || +amount <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await onSuccess({ direction, amount: parseFloat(amount), note: note.trim() || null, entry_date: date });
      onClose();
    } catch (err) {
      setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to save");
      setSaving(false);
    }
  }

  const accent = direction === "lent" ? "#f59e0b" : "#818cf8";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title">Add Entry — {personName}</div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}><Icon.close size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="split-toggle">
            <button className={`split-opt ${direction === "lent" ? "on" : ""}`} onClick={() => setDirection("lent")} type="button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon.lendMoney size={15} /> I Lent
            </button>
            <button className={`split-opt ${direction === "borrowed" ? "on" : ""}`} onClick={() => setDirection("borrowed")} type="button" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon.borrowMoney size={15} /> I Borrowed
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">AMOUNT</label>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, paddingLeft: 12 }}>
              <span style={{ fontSize: 20, color: accent, fontWeight: 700 }}>₹</span>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00"
                style={{ border: "none", background: "transparent", fontSize: 22, fontWeight: 800, color: accent, paddingLeft: 6 }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">NOTE — optional</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Purpose, notes…" />
          </div>

          <button className="btn" style={{ background: accent, color: "#fff", fontWeight: 700, opacity: !amount || saving ? 0.5 : 1 }}
            onClick={handleSubmit} disabled={!amount || saving}>
            {saving ? "Saving…" : "Add Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────
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
  const [toast, setToast] = useState(null); // { message, type }

  function notify(message, type = "default") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const r = await peopleApi.getPeople();
      setPeople(r.data || []);
    } catch {
      notify("Couldn't load your contacts", "error");
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
      notify("Couldn't load this ledger", "error");
    } finally {
      setEntryLoading(false);
    }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => {
    if (selected) loadEntries(selected);
    else setEntries([]);
  }, [selected, loadEntries]);

  async function handleDeletePerson(personId, name) {
    if (!window.confirm(`Delete ${name} and all their entries? This can't be undone.`)) return;
    try {
      await peopleApi.deletePerson(personId);
      if (selected === personId) setSelected(null);
      notify(`${name} deleted`);
      loadPeople();
    } catch (err) {
      notify(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to delete", "error");
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await peopleApi.deleteEntry(entryId);
      notify("Entry deleted");
      loadEntries(selected);
      loadPeople();
    } catch (err) {
      notify(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to delete", "error");
    }
  }

  async function handleAddEntry(payload) {
    await peopleApi.addEntry(selected, payload);
    notify("Entry added");
    loadEntries(selected);
    loadPeople();
  }

  async function handleSettleUp() {
    if (!window.confirm("Mark all active entries as settled and bring the balance to ₹0?")) return;
    setSettling(true);
    try {
      await peopleApi.settleUp(selected);
      notify("Settled up");
      loadEntries(selected);
      loadPeople();
    } catch (err) {
      notify(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Failed to settle", "error");
    } finally {
      setSettling(false);
    }
  }

  const selectedPerson = people.find(p => p.person_id === selected);
  const net = selectedPerson?.net_balance ?? 0;

  const totalOwedToMe = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalIOwe = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  const filtered = search.trim() ? people.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase())) : people;
  const visibleEntries = entries.filter(e =>
    filterStatus === "all" ? true : filterStatus === "active" ? e.status === "active" : e.status === "repaid"
  );

  return (
    <>
      <style>{STYLES}</style>

      {toast && (
        <div className="pp-toast" style={{ borderColor: toast.type === "error" ? "rgba(239,68,68,0.3)" : "var(--border)" }}>
          {toast.type === "error" ? <Icon.close size={15} color="var(--danger)" /> : <Icon.checkCircle size={15} color="var(--success)" />}
          {toast.message}
        </div>
      )}

      <AppShell title="People">
        <div className="pp-shell">

          {/* ── Sidebar ── */}
          <div className="pp-sidebar">
            <div className="pp-sidebar-head">
              <div className="pp-sidebar-title-row">
                <div className="pp-sidebar-title">Contacts</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddPerson(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon.plus size={14} /> Add
                </button>
              </div>
              <div className="pp-search-wrap">
                <span className="pp-search-icon"><Icon.search size={15} /></span>
                <input className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" />
              </div>
            </div>

            <div className="pp-summary-strip">
              <div className="pp-summary-cell">
                <div className="pp-summary-label">Owed to You</div>
                <div className="pp-summary-val" style={{ color: "var(--warning)" }}>₹{fmt(totalOwedToMe)}</div>
              </div>
              <div className="pp-summary-cell">
                <div className="pp-summary-label">You Owe</div>
                <div className="pp-summary-val" style={{ color: "#818cf8" }}>₹{fmt(totalIOwe)}</div>
              </div>
            </div>

            <div className="pp-contact-list">
              {loading ? (
                <div style={{ padding: "16px 16px" }}>
                  {[0, 1, 2].map(i => <div key={i} className="pp-skel" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="pp-empty-list">
                  {search ? "No contacts match your search." : "No contacts yet — add someone to start tracking."}
                </div>
              ) : filtered.map(p => (
                <ContactRow
                  key={p.person_id}
                  person={p}
                  selected={selected === p.person_id}
                  onClick={() => { setSelected(p.person_id); setFilterStatus("all"); }}
                />
              ))}
            </div>
          </div>

          {/* ── Detail pane ── */}
          <div className="pp-detail">
            {selected && selectedPerson ? (
              <>
                <div className="pp-detail-head">
                  <div>
                    <div className="pp-profile-row">
                      <div className="pp-profile-avatar" style={{ background: colorForName(selectedPerson.display_name) }}>
                        {initialsFor(selectedPerson.display_name)}
                      </div>
                      <div>
                        <div className="pp-profile-name">{selectedPerson.display_name}</div>
                        <button className="pp-profile-del" onClick={() => handleDeletePerson(selectedPerson.person_id, selectedPerson.display_name)}>
                          <Icon.trash size={12} /> Delete contact
                        </button>
                      </div>
                    </div>
                    <div className="pp-net-row">
                      <div>
                        <div className="pp-net-label">Net Balance</div>
                        <div className="pp-net-val" style={{ color: net > 0 ? "var(--warning)" : net < 0 ? "#818cf8" : "var(--success)" }}>
                          {net > 0 ? `Owes you ₹${fmt(Math.abs(net))}` : net < 0 ? `You owe ₹${fmt(Math.abs(net))}` : "Settled up"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pp-detail-actions">
                    {net !== 0 && (
                      <button
                        className="btn"
                        style={{ background: net > 0 ? "rgba(245,158,11,0.15)" : "rgba(129,140,248,0.15)", color: net > 0 ? "var(--warning)" : "#818cf8", fontWeight: 700 }}
                        onClick={handleSettleUp}
                        disabled={settling}
                      >
                        {settling ? "Settling…" : "Settle Balance"}
                      </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowAddEntry(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon.plus size={14} /> Add Entry
                    </button>
                  </div>
                </div>

                <div className="pp-body">
                  <div className="pp-filter-tabs">
                    {[
                      { id: "all", label: `All (${entries.length})` },
                      { id: "active", label: `Active (${entries.filter(e => e.status === "active").length})` },
                      { id: "repaid", label: `Settled (${entries.filter(e => e.status === "repaid").length})` },
                    ].map(t => (
                      <button key={t.id} className={`pp-ftab ${filterStatus === t.id ? "active" : ""}`} onClick={() => setFilterStatus(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {entryLoading ? (
                    <div className="pp-entries">
                      {[0, 1, 2].map(i => <div key={i} className="pp-skel" style={{ height: 70, margin: 12, borderRadius: 8 }} />)}
                    </div>
                  ) : visibleEntries.length === 0 ? (
                    <div className="pp-empty-detail" style={{ height: "auto", padding: "60px 0" }}>
                      <div className="pp-empty-icon-circle"><Icon.sparkle size={26} color="var(--text3)" /></div>
                      {filterStatus === "all" ? "No entries yet — add one to start tracking." : `No ${filterStatus} entries.`}
                    </div>
                  ) : (
                    <div className="pp-entries">
                      {visibleEntries.map(e => (
                        <EntryRow key={e.entry_id} entry={e} onDelete={() => handleDeleteEntry(e.entry_id)} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="pp-empty-detail">
                <div className="pp-empty-icon-circle"><Icon.users size={26} color="var(--text3)" /></div>
                Select a contact to view their ledger
              </div>
            )}
          </div>
        </div>

        {showAddPerson && <AddPersonModal onClose={() => setShowAddPerson(false)} onSuccess={loadPeople} />}
        {showAddEntry && selected && (
          <AddEntryModal personName={selectedPerson?.display_name || ""} onClose={() => setShowAddEntry(false)} onSuccess={handleAddEntry} />
        )}
      </AppShell>
    </>
  );
}