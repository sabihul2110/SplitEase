// --- web/src/pages/admin/AdminTransactions.jsx ---

import { useState, useEffect } from "react";
import api from "../../api/axios";

export default function AdminTransactions() {
  const [groups,   setGroups]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get("/groups/all").then(async r => {
      setGroups(r.data);
      const all = [];
      await Promise.all(r.data.map(async g => {
        try {
          // Admin uses their own user_id; backend checks membership OR admin bypass
          const e = await api.get(`/expenses/${g.group_id}`);
          e.data.forEach(x => all.push({ ...x, group_name: g.group_name }));
        } catch {}
      }));
      all.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
      setExpenses(all);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Transactions</div>
        <div className="page-sub">{expenses.length} total expenses across all groups</div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Group</th><th>Description</th>
                <th>Paid By</th><th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th><th>Split</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 32 }}>No transactions yet.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.expense_id}>
                  <td style={{ color: "var(--text3)", fontSize: 13 }}>
                    {new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td style={{ color: "var(--text2)" }}>{e.group_name}</td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td style={{ color: "var(--text2)" }}>{e.payer_name}</td>
                  <td><span className="tag">{e.subcategory_name || e.category_name}</span></td>
                  <td className="td-num" style={{ textAlign: "right" }}>
                    ₹{Number(e.total_amount).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`badge ${e.split_type === "equal" ? "badge-success" : "badge-primary"}`}>
                      {e.split_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}