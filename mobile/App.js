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

import 'react-native-gesture-handler'; // Must stay at the very top!

import { enableScreens } from 'react-native-screens';
enableScreens();

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator    from './src/navigation/RootNavigator';
import { COLORS } from './src/constants/theme';
import { OTAUpdateModal } from './src/components/global/OTAUpdateModal';
import { usePushNotifications } from './src/hooks/usePushNotifications';
// import SplashScreen from './src/components/SplashScreen';
import SplashScreen from './src/components/SplashScreenNew';
function AppInner() {
  usePushNotifications();
  return null;
}

export default function App() {
  const [splashDone, setSplashDone] = React.useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <AuthProvider>
          <AppInner />
          <RootNavigator />
          <OTAUpdateModal />
        </AuthProvider>

        {!splashDone && (
          <SplashScreen onFinish={() => setSplashDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { registerRootComponent } from 'expo';
registerRootComponent(App);