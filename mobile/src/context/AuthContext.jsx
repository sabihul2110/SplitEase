// SplitEase/mobile/src/context/AuthContext.jsx
//
// Auth state + splash screen.
//
// SPLASH EXPLANATION — why you see white then dark:
// There are TWO splash layers on Android:
//   1. Native splash (white screen) — controlled by app.json "splash.backgroundColor"
//      THIS is the white screen. Fix it in app.json by setting:
//        "splash": { "backgroundColor": "#0d0e14", "resizeMode": "contain", "image": "./assets/icon.png" }
//      This change requires a new build (eas build), NOT an OTA update.
//   2. JS splash (this file) — the dark screen with the icon.
//      This is what we control here.
//
// WHY THE ICON WAS TINY/INVISIBLE:
//   adaptive-icon.png has a TRANSPARENT background — on a dark screen, the logo
//   blends into the background and looks like a small dark shape.
//   icon.png has the dark rounded-square background BAKED IN — it's visible and
//   looks correct at any size. Always use icon.png for the JS splash.

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
    flex:            1,
    backgroundColor: COLORS.bg,
    alignItems:      "center",
    justifyContent:  "center",
  },
  splashIcon: {
    width:  220,
    height: 220,
  },
});