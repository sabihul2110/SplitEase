// SplitEase/mobile/src/screens/auth/ForgotPasswordScreen.jsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import AppAlert from '../../components/common/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as authApi from "../../api/auth";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import { Icons } from '../../components/icons/icons';
import Input  from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ForgotPasswordScreen({ navigation }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [alert,   setAlert]   = useState(null);

  async function handleSubmit() {
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword');
    } catch (err) {
      const httpStatus = err.response?.status;
      const errMsg = err.response?.data?.detail;

      if (httpStatus === 429) {
        setAlert({
          title: 'Too Many Attempts',
          message: 'You have requested too many reset codes. Please wait a few minutes before trying again.',
          buttons: [{ text: 'OK', onPress: () => setAlert(null) }],
        });
      } else if (httpStatus === 503) {
        setAlert({
          title: 'Email Service Unavailable',
          message: 'We could not send the reset email right now. Please try again in a few minutes.',
          buttons: [{ text: 'OK', onPress: () => setAlert(null) }],
        });
      } else {
        // Unknown errors: redirect anyway (don't leak whether email exists)
        setAlert({
          title: 'Something Went Wrong',
          message: errMsg || 'Could not connect to server. Please check your connection.',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setAlert(null);
                navigation.navigate('ResetPassword');
              },
            },
          ],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppAlert config={alert} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icons.chevronLeft size={20} color={COLORS.primary} />
            <Text style={styles.backText}>Back to login</Text>
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logoImage} 
              resizeMode="cover"
            />
            <Text style={styles.appName}>
              Split<Text style={{ color: COLORS.primary }}>Ease</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Forgot Password</Text>
            <Text style={styles.hint}>
              Enter your registered email and we'll send you a 6-digit reset code.
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
              title={loading ? 'Sending Code…' : 'Send Reset Code'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth size="lg"
            />
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
  logoImage: { width: 64, height: 64, borderRadius: 16 },
  appName:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, gap: SPACING.base,
  },
  heading: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  hint:    { fontSize: FONT_SIZE.sm, color: COLORS.text2, lineHeight: 20 },
});