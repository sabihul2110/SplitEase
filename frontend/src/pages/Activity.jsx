// --- frontend/src/pages/Activity.jsx ---

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";

export default function Activity() {
  const navigate = useNavigate();
  const [groups,   setGroups]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get("/groups/").then(async r => {
      setGroups(r.data);
      // Load all expenses + payments from all groups
      const allExp = [], allPay = [];
      await Promise.all(r.data.map(async g => {
        try {
          const [e, p] = await Promise.all([
            api.get(`/expenses/${g.group_id}`),
            api.get(`/payments/${g.group_id}`),
          ]);
          e.data.forEach(x => allExp.push({ ...x, group_name: g.group_name, group_id: g.group_id }));
          p.data.forEach(x => allPay.push({ ...x, group_name: g.group_name, group_id: g.group_id }));
        } catch {}
      }));
      setExpenses(allExp); setPayments(allPay);
    }).finally(() => setLoading(false));
  }, []);

  // Combine + sort by date desc
  const feed = [
    ...expenses.map(e => ({ type: "expense", date: e.expense_date, key: `e-${e.expense_id}`, ...e })),
    ...payments.map(p => ({ type: "payment", date: p.payment_date, key: `p-${p.payment_id}`, ...p })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by date
  const grouped = {};
  feed.forEach(item => {
    const d = item.date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(item);
  });

  const dateLabel = d => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <AppShell title="Activity">
      {loading ? (
        <div className="loading"><div className="spinner" />Loading activity…</div>
      ) : feed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">◷</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No activity yet</div>
            <div style={{ fontSize: 14, color: "var(--text2)" }}>Expenses and payments will appear here.</div>
          </div>
        </div>
      ) : (
        <div className="card">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{ padding: "12px 20px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>
                  {dateLabel(date)}
                </span>
              </div>

              {/* Items */}
              {items.map((item, i) => (
                <div
                  key={item.key}
                  className="activity-item"
                  style={{ padding: "14px 20px", cursor: "pointer", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}
                  onClick={() => navigate(`/groups/${item.group_id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Dot */}
                    <div className={`activity-dot ${item.type === "expense" ? "activity-dot-blue" : "activity-dot-green"}`} style={{ marginTop: 0, flexShrink: 0 }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                        {item.type === "expense" ? (
                          <>
                            <strong>{item.payer_name}</strong>
                            <span style={{ color: "var(--text2)" }}> added </span>
                            <strong>{item.split_type}</strong>
                            <span style={{ color: "var(--text2)" }}> expense </span>
                            <strong>{item.description}</strong>
                            <span style={{ color: "var(--text2)" }}> in </span>
                            <strong>{item.group_name}</strong>
                          </>
                        ) : (
                          <>
                            <strong>{item.payer_name}</strong>
                            <span style={{ color: "var(--text2)" }}> paid </span>
                            <strong>{item.payee_name}</strong>
                            <span style={{ color: "var(--text2)" }}> in </span>
                            <strong>{item.group_name}</strong>
                            {item.note && <span style={{ color: "var(--text3)" }}> · {item.note}</span>}
                          </>
                        )}
                      </div>
                      <div className="activity-time" style={{ marginTop: 3 }}>
                        <span className="tag" style={{ fontSize: 11 }}>{item.category_name || "Payment"}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className={`activity-amt ${item.type === "payment" ? "c-success" : ""}`}>
                      ₹{Number(item.total_amount || item.amount).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}