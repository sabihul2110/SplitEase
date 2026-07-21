// SplitEase/mobile/src/navigation/RootNavigator.jsx


import React, { useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { setNavigationRef } from '../api/client';
import { COLORS } from '../constants/theme';

// Auth screens
import LoginScreen    from '../screens/auth/LoginScreen';
import SignupScreen   from '../screens/auth/SignupScreen';

import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen  from '../screens/auth/ResetPasswordScreen';

// Main navigator (tabs + nested stacks)
import MainNavigator  from './MainNavigator';

// Admin screens — top-level, sibling to Main, reachable via
// navigation.navigate('AdminOverview') from any nested screen (React
// Navigation bubbles unresolved screen names up to ancestor navigators)
import AdminOverviewScreen from '../screens/admin/AdminOverviewScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminGroupsScreen from '../screens/admin/AdminGroupsScreen';
import AdminTransactionsScreen from '../screens/admin/AdminTransactionsScreen';

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
        {user && user.email_verified === false && !user.skip_verify ? (
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        ) : user ? (
          // Fully authenticated
          <Stack.Group>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="AdminOverview" component={AdminOverviewScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="AdminGroups" component={AdminGroupsScreen} />
            <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} />
          </Stack.Group>
        ) : (
          // Not logged in
          <Stack.Group>
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Signup"         component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}