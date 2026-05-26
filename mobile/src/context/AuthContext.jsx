// SplitEase/mobile/src/context/AuthContext.jsx

/**
 * AuthContext.jsx
 *
 * Global auth state for React Native.
 * Mirrors the web app's AuthContext but uses AsyncStorage instead of localStorage.
 *
 * Flow:
 * 1. App mounts → read from AsyncStorage
 * 2. If token found → call /auth/me to validate
 * 3. If valid → set user state (app shows main screens)
 * 4. If invalid → clear storage (app shows login)
 * 5. authChecked prevents flash of wrong screen while validating
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import client from '../api/client';
import { STORAGE_KEY, ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/theme';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    validateSession();
  }, []);

  async function validateSession() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (!parsed?.access_token) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Validate with server
      const { data } = await client.get(ENDPOINTS.me);
      const freshUser = { ...parsed, ...data };
      setUser(freshUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function login(userData) {
    setUser(userData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  async function updateUser(updates) {
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Splash-like loading while we validate the token
  if (!authChecked) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        {/* Logo mark */}
        <View style={{
          width: 56, height: 56,
          backgroundColor: COLORS.primary,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            width: 20, height: 20,
            borderRadius: 10,
            borderWidth: 3,
            borderColor: COLORS.white,
            borderTopColor: COLORS.transparent,
          }} />
        </View>
        <ActivityIndicator color={COLORS.primary} size="small" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, authChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}