// --- frontend/src/pages/AddExpense.jsx ---

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";

export default function AddExpense() {
  const { id }  = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members,    setMembers]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcats,    setSubcats]    = useState([]);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    payer_id: String(user.user_id), category_id: "", subcategory_id: "",
    total_amount: "", description: "", split_type: "equal", expense_date: today,
  });
  const [custom, setCustom] = useState({});

  useEffect(() => {
    Promise.all([api.get(`/groups/${id}/members`), api.get("/groups/categories")])
      .then(([m, c]) => {
        setMembers(m.data); setCategories(c.data);
        const init = {}; m.data.forEach(x => { init[x.user_id] = ""; }); setCustom(init);
      });
  }, [id]);

  async function onCat(e) {
    const cid = e.target.value;
    setForm(f => ({...f, category_id: cid, subcategory_id: ""}));
    setSubcats(cid ? (await api.get(`/groups/subcategories/${cid}`)).data : []);
  }

  const total = parseFloat(form.total_amount || 0);
  const n     = members.length || 1;
  const share = total / n;
  const customSum = members.reduce((s, m) => s + parseFloat(custom[m.user_id] || 0), 0);
  const balanced  = form.split_type === "equal" ? true : Math.abs(customSum - total) < 0.02;

  function buildSplits() {
    if (form.split_type === "equal")
      return members.map(m => ({ user_id: m.user_id, amount_owed: parseFloat(share.toFixed(2)), share_pct: null }));
    return members.map(m => ({
      user_id: m.user_id, amount_owed: parseFloat(custom[m.user_id] || 0),
      share_pct: total ? parseFloat(((parseFloat(custom[m.user_id]||0)/total)*100).toFixed(2)) : null,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault(); setError("");
    if (!balanced) { setError(`Amounts must sum to ₹${total.toFixed(2)} (current: ₹${customSum.toFixed(2)})`); return; }
    setLoading(true);
    try {
      await api.post(`/expenses/${id}`, {
        ...form, payer_id: parseInt(form.payer_id), category_id: parseInt(form.category_id),
        subcategory_id: form.subcategory_id ? parseInt(form.subcategory_id) : null,
        total_amount: total, splits: buildSplits(),
      });
      navigate(`/groups/${id}`);
    } catch (err) { setError(err.response?.data?.detail || "Failed."); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const payerName = members.find(m => m.user_id === parseInt(form.payer_id))?.name || "You";

  return (
    <AppShell title="Add Expense">
      <button className="back-btn mb-4" onClick={() => navigate(`/groups/${id}`)}>
        ← Back to Group
      </button>

      {error && <div className="alert alert-error mb-4">⚠ {error}</div>}

      {/* Split screen layout */}
      <div className="form-split">
        {/* ── LEFT: Form ── */}
        <div>
          {/* Amount — big input */}
          <div className="card card-p mb-4">
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 10 }}>
              Total Amount
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, color: "var(--text3)" }}>₹</span>
              <input
                className="input-amount" type="number" required min="0.01" step="0.01"
                placeholder="0.00" value={form.total_amount}
                onChange={e => set("total_amount", e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="form-label mb-2">What was this for?</div>
              <input required value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g. Hotel booking, Dinner…" />
            </div>
          </div>

          {/* Details */}
          <div className="card card-p mb-4">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Details</div>
            <div className="form-group">
              <label className="form-label">Who paid?</label>
              <select value={form.payer_id} onChange={e => set("payer_id", e.target.value)}>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select required value={form.category_id} onChange={onCat}>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subcategory</label>
                <select value={form.subcategory_id} onChange={e => set("subcategory_id", e.target.value)} disabled={subcats.length === 0}>
                  <option value="">None</option>
                  {subcats.map(s => <option key={s.subcategory_id} value={s.subcategory_id}>{s.subcategory_name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" required value={form.expense_date} onChange={e => set("expense_date", e.target.value)} />
            </div>
          </div>

          {/* Split strategy */}
          <div className="card card-p">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Split Strategy</div>
            <div className="split-toggle mb-4">
              {["equal", "custom"].map(t => (
                <button key={t} type="button" className={`split-opt ${form.split_type === t ? "on" : ""}`}
                  onClick={() => set("split_type", t)}>
                  {t === "equal" ? "Equal" : "Custom"}
                </button>
              ))}
            </div>

            {form.split_type === "custom" && (
              <div>
                {members.map(m => (
                  <div key={m.user_id} className="form-group">
                    <label className="form-label">{m.name}</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={custom[m.user_id]}
                      onChange={e => setCustom(a => ({...a, [m.user_id]: e.target.value}))} />
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)" }}>
                  <span>Sum: <strong className="td-num">₹{customSum.toFixed(2)}</strong></span>
                  <span>Target: <strong className="td-num">₹{total.toFixed(2)}</strong></span>
                  {balanced && total > 0 && <span style={{ color: "var(--success)" }}>✓ Matches</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div className="card">
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Split Summary</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Live preview of allocations</div>
            </div>

            {/* Member shares */}
            <div style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>Member</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>Share</span>
              </div>

              {members.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text3)", padding: "12px 0" }}>Loading members…</div>
              ) : (
                members.map(m => {
                  const isPayer = m.user_id === parseInt(form.payer_id);
                  const amt = form.split_type === "equal"
                    ? (total ? share : 0)
                    : parseFloat(custom[m.user_id] || 0);
                  const pct = total ? ((amt / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={m.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: isPayer ? "var(--success)" : "var(--danger)", marginTop: 2 }}>
                          {isPayer ? `Paid ₹${total.toFixed(2)}` : `Owes ₹${amt.toFixed(2)}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="td-num" style={{ fontSize: 15, fontWeight: 700 }}>₹{amt.toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{pct}%</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total + submit */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>Total Allocated</span>
                <span className="td-num" style={{ fontSize: 18, fontWeight: 800 }}>₹{total.toFixed(2)}</span>
              </div>
              {balanced && total > 0 && (
                <div style={{ fontSize: 12, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                  <span>●</span> Matches total
                </div>
              )}
              <button
                className="btn btn-primary btn-lg w-full"
                style={{ justifyContent: "center", marginTop: 4 }}
                disabled={loading || !balanced || !total}
                onClick={onSubmit}
              >
                {loading ? "Recording…" : "Record Expense →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}