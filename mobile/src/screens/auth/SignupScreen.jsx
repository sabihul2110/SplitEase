// SplitEase/mobile/src/screens/auth/SignupScreen.jsx

/**
 * SignupScreen.jsx
 * New user registration. First user to sign up becomes admin automatically (backend handles this).
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

export default function SignupScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', upi_id: '',
  });
  const [loading, setLoading]  = useState(false);
  const [errors,  setErrors]   = useState({});

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())               e.name     = 'Name is required';
    if (!form.email.trim())              e.email    = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email  = 'Enter a valid email';
    if (!form.password)                  e.password = 'Password is required';
    if (form.password.length < 6)        e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      };
      if (form.upi_id.trim()) payload.upi_id = form.upi_id.trim();

      const { data } = await client.post(ENDPOINTS.signup, payload);

      await login({
        access_token: data.access_token,
        user_id:      data.user_id,
        name:         data.name,
        email:        data.email,
        role:         data.role,
      });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Signup failed. Please try again.';
      Alert.alert('Signup Failed', msg);
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
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Join and start splitting expenses</Text>

            <View style={styles.fields}>
              <Input
                label="Full Name"
                value={form.name}
                onChangeText={v => set('name', v)}
                placeholder="Alex Johnson"
                autoCapitalize="words"
                error={errors.name}
              />
              <Input
                label="Email"
                value={form.email}
                onChangeText={v => set('email', v)}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                value={form.password}
                onChangeText={v => set('password', v)}
                placeholder="At least 6 characters"
                secureTextEntry
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                value={form.confirmPassword}
                onChangeText={v => set('confirmPassword', v)}
                placeholder="Repeat your password"
                secureTextEntry
                error={errors.confirmPassword}
              />
              <Input
                label="UPI ID (optional)"
                value={form.upi_id}
                onChangeText={v => set('upi_id', v)}
                placeholder="yourname@upi"
                hint="Used for settlement payments"
                autoCapitalize="none"
              />
            </View>

            <Button
              title={loading ? 'Creating account…' : 'Create Account'}
              onPress={handleSignup}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  kav:     { flex: 1 },
  scroll:  {
    flexGrow: 1, justifyContent: 'center',
    padding: SPACING.base, gap: SPACING.xl,
    paddingVertical: SPACING['2xl'],
  },
  logoWrap:  { alignItems: 'center', gap: SPACING.sm },
  logoBox:   {
    width: 56, height: 56, backgroundColor: COLORS.primary,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  logoText:  { fontSize: 28, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  appName:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  card:      {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, gap: SPACING.base,
  },
  heading:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  subheading:{ fontSize: FONT_SIZE.base, color: COLORS.text2, marginBottom: SPACING.sm },
  fields:    { gap: SPACING.base },
  submitBtn: { marginTop: SPACING.sm },
  footer:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText:{ fontSize: FONT_SIZE.base, color: COLORS.text2 },
  footerLink:{ fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});