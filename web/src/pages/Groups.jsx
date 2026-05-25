// --- frontend/src/pages/Groups.jsx ---
// v7: Fix isEmpty (wrong sRows check), fix members-bulk 404, fix memberCount=0

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import { getGroupIcon } from "../utils/GroupIcons";

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0;transform:scale(0.97) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes pulseRing { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.9);opacity:0} }
  @keyframes dotBreath { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  .gs-root { font-family:'DM Sans',sans-serif; }
  .gs-mono { font-family:'DM Mono',monospace; }
  .skel { display:block; border-radius:6px; background:linear-gradient(90deg,var(--surface2) 0px,var(--surface3) 150px,var(--surface2) 300px); background-size:600px 100%; animation:shimmer 1.6s ease-in-out infinite; }
  .gs-card { position:relative; border-radius:18px; border:1px solid var(--border); padding:24px 26px 22px; background:var(--surface); overflow:hidden; transition:border-color 0.2s,box-shadow 0.2s,transform 0.2s; animation:fadeUp 0.4s ease both; }
  .gs-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.18); }
  .gs-card.card-net:hover { border-color:rgba(99,102,241,0.4); }
  .gs-card.card-owe:hover { border-color:rgba(239,68,68,0.35); }
  .gs-card.card-owed:hover { border-color:rgba(16,185,129,0.35); }
  .gs-card.card-total:hover { border-color:rgba(148,163,184,0.5); }
  .gs-card .accent-bar { position:absolute; top:0; left:0; right:0; height:2px; border-radius:18px 18px 0 0; }
  .gs-summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .gc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:20px; }
  .gc { position:relative; border-radius:20px; border:1px solid var(--border); background:var(--surface); padding:0; cursor:pointer; display:flex; flex-direction:column; min-height:230px; transition:border-color 0.22s,box-shadow 0.22s,transform 0.22s; animation:fadeUp 0.4s ease both; overflow:hidden; }
  .gc:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,0.28); }
  .gc.state-owed:hover { border-color:rgba(16,185,129,0.45); }
  .gc.state-owe:hover { border-color:rgba(239,68,68,0.4); }
  .gc.state-settled:hover { border-color:rgba(100,116,139,0.4); }
  .gc.state-empty:hover { border-color:rgba(99,102,241,0.35); }
  .gc-inner { padding:22px 22px 18px; display:flex; flex-direction:column; flex:1; }
  .gc-stripe { height:3px; width:100%; flex-shrink:0; border-radius:20px 20px 0 0; }
  .gc.state-owed .gc-stripe { background:linear-gradient(90deg,#10b981,#34d399); }
  .gc.state-owe .gc-stripe { background:linear-gradient(90deg,#ef4444,#f87171); }
  .gc.state-settled .gc-stripe { background:linear-gradient(90deg,#475569,#64748b); }
  .gc.state-empty .gc-stripe { background:linear-gradient(90deg,#475569,#64748b); }
  .gc.state-loading .gc-stripe { background:var(--surface3); }
  .gc-badge { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 10px; border-radius:20px; white-space:nowrap; }
  .gc-badge-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; position:relative; }
  .gc-badge-dot.pulse::after { content:''; position:absolute; inset:-2px; border-radius:50%; background:currentColor; animation:pulseRing 1.6s ease-out infinite; }
  .gc-badge.state-owed { background:rgba(16,185,129,0.12); color:#34d399; }
  .gc-badge.state-owed .gc-badge-dot { background:#10b981; animation:dotBreath 2.5s ease-in-out infinite; }
  .gc-badge.state-owe { background:rgba(239,68,68,0.12); color:#f87171; }
  .gc-badge.state-owe .gc-badge-dot { background:#ef4444; animation:dotBreath 1.8s ease-in-out infinite; }
  .gc-badge.state-settled { background:rgba(100,116,139,0.12); color:#94a3b8; }
  .gc-badge.state-settled .gc-badge-dot { background:#64748b; }
  .gc-badge.state-empty { background:rgba(99,102,241,0.12); color:#a5b4fc; }
  .gc-badge.state-empty .gc-badge-dot { background:#6366f1; animation:dotBreath 3s ease-in-out infinite; }
  .gc-badge.state-loading { background:var(--surface3); color:var(--text3); }
  .gc-badge.state-loading .gc-badge-dot { background:var(--text3); }
  .gc-avatars { display:flex; align-items:center; }
  .gc-avatar { width:28px; height:28px; border-radius:50%; border:2px solid var(--surface); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; margin-left:-7px; flex-shrink:0; }
  .gc-avatar:first-child { margin-left:0; }
  .gc-avatar-more { background:var(--surface3); color:var(--text2); border-color:var(--surface); font-size:9px; }
  .gc-balance-value { font-family:'DM Mono',monospace; font-size:30px; font-weight:500; letter-spacing:-0.03em; line-height:1; animation:fadeUp 0.3s ease both; }
  .gc-footer { margin-top:auto; padding-top:16px; display:flex; gap:8px; position:relative; }
  .gc-btn { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px; height:36px; border-radius:10px; font-size:12.5px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; border:none; text-decoration:none; transition:all 0.15s; white-space:nowrap; }
  .gc-btn:active { transform:scale(0.96); }
  .gc-btn.ghost { background:var(--surface2); color:var(--text2); border:1px solid var(--border); }
  .gc-btn.ghost:hover { background:var(--surface3); color:var(--text); border-color:var(--border2); }
  .gc-btn.settle { background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; box-shadow:0 2px 10px rgba(16,185,129,0.25); }
  .gc-btn.settle:hover { box-shadow:0 4px 18px rgba(16,185,129,0.4); filter:brightness(1.08); }
  .gc-btn.remind { background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.28); }
  .gc-btn.remind:hover { background:rgba(245,158,11,0.22); }
  .gc-btn.add-expense { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none; box-shadow:0 2px 10px rgba(99,102,241,0.25); }
  .gc-btn.add-expense:hover { box-shadow:0 4px 18px rgba(99,102,241,0.4); filter:brightness(1.08); }
  .gc-btn.settled-ok { background:var(--surface2); color:var(--text3); border:1px solid var(--border); cursor:default; }
  .gc-new { border-radius:20px; border:2px dashed var(--border2); background:transparent; padding:24px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:230px; gap:14px; transition:border-color 0.18s,background 0.18s; animation:fadeUp 0.4s ease both; }
  .gc-new:hover { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.04); }
  .gc-new-icon { width:52px; height:52px; border-radius:50%; background:var(--surface2); border:1px solid var(--border2); display:flex; align-items:center; justify-content:center; color:var(--text2); transition:background 0.15s,color 0.15s; }
  .gc-new:hover .gc-new-icon { background:rgba(99,102,241,0.14); color:#818cf8; border-color:rgba(99,102,241,0.35); }
  .gf-tabs { display:flex; gap:3px; background:var(--surface2); padding:4px; border-radius:11px; border:1px solid var(--border); }
  .gf-tab { padding:6px 18px; border-radius:8px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; border:none; transition:all 0.15s; background:transparent; color:var(--text2); }
  .gf-tab:hover { color:var(--text); }
  .gf-tab.active { background:var(--surface); color:var(--text); box-shadow:0 1px 8px rgba(0,0,0,0.25); }
  .gf-tab-count { display:inline-flex; align-items:center; justify-content:center; min-width:16px; height:16px; background:var(--surface3); color:var(--text3); font-size:9px; font-weight:700; border-radius:20px; padding:0 4px; margin-left:5px; font-family:'DM Mono',monospace; }
  .gf-tab.active .gf-tab-count { background:rgba(99,102,241,0.2); color:#818cf8; }
  .gf-search-wrap { position:relative; flex:1; min-width:180px; max-width:320px; }
  .gf-search-wrap input { width:100%; padding:9px 14px 9px 38px; border-radius:11px; border:1px solid var(--border); background:var(--surface2); color:var(--text); font-size:13.5px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
  .gf-search-wrap input:focus { border-color:rgba(99,102,241,0.5); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
  .gf-search-wrap input::placeholder { color:var(--text3); }
  .gf-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); display:flex; pointer-events:none; }
  .gf-search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:var(--surface3); border:none; color:var(--text3); cursor:pointer; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; transition:background 0.12s,color 0.12s; }
  .gf-search-clear:hover { background:var(--border2); color:var(--text); }
  .gf-sort { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; border:1px solid var(--border); background:var(--surface2); font-size:13px; font-weight:500; color:var(--text2); white-space:nowrap; }
  .gf-sort select { background:none; border:none; outline:none; color:var(--text); font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; padding:0; }
  .g-remind-popover { position:absolute; bottom:calc(100% + 10px); right:0; width:270px; background:var(--surface); border:1px solid var(--border2); border-radius:14px; box-shadow:0 16px 52px rgba(0,0,0,0.55); z-index:400; overflow:hidden; animation:fadeIn 0.15s ease both; }
  .g-remind-head { padding:12px 14px; border-bottom:1px solid var(--border); font-size:11px; font-weight:700; color:var(--text3); letter-spacing:0.08em; text-transform:uppercase; display:flex; align-items:center; justify-content:space-between; }
  .g-remind-row { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; gap:8px; border-bottom:1px solid var(--border); transition:background 0.1s; }
  .g-remind-row:last-child { border-bottom:none; }
  .g-remind-row:hover { background:var(--surface2); }
  .g-remind-btn-sm { font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; padding:4px 12px; border-radius:7px; border:1px solid rgba(245,158,11,0.35); background:rgba(245,158,11,0.10); color:#f59e0b; cursor:pointer; transition:all 0.12s; flex-shrink:0; }
  .g-remind-btn-sm:hover { background:rgba(245,158,11,0.22); }
  .g-remind-btn-sm:disabled { opacity:0.4; cursor:not-allowed; }
  .g-remind-btn-sm.sent { background:rgba(16,185,129,0.10); color:#10b981; border-color:rgba(16,185,129,0.3); }
  .gs-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:72px 24px; gap:12px; animation:fadeUp 0.4s ease both; }
  .gs-empty-icon { width:64px; height:64px; border-radius:18px; background:var(--surface2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--text3); margin-bottom:4px; }
  .gs-error-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:12px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#f87171; font-size:13px; font-weight:500; margin-bottom:20px; animation:slideDown 0.25s ease both; }
  .gs-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:24px; flex-wrap:wrap; }
  .gs-page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:28px; animation:fadeUp 0.3s ease both; }
`;

const Icon = {
  check:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  plus:    (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:  (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  users:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:    (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  eye:     (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  trend:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  info:    (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  x:       (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  sort:    (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  chevD:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  spark:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>,
  alert:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  refresh: (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  layers:  (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  wallet:  (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
  down:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  up:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
};

const AVATAR_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f472b6","#6366f1"];
function avatarColor(name="") { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function fmt(n,d=2) { return Number(n).toLocaleString("en-IN",{minimumFractionDigits:d,maximumFractionDigits:d}); }

function SummaryBar({ totalGroups, youOwe, owedToYou, loading, thisMonth }) {
  const net = owedToYou - youOwe;
  const cards = [
    { key:"total", label:"Total Groups", cls:"card-total", accent:"linear-gradient(90deg,#475569,#94a3b8)", icon:Icon.layers(18), value:String(totalGroups), prefix:"", mono:false, valueColor:"var(--text)", valueSz:40, sub: thisMonth>0?{icon:Icon.trend(11),text:`+${thisMonth} this month`,color:"var(--success)"}:{icon:null,text:"No new groups this month",color:"var(--text3)"} },
    { key:"net", label:"Net Balance", cls:"card-net", accent:net>0?"linear-gradient(90deg,#10b981,#34d399)":net<0?"linear-gradient(90deg,#ef4444,#f87171)":"linear-gradient(90deg,#475569,#94a3b8)", icon:Icon.wallet(18), value:net===0?"0.00":fmt(Math.abs(net)), prefix:net>0?"+₹":net<0?"−₹":"₹", mono:true, valueColor:net>0?"var(--success)":net<0?"var(--danger)":"var(--text2)", valueSz:32, sub:{icon:Icon.info(11),text:"Updates in real-time",color:"var(--text3)"} },
    { key:"owe", label:"You Owe", cls:"card-owe", accent:youOwe>0?"linear-gradient(90deg,#ef4444,#f87171)":"linear-gradient(90deg,#475569,#94a3b8)", icon:Icon.down(18), value:fmt(youOwe), prefix:"₹", mono:true, valueColor:youOwe>0?"var(--danger)":"var(--text2)", valueSz:32, sub:youOwe>0?{icon:null,text:"Pending settlement",color:"var(--danger)"}:{icon:Icon.check(11),text:"All clear",color:"var(--success)"} },
    { key:"owed", label:"You Are Owed", cls:"card-owed", accent:owedToYou>0?"linear-gradient(90deg,#10b981,#34d399)":"linear-gradient(90deg,#475569,#94a3b8)", icon:Icon.up(18), value:fmt(owedToYou), prefix:"₹", mono:true, valueColor:owedToYou>0?"var(--success)":"var(--text2)", valueSz:32, sub:owedToYou>0?{icon:Icon.trend(11),text:"Collect from members",color:"var(--success)"}:{icon:null,text:"All settled up",color:"var(--text3)"} },
  ];
  return (
    <div className="gs-summary-grid">
      {cards.map((c,i) => (
        <div key={c.key} className={`gs-card ${c.cls}`} style={{animationDelay:`${i*0.07}s`}}>
          <div className="accent-bar" style={{background:c.accent}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:"var(--text3)"}}>{c.label}</div>
            <div style={{width:32,height:32,borderRadius:9,background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text3)"}}>{c.icon}</div>
          </div>
          {loading ? <span className="skel" style={{width:"65%",height:c.key==="total"?44:36,marginBottom:14}}/> : (
            <div style={{fontSize:c.valueSz,fontWeight:c.mono?500:800,fontFamily:c.mono?"'DM Mono',monospace":"'DM Sans',sans-serif",letterSpacing:"-0.03em",color:c.valueColor,lineHeight:1.05,marginBottom:12,fontVariantNumeric:"tabular-nums"}}>
              <span style={{fontSize:c.valueSz*0.55,fontWeight:500,opacity:0.7}}>{c.prefix}</span>{c.value}
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:c.sub.color}}>
            {c.sub.icon}
            {loading?<span className="skel" style={{width:110,height:10}}/>:c.sub.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberAvatars({ members, max=4 }) {
  const visible = members.slice(0,max);
  const extra   = members.length - max;
  return (
    <div className="gc-avatars">
      {visible.map((m,i) => (
        <div key={i} className="gc-avatar" title={m.name} style={{background:avatarColor(m.name||String(i)),zIndex:max-i}}>
          {(m.name||"?")[0].toUpperCase()}
        </div>
      ))}
      {extra>0 && <div className="gc-avatar gc-avatar-more" style={{zIndex:0}}>+{extra}</div>}
    </div>
  );
}

function RemindPopover({ groupId, onClose }) {
  const [debtorList, setDebtorList] = useState(null);
  const [sent,       setSent]       = useState({});
  const [sending,    setSending]    = useState({});
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    api.get(`/settlements/${groupId}/simplified`)
      .then(({data}) => setDebtorList(data??[]))
      .catch(() => setDebtorList([]));
  }, [groupId]);

  async function sendRemind(debtorUserId, debtorName, amount) {
    setSending(p=>({...p,[debtorName]:true}));
    try {
      await api.post(`/groups/${groupId}/remind`,{debtor_user_id:debtorUserId,amount});
      setSent(p=>({...p,[debtorName]:true}));
    } catch(err) { console.error("Remind failed:",err?.response?.data); }
    finally { setSending(p=>({...p,[debtorName]:false})); }
  }

  return (
    <div className="g-remind-popover" ref={ref}>
      <div className="g-remind-head">
        <span>Send Reminder</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text3)",display:"flex"}}>{Icon.x(11)}</button>
      </div>
      {debtorList===null ? (
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
          {[1,2].map(i=><span key={i} className="skel" style={{height:40,borderRadius:8}}/>)}
        </div>
      ) : debtorList.length===0 ? (
        <div style={{padding:"20px 14px",fontSize:13,color:"var(--text3)",textAlign:"center"}}>No outstanding debtors.</div>
      ) : debtorList.map(row=>(
        <div key={row.from_user_id??row.from} className="g-remind-row">
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.from}</div>
            <div style={{fontSize:11,color:"var(--danger)",fontFamily:"'DM Mono',monospace",marginTop:2}}>owes ₹{fmt(row.amount,0)}</div>
          </div>
          <button className={`g-remind-btn-sm${sent[row.from]?" sent":""}`} disabled={!!sending[row.from]||!!sent[row.from]} onClick={()=>sendRemind(row.from_user_id,row.from,row.amount)}>
            {sent[row.from]?"✓ Sent":sending[row.from]?"…":"Remind"}
          </button>
        </div>
      ))}
    </div>
  );
}

function GroupCard({ group, enriched, idx, memberDetails }) {
  const navigate = useNavigate();
  const [showRemind, setShowRemind] = useState(false);

  const isLoading    = !enriched;
  const myNet        = enriched?.myNet             ?? null;
  // FIX: isEmpty from dedicated has-expenses-bulk, NOT sRows.length
  const isEmpty      = enriched?.isEmpty           ?? false;
  const memberCount  = enriched?.memberCount       ?? memberDetails?.length ?? 0;
  const pendingCount = enriched?.pendingSettlements ?? 0;

  const state = isLoading?"loading":isEmpty?"empty":myNet>0?"owed":myNet<0?"owe":"settled";
  const BADGE = { owed:{label:"You're owed",pulse:false}, owe:{label:"Payment due",pulse:true}, settled:{label:"Settled",pulse:false}, empty:{label:"New group",pulse:false}, loading:{label:"Loading…",pulse:false} };
  const badge = BADGE[state];

  const balanceNode = isLoading?null:isEmpty?(
    <div style={{fontSize:15,fontWeight:600,color:"var(--text3)",marginBottom:4}}>No expenses yet</div>
  ):myNet===0?(
    <div style={{fontSize:22,fontWeight:700,color:"var(--text3)"}}>All settled ✓</div>
  ):(
    <div className="gc-balance-value gs-mono" style={{color:myNet>0?"var(--success)":"var(--danger)"}}>
      {myNet>0?"+₹":"−₹"}{fmt(Math.abs(myNet))}
    </div>
  );

  const subLine = isLoading?""
    :isEmpty?`${memberCount} member${memberCount!==1?"s":""} · Add your first expense`
    :myNet>0?`${pendingCount||1} pending settlement${(pendingCount||1)!==1?"s":""}`
    :myNet<0?"Next settlement pending"
    :"No pending items";

  const {IconComponent,bg:iconBg,color:iconColor} = getGroupIcon(group.group_name);

  return (
    <div className={`gc state-${state}`} style={{animationDelay:`${idx*0.05}s`}} onClick={()=>navigate(`/groups/${group.group_id}`)}>
      <div className="gc-stripe"/>
      <div className="gc-inner">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div className={`gc-badge state-${state}`}>
            <span className={`gc-badge-dot${badge.pulse?" pulse":""}`}/>
            {badge.label}
          </div>
          {isLoading?<span className="skel" style={{width:70,height:24,borderRadius:20}}/>:<MemberAvatars members={memberDetails||[]} max={4}/>}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:iconBg,color:iconColor,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${iconColor}28`,boxShadow:`0 4px 12px ${iconColor}20`}}>
            <IconComponent size={20}/>
          </div>
          <div style={{fontSize:19,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>
            {group.group_name}
          </div>
        </div>

        <div style={{flex:1,background:"var(--surface2)",borderRadius:12,padding:"14px 16px",border:"1px solid var(--border)",marginBottom:16,minHeight:80,display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--text3)",marginBottom:10}}>Your Balance</div>
          {isLoading?(
            <><span className="skel" style={{width:"55%",height:28,borderRadius:6,marginBottom:8}}/><span className="skel" style={{width:"70%",height:10,borderRadius:4}}/></>
          ):(
            <>
              <div style={{marginBottom:6}}>{balanceNode}</div>
              <div style={{fontSize:12,color:"var(--text3)",display:"flex",alignItems:"center",gap:4}}>
                {state==="owe"&&<span style={{color:"var(--danger)"}}>{Icon.alert(11)}</span>}
                {state==="owed"&&<span style={{color:"var(--success)"}}>{Icon.trend(11)}</span>}
                {state==="empty"&&<span style={{color:"#818cf8"}}>{Icon.spark(11)}</span>}
                {subLine}
              </div>
            </>
          )}
        </div>

        <div className="gc-footer" onClick={e=>e.stopPropagation()}>
          <a href={`/groups/${group.group_id}`} className="gc-btn ghost" onClick={e=>{e.preventDefault();navigate(`/groups/${group.group_id}`);}}>
            {Icon.eye(12)} View
          </a>
          {isLoading?<span className="skel" style={{flex:1,height:36,borderRadius:10}}/>
            :isEmpty?<a href={`/groups/${group.group_id}`} className="gc-btn add-expense" onClick={e=>{e.preventDefault();navigate(`/groups/${group.group_id}`);}}>{Icon.plus(13)} Add Expense</a>
            :myNet<0?<a href={`/groups/${group.group_id}/add-payment`} className="gc-btn settle" onClick={e=>{e.preventDefault();navigate(`/groups/${group.group_id}/add-payment`);}}> Settle Up</a>
            :myNet>0?<>{<button className="gc-btn remind" onClick={()=>setShowRemind(v=>!v)}>{Icon.bell(12)} Remind</button>}{showRemind&&<RemindPopover groupId={group.group_id} onClose={()=>setShowRemind(false)}/>}</>
            :<button className="gc-btn settled-ok" disabled>{Icon.check(12)} All Good</button>
          }
        </div>
      </div>
    </div>
  );
}

function NewGroupCard({ onClick }) {
  return (
    <div className="gc-new" onClick={onClick}>
      <div className="gc-new-icon">{Icon.plus(22)}</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text2)",marginBottom:5}}>Start a New Group</div>
        <div style={{fontSize:13,color:"var(--text3)"}}>Trips, bills, roommates & more</div>
      </div>
    </div>
  );
}

function ZeroState({ onCreateGroup }) {
  return (
    <div className="gs-empty" style={{gridColumn:"1 / -1"}}>
      <div className="gs-empty-icon">{Icon.users(28)}</div>
      <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>No groups yet</div>
      <div style={{fontSize:14,color:"var(--text3)",maxWidth:280}}>Create your first group to start splitting expenses with friends, roommates, or travel buddies.</div>
      <button className="btn btn-primary btn-sm" style={{marginTop:8,display:"flex",alignItems:"center",gap:7}} onClick={onCreateGroup}>
        {Icon.users(13)} Create your first group
      </button>
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups,         setGroups]         = useState([]);
  const [enrichedMap,    setEnrichedMap]    = useState({});
  const [memberMap,      setMemberMap]      = useState({});
  const [loading,        setLoading]        = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary,        setSummary]        = useState({ youOwe:0, owedToYou:0 });
  const [loadError,      setLoadError]      = useState(false);
  const [modal,          setModal]          = useState(false);
  const [allUsers,       setAllUsers]       = useState([]);
  const [name,           setName]           = useState("");
  const [picked,         setPicked]         = useState([]);
  const [err,            setErr]            = useState("");
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState("");
  const [filterTab,      setFilterTab]      = useState("all");
  const [sortBy,         setSortBy]         = useState("name");

  const loadData = useCallback(async () => {
    setLoading(true); setSummaryLoading(true); setLoadError(false);

    let groupList = [];
    try {
      const { data } = await api.get("/groups/");
      groupList = data;
      setGroups(groupList);
    } catch(e) {
      console.error("Failed to fetch groups:", e);
      setLoadError(true); setLoading(false); setSummaryLoading(false);
      return;
    }

    if (!groupList.length) { setLoading(false); setSummaryLoading(false); return; }

    const groupIds = groupList.map(g => g.group_id);
    const fallback = {};
    groupList.forEach(g => { fallback[g.group_id] = { myNet:0, pendingSettlements:0, memberCount:0, totalExpenses:0, isEmpty:true }; });

    try {
      // FIX: 3 parallel calls — now includes members-bulk (was 404) and has-expenses-bulk (correct isEmpty)
      const [settlementsRes, membersRes, hasExpensesRes] = await Promise.all([
        api.post("/settlements/bulk",         { group_ids: groupIds }),
        api.post("/groups/members-bulk",      { group_ids: groupIds }),
        api.post("/groups/has-expenses-bulk", { group_ids: groupIds }),
      ]);

      const bulkSettlements = settlementsRes.data  ?? {};
      const bulkMembers     = membersRes.data      ?? {};
      // FIX: { group_id: bool } — true = group has at least one expense record
      const hasExpenses     = hasExpensesRes.data  ?? {};

      const newEnrichedMap = {};
      const newMemberMap   = {};
      const totals = { youOwe:0, owedToYou:0 };

      for (const g of groupList) {
        const gid   = g.group_id;
        const sRows = bulkSettlements[gid] ?? [];
        const mRows = bulkMembers[gid]     ?? [];

        // FIX: match by user_id not user_name
        const myRow = sRows.find(s => s.user_id === user?.user_id);
        const myNet = myRow ? Number(myRow.net_balance) : 0;

        const pendingSettlements = sRows.filter(s => Number(s.net_balance) !== 0).length;

        // FIX: isEmpty = no expense rows exist in DB for this group.
        // Cannot use sRows.length because fetch_settlements_for_groups JOINs from
        // Group_Members so sRows always has N rows (one per member) even with 0 expenses.
        const isEmpty = !hasExpenses[gid];

        if (myNet < 0) totals.youOwe    += Math.abs(myNet);
        if (myNet > 0) totals.owedToYou += myNet;

        newEnrichedMap[gid] = { myNet, pendingSettlements, memberCount: mRows.length, totalExpenses:0, isEmpty };
        newMemberMap[gid]   = mRows;
      }

      setEnrichedMap(newEnrichedMap);
      setMemberMap(newMemberMap);
      setSummary(totals);
    } catch(e) {
      console.error("Bulk enrichment failed — using fallback:", e);
      setEnrichedMap(fallback);
      setMemberMap({});
    } finally {
      setLoading(false); setSummaryLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function openModal() {
    setName(""); setPicked([]); setErr("");
    try { const { data } = await api.get("/users/"); setAllUsers(data); } catch { setAllUsers([]); }
    setModal(true);
  }

  async function createGroup(e) {
    e.preventDefault(); setErr("");
    const ids = [...new Set([user.user_id, ...picked])];
    if (ids.length < 2) { setErr("Select at least one other member."); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/groups/", { group_name: name.trim(), user_ids: ids });
      setModal(false); await loadData(); navigate(`/groups/${data.group_id}`);
    } catch(ex) { setErr(ex.response?.data?.detail || "Failed to create group."); }
    finally { setSaving(false); }
  }

  const others = allUsers.filter(u => u.user_id !== user.user_id);
  const toggle = uid => setPicked(p => p.includes(uid) ? p.filter(i=>i!==uid) : [...p,uid]);

  const filtered = groups
    .filter(g => {
      if (!g.group_name.toLowerCase().includes(search.toLowerCase())) return false;
      const e = enrichedMap[g.group_id];
      if (!e) return true;
      if (filterTab==="owed")  return e.myNet > 0;
      if (filterTab==="owe")   return e.myNet < 0;
      if (filterTab==="empty") return e.isEmpty;
      return true;
    })
    .sort((a,b) => {
      const ea=enrichedMap[a.group_id], eb=enrichedMap[b.group_id];
      if (sortBy==="name")    return a.group_name.localeCompare(b.group_name);
      if (sortBy==="balance") return Math.abs(eb?.myNet??0) - Math.abs(ea?.myNet??0);
      if (sortBy==="newest")  return new Date(b.created_at||0) - new Date(a.created_at||0);
      return 0;
    });

  const groupsThisMonth = groups.filter(g => {
    if (!g.created_at) return false;
    const d=new Date(g.created_at),n=new Date();
    return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
  }).length;

  const tabCounts = {
    all:   groups.length,
    owed:  groups.filter(g=>(enrichedMap[g.group_id]?.myNet??0)>0).length,
    owe:   groups.filter(g=>(enrichedMap[g.group_id]?.myNet??0)<0).length,
    empty: groups.filter(g=>enrichedMap[g.group_id]?.isEmpty).length,
  };

  const pageHeader = (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <button className="btn btn-ghost btn-sm" style={{display:"flex",alignItems:"center",gap:5}} onClick={loadData} title="Refresh">{Icon.refresh(13)}</button>
      <button className="btn btn-primary btn-sm" style={{display:"flex",alignItems:"center",gap:6}} onClick={openModal}>{Icon.users(13)} Create Group</button>
    </div>
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <AppShell title="Groups" actions={pageHeader}>
        <div className="gs-root">
          <div className="gs-page-header">
            <div>
              <h1 style={{fontSize:26,fontWeight:800,letterSpacing:"-0.03em",color:"var(--text)",marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>Your Groups</h1>
              <p style={{fontSize:14,color:"var(--text3)"}}>
                {loading?"Loading your groups…":groups.length>0?`Managing expenses across ${groups.length} group${groups.length!==1?"s":""}` :"Create a group to start splitting expenses"}
              </p>
            </div>
          </div>

          {loadError && (
            <div className="gs-error-banner">
              {Icon.alert(14)}<span>Failed to load groups. </span>
              <button onClick={loadData} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",textDecoration:"underline",fontWeight:600,padding:0,fontFamily:"inherit"}}>Retry</button>
            </div>
          )}

          <SummaryBar totalGroups={groups.length} youOwe={summary.youOwe} owedToYou={summary.owedToYou} loading={summaryLoading} thisMonth={groupsThisMonth}/>

          {(groups.length>0||search)&&!loading&&(
            <div className="gs-toolbar">
              <div className="gf-search-wrap">
                <span className="gf-search-icon">{Icon.search(14)}</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search groups…"/>
                {search&&<button className="gf-search-clear" onClick={()=>setSearch("")}>{Icon.x(8)}</button>}
              </div>
              <div style={{flex:1}}/>
              <div className="gf-tabs">
                {[{id:"all",label:"All"},{id:"owed",label:"Owed"},{id:"owe",label:"Debt"},{id:"empty",label:"New"}].map(t=>(
                  <button key={t.id} className={`gf-tab ${filterTab===t.id?"active":""}`} onClick={()=>setFilterTab(t.id)}>
                    {t.label}{tabCounts[t.id]>0&&<span className="gf-tab-count">{tabCounts[t.id]}</span>}
                  </button>
                ))}
              </div>
              <div className="gf-sort">
                {Icon.sort(13)}<span style={{color:"var(--text3)",fontSize:12}}>Sort:</span>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                  <option value="name">Name</option><option value="balance">Balance</option><option value="newest">Newest</option>
                </select>{Icon.chevD(12)}
              </div>
            </div>
          )}

          {loading?(
            <div className="gc-grid">
              {[0,1,2,3].map(i=>(
                <div key={i} className="gc" style={{cursor:"default",animationDelay:`${i*0.07}s`}}>
                  <div style={{height:3,background:"var(--surface3)",borderRadius:"20px 20px 0 0"}}/>
                  <div className="gc-inner">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
                      <span className="skel" style={{width:90,height:22,borderRadius:20}}/><span className="skel" style={{width:72,height:22,borderRadius:20}}/>
                    </div>
                    <div style={{display:"flex",gap:12,marginBottom:20}}>
                      <span className="skel" style={{width:44,height:44,borderRadius:12,flexShrink:0}}/><span className="skel" style={{flex:1,height:22,borderRadius:6,alignSelf:"center"}}/>
                    </div>
                    <div style={{background:"var(--surface2)",borderRadius:12,padding:"14px 16px",border:"1px solid var(--border)",marginBottom:16}}>
                      <span className="skel" style={{width:60,height:10,borderRadius:4,marginBottom:10}}/><span className="skel" style={{width:"50%",height:28,borderRadius:6,marginBottom:8}}/><span className="skel" style={{width:"65%",height:10,borderRadius:4}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <span className="skel" style={{flex:1,height:36,borderRadius:10}}/><span className="skel" style={{flex:1,height:36,borderRadius:10}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ):groups.length===0?(
            <div className="gc-grid"><ZeroState onCreateGroup={openModal}/><NewGroupCard onClick={openModal}/></div>
          ):filtered.length===0?(
            <div className="gs-empty">
              <div className="gs-empty-icon">{Icon.search(28)}</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>No groups match {search?`"${search}"`:"this filter"}</div>
              <div style={{fontSize:13,color:"var(--text3)"}}>Try adjusting your search or filter criteria</div>
              <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>{setSearch("");setFilterTab("all");}}>Clear filters</button>
            </div>
          ):(
            <div className="gc-grid">
              {filtered.map((g,i)=>(
                <GroupCard key={g.group_id} group={g} enriched={enrichedMap[g.group_id]??null} memberDetails={memberMap[g.group_id]??[]} idx={i}/>
              ))}
              <NewGroupCard onClick={openModal}/>
            </div>
          )}
        </div>
      </AppShell>

      {modal&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(false);}}>
          <div className="modal-box fade-up">
            <div className="modal-head">
              <span className="modal-title">Create New Group</span>
              <button className="btn btn-ghost btn-xs btn-icon" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {err&&<div className="alert alert-error">{err}</div>}
              <form onSubmit={createGroup}>
                <div className="form-group">
                  <label className="form-label">Group name</label>
                  <input required autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Goa Trip 2025, H-Block Hostel…"/>
                </div>
                <div className="form-group" style={{marginBottom:20}}>
                  <label className="form-label">Add members</label>
                  <div style={{fontSize:13,color:"var(--text3)",marginBottom:10}}>You're included automatically. Pick others:</div>
                  {others.length===0?<div style={{fontSize:14,color:"var(--text3)",padding:"12px 0"}}>No other users found.</div>:(
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {others.map(u=>(
                        <div key={u.user_id} className={`chip ${picked.includes(u.user_id)?"on":""}`} onClick={()=>toggle(u.user_id)}>
                          {picked.includes(u.user_id)?"✓ ":""}{u.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setModal(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={saving}>{saving?"Creating…":"Create Group"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}