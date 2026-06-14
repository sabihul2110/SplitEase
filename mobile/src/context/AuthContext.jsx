// SplitEase/mobile/src/context/AuthContext.jsx


import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet } from "react-native";
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import client from "../api/client";
import { STORAGE_KEY, ENDPOINTS } from "../config/api";
import { COLORS } from "../constants/theme";

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

async function registerPushTokenSilently() {
  try {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await client.post(ENDPOINTS.pushToken, { token: tokenData.data });
  } catch {}
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue:         1,
      duration:        250,
      useNativeDriver: true,
    }).start();
  }, []);

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
      const { data } = await client.get(ENDPOINTS.me);
      const freshUser = { ...parsed, ...data };
      setUser(freshUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setAuthChecked(true);
      await ExpoSplashScreen.hideAsync();
    }
  }

  async function login(userData) {
    const enriched = {
      ...userData,
      email_verified: userData.email_verified ?? false,
    };
    setUser(enriched);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
    registerPushTokenSilently();
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

  if (!authChecked) {
    return (
      <View style={styles.splash} />
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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

const styles = StyleSheet.create({
  splash: {
    flex:            1,
    backgroundColor: COLORS.bg,
    alignItems:      "center",
    justifyContent:  "center",
  },
  splashIcon: {
    width:  180,
    height: 180,
  },
});