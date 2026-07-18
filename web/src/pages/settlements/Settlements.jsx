// web/src/pages/settlements/Settlements.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGroups } from "../../api/groups";
import * as peopleApi from "../../api/people";
import { getSettlements, getSimplified } from "../../api/settlements";
import { Icons } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });


const Card = ({ children, style }) => (
  <div style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    ...style
  }}>
    {children}
  </div>
);

export default function Settlements() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tab, setTab] = useState("groups"); // groups | personal
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  
  const [simple, setSimple] = useState([]);
  const [raw, setRaw] = useState([]);
  
  const [gLoading, setGLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [pLoading, setPLoading] = useState(false);

  useEffect(() => {
    getGroups()
      .then(r => {
        setGroups(r.data || []);
        if (r.data?.length) selectGroup(r.data[0].group_id);
      })
      .finally(() => setGLoading(false));
    loadPeople();
  }, []);

  async function selectGroup(gid) {
    setSelected(gid);
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getSimplified(gid), getSettlements(gid)]);
      setSimple(s.data || []); 
      setRaw(r.data || []);
    } catch { 
      setSimple([]); 
      setRaw([]); 
    } finally { 
      setLoading(false); 
    }
  }

  async function loadPeople() {
    setPLoading(true);
    try { 
      const r = await peopleApi.getPeople(); 
      setPeople(r.data || []); 
    } catch { 
      setPeople([]); 
    } finally { 
      setPLoading(false); 
    }
  }

  const selectedGroup = groups.find(g => g.group_id === selected);
  const peopleWithBalance = people.filter(p => Math.abs(p.net_balance) > 0.005);
  
  const totalOwed = people.reduce((s, p) => p.net_balance > 0 ? s + p.net_balance : s, 0);
  const totalOwe = people.reduce((s, p) => p.net_balance < 0 ? s + Math.abs(p.net_balance) : s, 0);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 48px" }}>
      
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: "0 0 8px 0" }}>
            Settlements
          </h1>
          <p style={{ fontSize: 15, color: "var(--text2)", margin: 0 }}>
            Manage and resolve all outstanding balances.
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: "flex", gap: 32, borderBottom: "1px solid var(--border)", marginBottom: 32 }}>
        {[
          { id: "groups", label: "Group Settlements" },
          { id: "personal", label: "Personal Ledger" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ 
              padding: "0 0 12px 0", fontSize: 15, fontWeight: tab === t.id ? 700 : 500, 
              fontFamily: "inherit", cursor: "pointer", border: "none", background: "transparent",
              color: tab === t.id ? "var(--text)" : "var(--text2)",
              borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
              marginBottom: -1, transition: "all 0.2s ease" 
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* GROUP SETTLEMENTS VIEW                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      {tab === "groups" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Horizontal Group Selector (Replaces the inner left sidebar) */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {gLoading ? (
               <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading groups...</div>
            ) : groups.length === 0 ? (
               <div style={{ color: "var(--text3)", fontSize: 14 }}>You are not part of any active groups.</div>
            ) : (
              groups.map(g => (
                <button key={g.group_id} onClick={() => selectGroup(g.group_id)}
                  style={{
                    padding: "10px 20px", borderRadius: 999, border: "1px solid",
                    fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s ease", cursor: "pointer",
                    background: selected === g.group_id ? "var(--primary)" : "var(--surface)",
                    borderColor: selected === g.group_id ? "var(--primary)" : "var(--border)",
                    color: selected === g.group_id ? "#fff" : "var(--text2)",
                    boxShadow: selected === g.group_id ? "0 4px 12px rgba(37,99,235,0.3)" : "none"
                  }}>
                  {g.group_name}
                </button>
              ))
            )}
          </div>

          {selectedGroup && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 16 }}>
              
              {/* Active Group Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                  {selectedGroup.group_name} Overview
                </h2>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => selectGroup(selected)}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Refresh
                  </button>
                  <button onClick={() => navigate(`/groups/${selected}`)}
                    style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    View Group
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text3)" }}>Calculating optimal settlements...</div>
              ) : (
                <>
                  {/* Actionable Settlements */}
                  <div>
                    <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 16 }}>
                      Required Transfers
                    </h3>
                    
                    {simple.length === 0 ? (
                      <Card>
                        <EmptyState 
                          icon={Icons.check}
                          title="All Settled Up"
                          subtitle={`No outstanding balances remain in ${selectedGroup.group_name}.`}
                        />
                      </Card>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                        {simple.map((s, i) => {
                          const isMePaying = s.from?.trim() === user?.name?.trim();
                          return (
                            <Card key={i} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <Avatar name={s.from} size={36} />
                                  <Icons.settlement size={18} style={{ color: "var(--text3)" }} />
                                  <Avatar name={s.to} size={36} />
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" }}>Amount</div>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                                    ₹{Number(s.amount).toLocaleString("en-IN")}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", padding: "12px 16px", borderRadius: 8 }}>
                                <span style={{ fontSize: 14, color: "var(--text2)" }}>
                                  <strong style={{ color: "var(--text)" }}>{s.from}</strong> owes <strong style={{ color: "var(--text)" }}>{s.to}</strong>
                                </span>
                                {isMePaying && s.to_upi_id && (
                                  <a href={`upi://pay?pa=${s.to_upi_id}&am=${s.amount}&cu=INR&tn=SplitEase`}
                                    target="_blank" rel="noreferrer"
                                    style={{ 
                                      background: "var(--primary)", color: "#fff", textDecoration: "none", 
                                      fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 6 
                                    }}>
                                    Pay UPI
                                  </a>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Net Balances List (Replaces the raw table) */}
                  {raw.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 16 }}>
                        Member Ledger
                      </h3>
                      <Card>
                        {raw.map((s, i) => {
                          const net = Number(s.net_balance);
                          const isPositive = net > 0;
                          const isNegative = net < 0;
                          
                          return (
                            <div key={i} style={{ 
                              display: "flex", alignItems: "center", justifyContent: "space-between", 
                              padding: "16px 20px", borderBottom: i !== raw.length - 1 ? "1px solid var(--border)" : "none",
                              transition: "background 0.2s ease"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <Avatar name={s.user_name} />
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{s.user_name}</div>
                                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                                    Paid ₹{Number(s.total_paid).toLocaleString("en-IN")} • Owed ₹{Number(s.total_owed).toLocaleString("en-IN")}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ 
                                  display: "inline-block", padding: "6px 12px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                                  background: isPositive ? "rgba(16,185,129,0.1)" : isNegative ? "rgba(239,68,68,0.1)" : "var(--surface2)",
                                  color: isPositive ? "var(--success)" : isNegative ? "var(--danger)" : "var(--text2)"
                                }}>
                                  {isPositive ? "+" : ""}₹{Math.abs(net).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* PERSONAL LEDGER VIEW                                      */}
      {/* ───────────────────────────────────────────────────────── */}
      {tab === "personal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          
          {/* Hero Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card style={{ padding: 24, borderLeft: "4px solid var(--warning)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
                Total Owed to You
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}>
                ₹{fmt(totalOwed)}
              </div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 8 }}>
                From {people.filter(p => p.net_balance > 0).length} contacts
              </div>
            </Card>

            <Card style={{ padding: 24, borderLeft: "4px solid var(--primaryH)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 8 }}>
                Total You Owe
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--primaryH)", fontVariantNumeric: "tabular-nums" }}>
                ₹{fmt(totalOwe)}
              </div>
              <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 8 }}>
                To {people.filter(p => p.net_balance < 0).length} contacts
              </div>
            </Card>
          </div>

          {/* Contact List */}
          <div>
            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 16 }}>
              Individual Balances
            </h3>
            
            {pLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text3)" }}>Loading ledger...</div>
            ) : peopleWithBalance.length === 0 ? (
              <Card>
                <EmptyState 
                  icon={Icons.check}
                  title="Zero Balances"
                  subtitle="You have no outstanding debts or loans with any individual contacts."
                />
              </Card>
            ) : (
              <Card>
                {peopleWithBalance.map((p, i) => {
                  const net = p.net_balance;
                  const isOwed = net > 0;
                  
                  return (
                    <div key={p.person_id} style={{ 
                      display: "flex", alignItems: "center", justifyContent: "space-between", 
                      padding: "20px", borderBottom: i !== peopleWithBalance.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Avatar name={p.display_name} size={48} />
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{p.display_name}</div>
                          {p.active_entries > 0 && (
                            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
                              {p.active_entries} active {p.active_entries === 1 ? "entry" : "entries"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                            {isOwed ? "Gets You" : "You Owe"}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: isOwed ? "var(--warning)" : "var(--primaryH)" }}>
                            ₹{fmt(Math.abs(net))}
                          </div>
                        </div>
                        
                        <button onClick={() => navigate(`/loans`)}
                          style={{ 
                            width: 36, height: 36, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)", 
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text2)",
                            transition: "all 0.2s ease" 
                          }}>
                          <Icons.chevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}