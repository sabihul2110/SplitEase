// web/src/components/common/DateInput.jsx


import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function parseISO(iso) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? new Date() : d;
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildWeeks(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);
  const weeks = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function currentYear() { return new Date().getFullYear(); }

const START_YEAR = 2000;
const YEARS = Array.from(
  { length: currentYear() - START_YEAR + 1 }, 
  (_, i) => currentYear() - i
);

// ─── Styles ──────────────────────────────────────────────────────────

const CSS = `
  .di-trigger {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 9px; padding: 9px 12px;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: inherit; width: 100%; height: 100%; box-sizing: border-box;
  }
  .di-trigger:hover { border-color: var(--border2); }
  .di-trigger:focus-visible { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
  .di-trigger-text { flex: 1; font-size: 14px; color: var(--text); text-align: left; font-weight: 500; }
  .di-trigger-icon { color: var(--text3); display: flex; align-items: center; flex-shrink: 0; }

  .di-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: diFadeIn 0.2s ease-out;
  }
  @keyframes diFadeIn { from { opacity: 0 } to { opacity: 1 } }

  .di-modal {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 20px; padding: 22px;
    width: 100%; max-width: 340px;
    box-shadow: 0 20px 48px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1);
    animation: diSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }
  
  .di-close-btn {
    position: absolute; top: 14px; right: 14px;
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid transparent;
    color: var(--text3); cursor: pointer; transition: all 0.15s ease;
  }
  .di-close-btn:hover { background: var(--surface2); color: var(--text); }
  @keyframes diSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.96) }
    to   { opacity: 1; transform: translateY(0) scale(1) }
  }

  /* Month nav row */
  .di-month-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .di-nav-btn {
    background: transparent; border: 1px solid transparent; cursor: pointer; color: var(--text2);
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 50%; transition: all 0.15s ease;
  }
  .di-nav-btn:hover { background: var(--surface2); color: var(--text); }
  .di-month-labels { display: flex; gap: 4px; align-items: center; }
  
  .di-quick-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; background: transparent;
    border: 1px solid transparent; border-radius: 10px;
    cursor: pointer; transition: all 0.15s ease;
    font-family: inherit;
  }
  .di-quick-btn:hover { background: var(--surface2); }
  .di-quick-btn-text { font-size: 14.5px; font-weight: 600; color: var(--text); }

  /* Quick-pick overlay (months / years) */
  .di-quick-overlay {
    position: absolute; top: 64px; left: 16px; right: 16px;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 16px; padding: 10px;
    display: flex; flex-wrap: wrap; gap: 4px;
    z-index: 10;
    box-shadow: 0 12px 32px rgba(0,0,0,0.15);
    animation: diFadeIn 0.15s ease;
    
    max-height: 240px; 
    overflow-y: auto;
  }
  
  .di-quick-overlay::-webkit-scrollbar { width: 6px; }
  .di-quick-overlay::-webkit-scrollbar-track { background: transparent; }
  .di-quick-overlay::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 6px; }
  .di-quick-overlay::-webkit-scrollbar-thumb:hover { background: var(--text3); }

  .di-quick-item {
    width: calc(33.33% - 3px); padding: 10px 0; border-radius: 10px;
    text-align: center; cursor: pointer; background: none; border: none;
    font-size: 13.5px; color: var(--text2); font-family: inherit; font-weight: 500;
    transition: all 0.15s ease;
  }
  .di-quick-item:hover:not(:disabled) { background: var(--surface2); color: var(--text); }
  .di-quick-item.active { font-weight: 700; }
  .di-quick-item:disabled { opacity: 0.3; cursor: default; }

  /* Day-of-week header */
  .di-dow-row { display: flex; margin-bottom: 8px; }
  .di-dow { flex: 1; text-align: center; font-size: 11.5px; font-weight: 600;
    color: var(--text3); padding: 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Week/Day grid */
  .di-week { display: flex; justify-content: space-between; margin-bottom: 2px; }
  .di-day {
    flex: 0 0 13.5%; aspect-ratio: 1; display: flex; align-items: center;
    justify-content: center; border-radius: 50%; 
    cursor: pointer; background: transparent; border: 1px solid transparent;
    font-size: 13.5px; font-weight: 500; color: var(--text); font-family: inherit;
    transition: all 0.15s ease; margin: 0;
  }
  .di-day:hover:not(:disabled):not(.selected) { background: var(--surface2); }
  .di-day.selected { color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
  .di-day.today:not(.selected) { font-weight: 700; color: var(--primary-h); background: var(--surface2); }
  .di-day:disabled { opacity: 0.25; cursor: default; }
  .di-day.empty { cursor: default; background: transparent !important; }

  /* Hidden native input */
  .di-hidden { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
`;

const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ChevRight = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const ChevLeft = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const ChevDown = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function DateInput({
  value,
  onChange,
  required = false,
  accentColor,
  maxDate,
  label,
  style,
}) {
  const ceiling = maxDate instanceof Date ? maxDate : new Date();
  ceiling.setHours(23, 59, 59, 999);

  const selected = parseISO(value);
  const today    = new Date();

  const [open,           setOpen]           = useState(false);
  const [calMonth,       setCalMonth]       = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const [showMonthPick,  setShowMonthPick]  = useState(false);
  const [showYearPick,   setShowYearPick]   = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const d = parseISO(value);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function openPicker() {
    const d = parseISO(value);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setShowMonthPick(false);
    setShowYearPick(false);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setShowMonthPick(false);
    setShowYearPick(false);
  }

  function prevMonth() {
    setCalMonth(p => {
      const d = new Date(p.year, p.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setShowMonthPick(false); setShowYearPick(false);
  }

  function nextMonth() {
    const next = new Date(calMonth.year, calMonth.month + 1);
    if (next <= new Date(ceiling.getFullYear(), ceiling.getMonth())) {
      setCalMonth({ year: next.getFullYear(), month: next.getMonth() });
    }
    setShowMonthPick(false); setShowYearPick(false);
  }

  function selectDay(day) {
    if (!day) return;
    const iso = toISO(calMonth.year, calMonth.month, day);
    onChange(iso);
    close();
  }

  function isFuture(year, month, day) {
    const d = new Date(year, month, day, 23, 59, 59);
    return d > ceiling;
  }

  function isSelected(day) {
    return (
      day &&
      selected.getFullYear() === calMonth.year &&
      selected.getMonth()    === calMonth.month &&
      selected.getDate()     === day
    );
  }

  function isToday(day) {
    return (
      day &&
      today.getFullYear() === calMonth.year &&
      today.getMonth()    === calMonth.month &&
      today.getDate()     === day
    );
  }

  const displayDate = parseISO(value).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const accentStyle = accentColor
    ? { "--di-accent": accentColor }
    : { "--di-accent": "var(--primary)" };

  return (
    <>
      <style>{CSS}</style>

      {label && <div className="form-label" style={{ marginBottom: 6 }}>{label}</div>}

      <button
        type="button"
        className="di-trigger"
        onClick={openPicker}
        style={style}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="di-trigger-icon"><CalIcon /></span>
        <span className="di-trigger-text">{displayDate}</span>
        <span className="di-trigger-icon"><ChevDown size={14} /></span>
      </button>

      <input
        className="di-hidden"
        type="text"
        tabIndex={-1}
        required={required}
        value={value}
        onChange={() => {}}
        aria-hidden="true"
      />

      {open && createPortal(
        <div
          className="di-overlay"
          role="dialog"
          aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="di-modal" ref={modalRef} style={accentStyle}>

            <button type="button" className="di-close-btn" onClick={close} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="di-month-row">
              <button className="di-nav-btn" onClick={prevMonth} aria-label="Previous month">
                <ChevLeft size={16} />
              </button>

              <div className="di-month-labels">
                <button
                  className="di-quick-btn"
                  onClick={() => { setShowMonthPick(v => !v); setShowYearPick(false); }}
                >
                  <span className="di-quick-btn-text">{MONTHS_FULL[calMonth.month]}</span>
                </button>
                <button
                  className="di-quick-btn"
                  onClick={() => { setShowYearPick(v => !v); setShowMonthPick(false); }}
                >
                  <span className="di-quick-btn-text">{calMonth.year}</span>
                </button>
              </div>

              <button className="di-nav-btn" onClick={nextMonth} aria-label="Next month">
                <ChevRight size={16} />
              </button>
            </div>

            {showMonthPick && (
              <div className="di-quick-overlay" role="listbox">
                {MONTHS.map((m, i) => {
                const isActive = i === calMonth.month;
                // NEW: Disable if the year is the ceiling year AND the month is strictly in the future
                const isDisabled = calMonth.year === ceiling.getFullYear() && i > ceiling.getMonth();
                  
                return (
                  <button
                    key={m}
                    role="option"
                    aria-selected={isActive}
                    disabled={isDisabled}
                    className={`di-quick-item ${isActive ? "active" : ""}`}
                    style={isActive ? { background: "var(--di-accent, var(--primary))" + "22", color: "var(--di-accent, var(--primary))" } : {}}
                    onClick={() => { setCalMonth(p => ({ ...p, month: i })); setShowMonthPick(false); }}
                  >
                    {m}
                  </button>
                );
              })}
              </div>
            )}

            {showYearPick && (
              <div className="di-quick-overlay" role="listbox">
                {YEARS.map(y => {
                  const isActive = y === calMonth.year;
                  const disabled = y > ceiling.getFullYear();
                  
                  return (
                    <button
                      key={y}
                      role="option"
                      aria-selected={isActive}
                      disabled={disabled}
                      className={`di-quick-item ${isActive ? "active" : ""}`}
                      style={isActive ? { background: "var(--di-accent, var(--primary))" + "22", color: "var(--di-accent, var(--primary))" } : {}}
                      onClick={() => { setCalMonth(p => ({ ...p, year: y })); setShowYearPick(false); }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="di-dow-row">
              {DOW.map(d => <span key={d} className="di-dow">{d}</span>)}
            </div>

            {buildWeeks(calMonth.year, calMonth.month).map((week, wi) => (
              <div key={wi} className="di-week">
                {week.map((day, di) => {
                  const future   = day ? isFuture(calMonth.year, calMonth.month, day) : false;
                  const selected = isSelected(day);
                  const todayDay = isToday(day);
                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={!day || future}
                      className={[
                        "di-day",
                        !day    ? "empty"    : "",
                        selected ? "selected" : "",
                        todayDay && !selected ? "today" : "",
                      ].join(" ")}
                      style={selected
                        ? { background: "var(--di-accent, var(--primary))", borderColor: "var(--di-accent, var(--primary))" }
                        : {}
                      }
                      onClick={() => selectDay(day)}
                    >
                      {day || ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}