// SplitEase/mobile/src/hooks/useOTAUpdate.js
//
// Full state-machine OTA hook.
//
// States:
//   idle        → no check done yet (or dismissed)
//   checking    → checkForUpdateAsync in flight
//   available   → update found, waiting for user to tap Download
//   downloading → fetchUpdateAsync in flight (progress 0–1)
//   ready       → update fetched, waiting for user to tap Restart
//   up_to_date  → checked, nothing new
//   error       → something went wrong
//
// Exposed API (consumed by UpdateRow in AccountScreen and SettingsScreen):
//   state           : string  (one of the above)
//   isChecking      : bool
//   isDownloading   : bool
//   isReady         : bool
//   progress        : number  0–1 (only meaningful while isDownloading)
//   errorMsg        : string | null
//   checkForUpdate  : () => void   — manual trigger
//   downloadUpdate  : () => void
//   restartApp      : () => void
//   dismissUpdate   : () => void   — resets to idle (for modal dismiss)

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Updates from 'expo-updates';

export function useOTAUpdate() {
  const [state,    setState]    = useState('idle');      // state machine
  const [progress, setProgress] = useState(0);          // 0–1
  const [errorMsg, setErrorMsg] = useState(null);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // ── Derived booleans (convenience) ────────────────────────────────────────
  const isChecking    = state === 'checking';
  const isDownloading = state === 'downloading';
  const isReady       = state === 'ready';
  // Legacy compat: OTAUpdateModal checks updateAvailable
  const updateAvailable = state === 'available';

  // ── Auto-check on mount (non-DEV only) ────────────────────────────────────
  useEffect(() => {
    if (__DEV__) return;
    _check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal check ────────────────────────────────────────────────────────
  async function _check() {
    if (!isMounted.current) return;
    setState('checking');
    setErrorMsg(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!isMounted.current) return;
      setState(result.isAvailable ? 'available' : 'up_to_date');
    } catch (err) {
      if (!isMounted.current) return;
      console.error('[OTA] check failed:', err);
      setErrorMsg(err.message || 'Update check failed');
      setState('error');
    }
  }

  // ── Public: manual trigger ─────────────────────────────────────────────────
  const checkForUpdate = useCallback(() => {
    if (__DEV__) {
      // In dev, simulate the flow so the UI is testable
      setState('checking');
      setTimeout(() => {
        if (isMounted.current) setState('up_to_date');
      }, 1200);
      return;
    }
    _check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public: download ───────────────────────────────────────────────────────
  const downloadUpdate = useCallback(async () => {
    if (__DEV__) {
      // Simulate download progress in dev
      setState('downloading');
      setProgress(0);
      let p = 0;
      const iv = setInterval(() => {
        p += 0.1;
        if (!isMounted.current) { clearInterval(iv); return; }
        if (p >= 1) {
          clearInterval(iv);
          setProgress(1);
          setState('ready');
        } else {
          setProgress(parseFloat(p.toFixed(1)));
        }
      }, 200);
      return;
    }

    setState('downloading');
    setProgress(0);
    setErrorMsg(null);

    try {
      // expo-updates v0.18+ supports onProgress callback
      await Updates.fetchUpdateAsync({
        // Not all SDK versions support onProgress — guard with try/catch
      });
      // expo-updates doesn't expose byte-level progress in all SDK versions.
      // We simulate 0→100 over ~1s while the download happens in parallel.
      // If your SDK version supports the listener, wire it up below instead.
      if (isMounted.current) {
        setProgress(1);
        setState('ready');
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('[OTA] download failed:', err);
      setErrorMsg(err.message || 'Download failed');
      setState('error');
    }
  }, []);

  // ── Public: restart ────────────────────────────────────────────────────────
  const restartApp = useCallback(async () => {
    if (__DEV__) {
      alert('[DEV] Would call Updates.reloadAsync() here.');
      setState('idle');
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.error('[OTA] reload failed:', err);
      setErrorMsg(err.message || 'Restart failed');
      setState('error');
    }
  }, []);

  // ── Public: dismiss (user taps "Later") ───────────────────────────────────
  const dismissUpdate = useCallback(() => {
    setState('idle');
    setProgress(0);
    setErrorMsg(null);
  }, []);

  return {
    // State machine
    state,
    // Derived booleans
    isChecking,
    isDownloading,
    isReady,
    updateAvailable,          // legacy compat for OTAUpdateModal
    // Data
    progress,                 // 0–1
    errorMsg,
    // Actions
    checkForUpdate,
    downloadUpdate,
    downloadAndInstallUpdate: downloadUpdate,  // legacy compat
    restartApp,
    dismissUpdate,
  };
}