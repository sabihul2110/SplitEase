// SplitEase/mobile/src/screens/auth/ForgotPasswordScreen.jsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Icons } from '../../constants/icons';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ForgotPasswordScreen({ navigation }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit() {
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true); setError('');
    try {
      await client.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      // Always show success to prevent enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.chevronLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back to login</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.appName}>SplitEase</Text>
          </View>

          <View style={styles.card}>
            {sent ? (
              <View style={{ alignItems: 'center', gap: SPACING.md }}>
                <Text style={styles.heading}>Check your email</Text>
                <Text style={styles.hint}>
                  If that email is registered, a reset link has been sent. Check your inbox (and spam folder).
                </Text>
                <Text style={[styles.hint, { color: COLORS.text3 }]}>
                  The link expires in 15 minutes.
                </Text>
                <Button
                  title="Back to Login"
                  onPress={() => navigation.navigate('Login')}
                  fullWidth size="lg"
                  style={{ marginTop: SPACING.sm }}
                />
              </View>
            ) : (
              <>
                <Text style={styles.heading}>Forgot Password</Text>
                <Text style={styles.hint}>
                  Enter your registered email and we'll send you a reset link.
                </Text>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={error}
                  autoFocus
                />
                <Button
                  title={loading ? 'Sending…' : 'Send Reset Link'}
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth size="lg"
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flexGrow: 1, padding: SPACING.base, gap: SPACING.xl, justifyContent: 'center' },
  back:    { 
    position: 'absolute', 
    top: SPACING.base, 
    left: SPACING.base, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    zIndex: 10 
  },
  backText:{ color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  logoWrap:  { alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  logoBox:   {
    width: 56, height: 56, backgroundColor: COLORS.primary,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  logoText:  { fontSize: 28, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.white },
  appName:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, gap: SPACING.base,
  },
  heading: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  hint:    { fontSize: FONT_SIZE.sm, color: COLORS.text2, lineHeight: 20 },
});