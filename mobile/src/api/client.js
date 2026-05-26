// SplitEase/mobile/src/api/client.js

/**
 * api/client.js
 *
 * Axios instance for React Native.
 * - Reads JWT from AsyncStorage (async, unlike localStorage)
 * - Attaches Bearer token to every request
 * - On 401 → clears storage and navigates to Login
 *
 * Note: Navigation on 401 is done via navigationRef (set in App.js)
 * because we can't use hooks outside React components.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, STORAGE_KEY } from '../constants/api';

// Navigation reference — set by RootNavigator on mount
// so we can navigate from outside React components
let _navigationRef = null;
export function setNavigationRef(ref) {
  _navigationRef = ref;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach JWT ──────────────────────────────────────────────────
client.interceptors.request.use(async (config) => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { access_token } = JSON.parse(saved);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    }
  } catch {
    // Silently ignore storage errors — request goes without token
  }
  return config;
});

// ── Response: handle 401 globally ────────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {}
      // Navigate to Login screen, resetting the stack
      if (_navigationRef?.isReady()) {
        _navigationRef.resetRoot({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Login' } }],
        });
      }
    }
    return Promise.reject(error);
  }
);

export default client;