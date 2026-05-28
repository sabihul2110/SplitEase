// SplitEase/mobile/src/navigation/RootNavigator.jsx

/**
 * RootNavigator.jsx
 *
 * Top-level navigator. Shows Auth stack or Main tabs based on auth state.
 * Uses the navigation ref so axios interceptor can navigate on 401.
 */

import React, { useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { setNavigationRef } from '../api/client';
import { COLORS } from '../constants/theme';

// Auth screens
import LoginScreen    from '../screens/auth/LoginScreen';
import SignupScreen   from '../screens/auth/SignupScreen';

import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen  from '../screens/auth/ResetPasswordScreen';

// Main navigator (tabs + nested stacks)
import MainNavigator  from './MainNavigator';

const Stack = createNativeStackNavigator();

// Custom nav theme — keeps backgrounds dark everywhere
const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background:  COLORS.bg,
    card:        COLORS.surface,
    text:        COLORS.text,
    border:      COLORS.border,
    primary:     COLORS.primary,
  },
};

export default function RootNavigator() {
  const { user } = useAuth();
  const navRef   = useRef(null);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => setNavigationRef(navRef.current)}
      theme={NAV_THEME}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Login"  component={LoginScreen}  />
            <Stack.Screen name="Signup" component={SignupScreen} />

            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen}  />
            
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}