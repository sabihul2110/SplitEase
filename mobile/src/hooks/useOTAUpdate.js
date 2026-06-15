// SplitEase/mobile/src/hooks/useOTAUpdate.js

//
// States:
//   idle        → no check done yet (or dismissed)
//   checking    → checkForUpdateAsync in flight
//   available   → update found, waiting for user to tap Download
//   downloading → fetchUpdateAsync in flight (progress 0–1)
//   ready       → update fetched, waiting for user to tap Restart
//   up_to_date  → checked, nothing new
//   error       → something went wrong

import { useState, useEffect, useCallback, useRef } from "react";
import * as Updates from "expo-updates";

export function useOTAUpdate({ autoCheck = true } = {}) {
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  const isChecking    = state === "checking";
  const isDownloading = state === "downloading";
  const isReady       = state === "ready";
  const updateAvailable = state === "available";

  // Auto-check on mount — only when autoCheck=true (not in AccountScreen)
  useEffect(() => {
    if (!autoCheck) return;
    if (__DEV__) return;
    _check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function _check() {
    if (!isMounted.current) return;
    setState("checking");
    setErrorMsg(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!isMounted.current) return;
      setState(result.isAvailable ? "available" : "up_to_date");
    } catch (err) {
      if (!isMounted.current) return;
      console.error("[OTA] check failed:", err);
      setErrorMsg(err.message || "Update check failed");
      setState("error");
    }
  }

  const checkForUpdate = useCallback(() => {
    if (__DEV__) {
      setState("checking");
      setTimeout(() => {
        if (isMounted.current) setState("up_to_date");
      }, 1200);
      return;
    }
    _check();
  }, []);
  const downloadUpdate = useCallback(async () => {
    if (__DEV__) {
      setState("downloading");
      setProgress(0);
      let p = 0;
      const iv = setInterval(() => {
        p += 0.1;
        if (!isMounted.current) { clearInterval(iv); return; }
        if (p >= 1) {
          clearInterval(iv);
          setProgress(1);
          setState("ready");
        } else {
          setProgress(parseFloat(p.toFixed(1)));
        }
      }, 200);
      return;
    }

    setState("downloading");
    setProgress(0);
    setErrorMsg(null);
    try {
      await Updates.fetchUpdateAsync();
      if (isMounted.current) {
        setProgress(1);
        setState("ready");
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error("[OTA] download failed:", err);
      setErrorMsg(err.message || "Download failed");
      setState("error");
    }
  }, []);

  const restartApp = useCallback(async () => {
    if (__DEV__) {
      alert("[DEV] Would call Updates.reloadAsync() here.");
      setState("idle");
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.error("[OTA] reload failed:", err);
      setErrorMsg(err.message || "Restart failed");
      setState("error");
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setState("idle");
    setProgress(0);
    setErrorMsg(null);
  }, []);

  return {
    state,
    isChecking,
    isDownloading,
    isReady,
    updateAvailable,
    progress,
    errorMsg,
    checkForUpdate,
    downloadUpdate,
    downloadAndInstallUpdate: downloadUpdate,
    restartApp,
    dismissUpdate,
  };
}