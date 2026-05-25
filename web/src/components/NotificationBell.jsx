// --- frontend/src/components/NotificationBell.jsx ---

/**
 * NotificationBell.jsx
 * Uses a proper SVG bell icon (no emoji).
 * Polls unread count every 30s.
 * Click opens dropdown with notification list.
 * Paginated: fetches 20 at a time, "Load more" appends next batch.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const LIMIT = 20;

// SVG bell icon
const BellIcon = ({ size = 17 }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

export default function NotificationBell() {
  const navigate  = useNavigate();
  const [count,       setCount]       = useState(0);
  const [notifs,      setNotifs]      = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setCount(data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function openPanel() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    // Reset pagination state every time the panel is opened
    setOffset(0);
    setHasMore(true); // assume more until proven otherwise — avoids button flicker
    try {
      const { data } = await api.get(`/notifications/?limit=${LIMIT}&offset=0`);
      setNotifs(data);
      setHasMore(data.length === LIMIT); // if we got a full page, there might be more
      setOffset(LIMIT);
    } catch {} finally { setLoading(false); }
  }

  async function loadMore() {
    if (loadingMore) return; // prevent duplicate calls
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/notifications/?limit=${LIMIT}&offset=${offset}`);
      setNotifs(prev => [...prev, ...data]);         // append to existing list
      setHasMore(data.length === LIMIT);
      setOffset(prev => prev + LIMIT);
    } catch {} finally { setLoadingMore(false); }
  }

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      setCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  }

  async function handleNotifClick(n) {
    if (!n.is_read) {
      try { await api.post(`/notifications/read/${n.notification_id}`); } catch {}
      setNotifs(prev => prev.map(x => x.notification_id === n.notification_id ? { ...x, is_read: 1 } : x));
      setCount(c => Math.max(0, c - 1));
    }
    if (n.group_id) navigate(`/groups/${n.group_id}`);
    setOpen(false);
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={openPanel}
        style={{
          width: 34, height: 34, borderRadius: 8,
          border: `1px solid ${open ? "var(--border2)" : "var(--border)"}`,
          background: open ? "var(--surface2)" : "transparent",
          color: count > 0 ? "var(--text)" : "var(--text2)",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", position: "relative",
          transition: "all 0.12s",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = count > 0 ? "var(--text)" : "var(--text2)"; }}}
      >
        <BellIcon />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--danger)", color: "#fff",
            borderRadius: "50%", width: 16, height: 16,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--bg)",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 340, background: "var(--surface)",
          border: "1px solid var(--border2)", borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)", zIndex: 500, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Notifications
              {count > 0 && <span style={{ color: "var(--danger)", marginLeft: 6 }}>({count})</span>}
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 12, color: "var(--primary-h)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Loading…</div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ marginBottom: 8, opacity: 0.3, display: "flex", justifyContent: "center" }}>
                  <BellIcon size={28} />
                </div>
                <div style={{ fontSize: 14, color: "var(--text3)" }}>No notifications yet</div>
              </div>
            ) : (
              <>
                {notifs.map(n => (
                  <div
                    key={n.notification_id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: "12px 16px",
                      cursor: n.group_id ? "pointer" : "default",
                      background: n.is_read ? "transparent" : "rgba(37,99,235,0.05)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex", gap: 10,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => n.group_id && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(37,99,235,0.05)")}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: n.type === "reminder" ? "rgba(245,158,11,0.12)" : "rgba(37,99,235,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2, color: n.type === "reminder" ? "var(--warning)" : "var(--primary-h)",
                    }}>
                      {n.type === "reminder"
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--text)" }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        {timeAgo(n.created_at)}
                        {!n.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load more button */}
                {hasMore && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      style={{
                        width: "100%", padding: "7px 0",
                        background: "transparent",
                        border: "1px solid var(--border2)",
                        borderRadius: 7, cursor: loadingMore ? "default" : "pointer",
                        fontSize: 12, color: loadingMore ? "var(--text3)" : "var(--text2)",
                        fontFamily: "inherit", transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}}
                      onMouseLeave={e => { if (!loadingMore) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}