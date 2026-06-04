// SplitEase/mobile/src/hooks/useOTAUpdate.js

import { useState, useEffect } from 'react';
import * as Updates from 'expo-updates';

export function useOTAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) return;
      
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('[OTA] Error checking for updates:', error);
      }
    }
    checkForUpdates();
  }, []);

  const downloadAndInstallUpdate = async () => {
    setIsDownloading(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[OTA] Error fetching update:', error);
      setIsDownloading(false);
      setUpdateAvailable(false);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  // Expose exactly what the UI needs to know, and nothing more.
  return {
    updateAvailable,
    isDownloading,
    downloadAndInstallUpdate,
    dismissUpdate,
  };
}