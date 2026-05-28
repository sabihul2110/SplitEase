// SplitEase/mobile/src/screens/auth/ResetPasswordScreen.jsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ResetPasswordScreen({ navigation }) {
  const [token,   setToken]   = useState('');
  const [pass,    setPass]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [errors,  setErrors]  = useState({});

  function validate() {
    const e = {};
    if (!token.trim())    e.token   = 'Required';
    if (!pass)            e.pass    = 'Required';
    if (pass.length < 6)  e.pass    = 'At least 6 characters';
    if (pass !== confirm) e.confirm  = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await client.post('/auth/reset-password', {
        token:            token.trim(),
        new_password:     pass,
        confirm_password: confirm,
      });
      setDone(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrors({ token: typeof detail === 'string' ? detail : 'Invalid or expired token.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {done ? (
              <View style={{ alignItems: 'center', gap: SPACING.md }}>
                <Text style={styles.heading}>Password Reset ✓</Text>
                <Text style={styles.hint}>Your password has been updated. Please log in with your new password.</Text>
                <Button title="Go to Login" onPress={() => navigation.navigate('Login')} fullWidth size="lg" />
              </View>
            ) : (
              <>
                <Text style={styles.heading}>Reset Password</Text>
                <Text style={styles.hint}>Paste the token from your reset email, then enter your new password.</Text>
                <Input
                  label="Reset Token"
                  value={token}
                  onChangeText={v => { setToken(v); setErrors(e => ({ ...e, token: null })); }}
                  placeholder="Paste token from email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.token}
                  autoFocus
                />
                <Input
                  label="New Password"
                  value={pass}
                  onChangeText={v => { setPass(v); setErrors(e => ({ ...e, pass: null })); }}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  error={errors.pass}
                />
                <Input
                  label="Confirm Password"
                  value={confirm}
                  onChangeText={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: null })); }}
                  placeholder="Repeat new password"
                  secureTextEntry
                  error={errors.confirm}
                />
                <Button
                  title={loading ? 'Resetting…' : 'Reset Password'}
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
  scroll:  { flexGrow: 1, padding: SPACING.base, justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, gap: SPACING.base,
  },
  heading: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  hint:    { fontSize: FONT_SIZE.sm, color: COLORS.text2, lineHeight: 20 },
});