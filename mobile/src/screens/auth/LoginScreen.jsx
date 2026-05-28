// SplitEase/mobile/src/screens/auth/LoginScreen.jsx

/**
 * LoginScreen.jsx
 *
 * JWT login. On success → stores user in AsyncStorage via AuthContext.login()
 * Navigation to Main happens automatically because RootNavigator
 * watches user state and swaps Auth ↔ Main stacks.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function LoginScreen({ navigation }) {
  const { login }  = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password)        e.password = 'Password is required';
    if (email && !/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await client.post(ENDPOINTS.login, {
        email:    email.trim().toLowerCase(),
        password,
      });

      // Backend returns: { access_token, token_type, user_id, name, email, role }
      await login({
        access_token: data.access_token,
        user_id:      data.user_id,
        name:         data.name,
        email:        data.email,
        role:         data.role,
      });
      // Navigation happens automatically via RootNavigator
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.appName}>SplitEase</Text>
            <Text style={styles.tagline}>Split expenses, not friendships.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in to your account</Text>

            <View style={styles.fields}>
              <Input
                label="Email"
                value={email}
                onChangeText={v => { setEmail(v); setErrors(e => ({ ...e, email: null })); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
                autoCapitalize="none"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={v => { setPassword(v); setErrors(e => ({ ...e, password: null })); }}
                placeholder="Your password"
                secureTextEntry
                error={errors.password}
              />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end' }}
            >
              <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Button
              title={loading ? 'Signing in…' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: COLORS.bg,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow:       1,
    justifyContent: 'center',
    padding:        SPACING.base,
    gap:            SPACING.xl,
  },
  logoWrap: {
    alignItems: 'center',
    gap:         SPACING.sm,
  },
  logoBox: {
    width:           64,
    height:          64,
    backgroundColor: COLORS.primary,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoText: {
    fontSize:   32,
    fontWeight: FONT_WEIGHT.extrabold,
    color:      COLORS.white,
  },
  appName: {
    fontSize:   FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color:      COLORS.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: FONT_SIZE.base,
    color:    COLORS.text3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     COLORS.border,
    padding:         SPACING.xl,
    gap:             SPACING.base,
  },
  heading: {
    fontSize:   FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color:      COLORS.text,
  },
  subheading: {
    fontSize:    FONT_SIZE.base,
    color:       COLORS.text2,
    marginBottom: SPACING.sm,
  },
  fields: {
    gap: SPACING.base,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
  },
  footerText: {
    fontSize: FONT_SIZE.base,
    color:    COLORS.text2,
  },
  footerLink: {
    fontSize:   FONT_SIZE.base,
    color:      COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});