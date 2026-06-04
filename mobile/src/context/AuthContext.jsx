// SplitEase/mobile/src/context/AuthContext.jsx
//
// Auth state + Instagram-style splash screen.
// Splash: icon centered on full dark screen, no border radius, large.
// Fades in on mount, fades out before revealing app.

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Image, Animated, StyleSheet } from "react-native";
import client from "../api/client";
import { STORAGE_KEY, ENDPOINTS } from "../config/api";
import { COLORS } from "../constants/theme";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Two-phase animation: fade in → hold → fade out
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current; // overlay that covers children

  useEffect(() => {
    // Fade the icon in immediately
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
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

  // While checking auth, show full-screen splash
  if (!authChecked) {
    return (
      <View style={styles.splash}>
        <Animated.Image
          source={require("../../assets/adaptive-icon.png")}
          style={[styles.splashIcon, { opacity: fadeIn }]}
          resizeMode="contain"
        />
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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  // Instagram uses ~140–160pt icon on a full screen.
  // No border radius on the icon itself — the icon asset already has shape baked in.
  splashIcon: {
    width: 120,
    height: 120,
  },
});