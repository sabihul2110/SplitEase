// SplitEase/mobile/src/api/client.js


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, STORAGE_KEY } from '../config/api';

// Navigation reference — set by RootNavigator on mount
// so we can navigate from outside React components
let _navigationRef = null;
export function setNavigationRef(ref) {
  _navigationRef = ref;
}
export function getNavigationRef() {
  return _navigationRef;
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
    // A 401 from the logout call itself is expected once the session is
    // already gone — must NOT re-trigger logout here, or
    // logout() -> this 401 -> logout() again loops forever.
    const isLogoutCall = error.config?.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !isLogoutCall) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {}
      if (global.__authLogout) {
        global.__authLogout();
      } else if (_navigationRef?.isReady()) {
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