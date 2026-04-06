// frontend/src/components/ReceiptScanner.jsx
/**
 * ReceiptScanner — reusable AI receipt scan button + modal.
 *
 * Props:
 *   onResult(data) — called with the agent's structured JSON on success.
 *                    data shape: { amount, description, category_name,
 *                                  subcategory_name, category_id,
 *                                  subcategory_id, expense_date,
 *                                  merchant_name, confidence }
 *   compact        — if true, renders a smaller icon-only button (for modals)
 */
import { useState, useRef } from "react";
import api from "../api/axios";

const STYLES = `
  .rs-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 700; font-family: inherit;
    cursor: pointer; border: 1.5px solid rgba(99,102,241,0.4);
    background: rgba(99,102,241,0.08); color: #818cf8;
    transition: all 0.15s; white-space: nowrap;
  }
  .rs-btn:hover:not(:disabled) {
    background: rgba(99,102,241,0.16); border-color: rgba(99,102,241,0.7);
    color: #a5b4fc;
  }
  .rs-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .rs-btn.compact {
    padding: 7px 12px; font-size: 12.5px; border-radius: 8px;
  }

  .rs-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: rsFadeIn 0.15s ease;
  }
  @keyframes rsFadeIn { from { opacity:0 } to { opacity:1 } }

  .rs-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; width: 100%; max-width: 440px;
    overflow: hidden;
    animation: rsSlideUp 0.18s ease;
  }
  @keyframes rsSlideUp {
    from { opacity:0; transform:translateY(10px) }
    to   { opacity:1; transform:translateY(0) }
  }

  .rs-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  }
  .rs-title { font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
  .rs-subtitle { font-size: 12px; color: var(--text3); line-height: 1.5; }

  .rs-close {
    background: none; border: none; color: var(--text3);
    cursor: pointer; padding: 4px; border-radius: 6px;
    font-size: 18px; line-height: 1; transition: color 0.12s;
    flex-shrink: 0;
  }
  .rs-close:hover { color: var(--text); }

  .rs-body { padding: 20px; }

  .rs-drop {
    border: 2px dashed var(--border2); border-radius: 12px;
    padding: 36px 20px; text-align: center;
    cursor: pointer; transition: all 0.15s;
    background: var(--surface2);
  }
  .rs-drop:hover, .rs-drop.drag-over {
    border-color: #818cf8; background: rgba(99,102,241,0.06);
  }
  .rs-drop-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
  .rs-drop-text { font-size: 13.5px; color: var(--text2); font-weight: 600; margin-bottom: 4px; }
  .rs-drop-hint { font-size: 12px; color: var(--text3); }

  .rs-preview-wrap {
    position: relative; border-radius: 12px; overflow: hidden;
    border: 1px solid var(--border);
  }
  .rs-preview-wrap img { width: 100%; max-height: 220px; object-fit: contain; background: var(--surface2); display: block; }
  .rs-preview-change {
    position: absolute; bottom: 8px; right: 8px;
    padding: 5px 10px; border-radius: 7px; font-size: 11px;
    font-weight: 700; font-family: inherit; cursor: pointer;
    background: rgba(0,0,0,0.6); color: #fff; border: none;
    transition: background 0.12s;
  }
  .rs-preview-change:hover { background: rgba(0,0,0,0.85); }

  .rs-scanning {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 20px 0 8px;
  }
  .rs-spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid rgba(99,102,241,0.2);
    border-top-color: #818cf8;
    animation: rsSpin 0.8s linear infinite;
  }
  @keyframes rsSpin { to { transform: rotate(360deg) } }
  .rs-scan-text { font-size: 13px; color: var(--text2); font-weight: 600; }
  .rs-scan-sub  { font-size: 11.5px; color: var(--text3); }

  .rs-result {
    margin-top: 14px; border-radius: 10px;
    border: 1px solid var(--border); overflow: hidden;
  }
  .rs-result-header {
    padding: 10px 14px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: space-between;
  }
  .rs-result-row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 8px 14px; border-top: 1px solid var(--border);
    font-size: 13px;
  }
  .rs-result-key { color: var(--text3); font-size: 12px; }
  .rs-result-val { color: var(--text); font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }

  .rs-error {
    margin-top: 12px; padding: 10px 14px; border-radius: 9px;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    font-size: 13px; color: #f87171;
  }

  .rs-footer {
    padding: 14px 20px; border-top: 1px solid var(--border);
    display: flex; gap: 10px; justify-content: flex-end;
  }
  .rs-footer-btn {
    padding: 9px 18px; border-radius: 9px; font-size: 13.5px;
    font-weight: 700; font-family: inherit; cursor: pointer;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text2); transition: all 0.13s;
  }
  .rs-footer-btn:hover { color: var(--text); border-color: var(--border2); }
  .rs-footer-btn.primary {
    background: #6366f1; color: #fff; border-color: #6366f1;
  }
  .rs-footer-btn.primary:hover { background: #4f46e5; border-color: #4f46e5; }
  .rs-footer-btn:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const CONFIDENCE_STYLES = {
  high:   { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "High confidence" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Medium confidence" },
  low:    { color: "#f87171", bg: "rgba(239,68,68,0.1)",   label: "Low confidence — verify manually" },
};

const SVG_SPARKLE = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/>
    <path d="M5 5 L5.5 7 L7.5 7.5 L5.5 8 L5 10 L4.5 8 L2.5 7.5 L4.5 7 Z" opacity="0.6"/>
    <path d="M19 15 L19.3 16.5 L21 17 L19.3 17.5 L19 19 L18.7 17.5 L17 17 L18.7 16.5 Z" opacity="0.5"/>
  </svg>
);

const SVG_UPLOAD = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

export default function ReceiptScanner({ onResult, compact = false }) {
  const [open,      setOpen]      = useState(false);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef();

  function reset() {
    setFile(null); setPreview(null);
    setScanning(false); setResult(null); setError("");
  }

  function close() { reset(); setOpen(false); }

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  function onFileInput(e) { pickFile(e.target.files[0]); }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) pickFile(f);
  }

  async function scan() {
    if (!file) return;
    setScanning(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/ai/scan-receipt", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (ex) {
      setError(ex?.response?.data?.detail || "Scan failed. Try a clearer image.");
    } finally {
      setScanning(false);
    }
  }

  function applyAndClose() {
    if (result) onResult(result);
    close();
  }

  const conf = result ? (CONFIDENCE_STYLES[result.confidence] || CONFIDENCE_STYLES.low) : null;

  return (
    <>
      <style>{STYLES}</style>

      {/* Trigger button */}
      <button
        type="button"
        className={`rs-btn ${compact ? "compact" : ""}`}
        onClick={() => setOpen(true)}
      >
        {SVG_SPARKLE}
        {compact ? "Scan Receipt" : "✨ Auto-fill with AI"}
      </button>

      {/* Modal */}
      {open && (
        <div className="rs-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="rs-modal">

            {/* Header */}
            <div className="rs-header">
              <div>
                <div className="rs-title">✨ AI Receipt Scanner</div>
                <div className="rs-subtitle">
                  Upload a photo of your receipt. The AI agent will extract<br/>
                  the amount, date, and category automatically.
                </div>
              </div>
              <button className="rs-close" onClick={close}>×</button>
            </div>

            {/* Body */}
            <div className="rs-body">

              {/* Drop zone / preview */}
              {!preview ? (
                <div
                  className={`rs-drop ${dragOver ? "drag-over" : ""}`}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="rs-drop-icon">{SVG_UPLOAD}</div>
                  <div className="rs-drop-text">Click to upload or drag & drop</div>
                  <div className="rs-drop-hint">JPEG, PNG, WEBP — max 10 MB</div>
                  <input
                    ref={fileRef} type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={onFileInput}
                  />
                </div>
              ) : (
                <div className="rs-preview-wrap">
                  <img src={preview} alt="Receipt preview" />
                  <button
                    className="rs-preview-change"
                    onClick={() => { reset(); }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Scanning state */}
              {scanning && (
                <div className="rs-scanning">
                  <div className="rs-spinner" />
                  <div className="rs-scan-text">Agent is reading your receipt…</div>
                  <div className="rs-scan-sub">Extracting amount, merchant & category</div>
                </div>
              )}

              {/* Error */}
              {error && <div className="rs-error">⚠ {error}</div>}

              {/* Result preview */}
              {result && !scanning && (
                <div className="rs-result">
                  <div
                    className="rs-result-header"
                    style={{ background: conf.bg, color: conf.color }}
                  >
                    <span>Scan Result</span>
                    <span>{conf.label}</span>
                  </div>
                  {[
                    ["Amount",      result.amount ? `₹${result.amount.toLocaleString("en-IN")}` : "—"],
                    ["Description", result.description || "—"],
                    ["Date",        result.expense_date || "—"],
                    ["Category",    result.category_name || "—"],
                    ["Subcategory", result.subcategory_name || "—"],
                    ["Merchant",    result.merchant_name || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rs-result-row">
                      <span className="rs-result-key">{k}</span>
                      <span className="rs-result-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="rs-footer">
              <button className="rs-footer-btn" onClick={close}>Cancel</button>
              {!result && (
                <button
                  className="rs-footer-btn primary"
                  disabled={!file || scanning}
                  onClick={scan}
                >
                  {scanning ? "Scanning…" : "Scan Receipt →"}
                </button>
              )}
              {result && (
                <>
                  <button className="rs-footer-btn" onClick={() => { setResult(null); setError(""); }}>
                    Rescan
                  </button>
                  <button className="rs-footer-btn primary" onClick={applyAndClose}>
                    Apply to Form ✓
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}