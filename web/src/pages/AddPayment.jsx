// --- web/src/pages/AddPayment.jsx ---

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";

export default function AddPayment() {
  const { id }  = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ payer_id: String(user.user_id), payee_id: "", amount: "", note: "", payment_date: today });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  useEffect(() => { api.get(`/groups/${id}/members`).then(r => setMembers(r.data)); }, [id]);

  const payerName = members.find(m => m.user_id === parseInt(form.payer_id))?.name || "";
  const payeeName = members.find(m => m.user_id === parseInt(form.payee_id))?.name || "";

  async function onSubmit(e) {
    e.preventDefault(); setError("");
    if (parseInt(form.payer_id) === parseInt(form.payee_id)) { setError("Payer and receiver must be different."); return; }
    setLoading(true);
    try {
      await api.post(`/payments/${id}`, {
        payer_id: parseInt(form.payer_id), payee_id: parseInt(form.payee_id),
        amount: parseFloat(form.amount), note: form.note.trim() || null, payment_date: form.payment_date,
      });
      navigate(`/groups/${id}`);
    } catch (err) { setError(err.response?.data?.detail || "Failed."); }
    finally { setLoading(false); }
  }

  return (
    <AppShell title="Record Payment">
      <button className="back-btn mb-4" onClick={() => navigate(`/groups/${id}`)}>← Back to Group</button>

      <div style={{ maxWidth: 520 }}>
        {/* Preview */}
        {form.payer_id && form.payee_id && form.amount && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "16px 18px", marginBottom: 20, fontSize: 16, textAlign: "center" }}>
            <strong>{payerName}</strong>
            <span style={{ color: "var(--text3)", margin: "0 10px" }}>pays</span>
            <strong style={{ color: "var(--success)" }}>₹{parseFloat(form.amount).toLocaleString("en-IN")}</strong>
            <span style={{ color: "var(--text3)", margin: "0 10px" }}>to</span>
            <strong>{payeeName}</strong>
          </div>
        )}

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={onSubmit}>
          <div className="card card-p">
            <div className="form-group">
              <label className="form-label">Who paid (sender)</label>
              <select value={form.payer_id} onChange={e => set("payer_id", e.target.value)}>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Paid to (receiver)</label>
              <select required value={form.payee_id} onChange={e => set("payee_id", e.target.value)}>
                <option value="">Select receiver…</option>
                {members.filter(m => m.user_id !== parseInt(form.payer_id))
                  .map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" required min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => set("amount", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" required value={form.payment_date} onChange={e => set("payment_date", e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Note <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text3)" }}>— optional</span></label>
              <input placeholder="e.g. via GPay, cash…" value={form.note} onChange={e => set("note", e.target.value)} />
            </div>
          </div>

          <button className="btn btn-success btn-xl w-full mt-4" style={{ justifyContent: "center" }} disabled={loading}>
            {loading ? "Recording…" : "Record Payment →"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}