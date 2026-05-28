// SplitEase/mobile/App.js

/**
 * App.js — SplitEase Mobile Entry Point
 *
 * Minimal entry point. All real setup is in:
 * - AuthProvider  (context/AuthContext.jsx) — auth state + AsyncStorage
 * - RootNavigator (navigation/RootNavigator.jsx) — Auth ↔ Main stack swap
 *
 * react-native-screens must be enabled before NavigationContainer renders.
 */

import 'react-native-gesture-handler';

import { enableScreens } from 'react-native-screens';
enableScreens();

import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator    from './src/navigation/RootNavigator';
import { COLORS } from './src/constants/theme';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}

import { registerRootComponent } from 'expo';
// Note: You don't need "import App from './App';" here because you are already inside App.js

registerRootComponent(App);