// SplitEase/mobile/src/screens/auth/VerifyEmailScreen.jsx

import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authApi from "../../api/auth";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from "../../constants/theme";

export default function VerifyEmailScreen() {
  const { user, updateUser } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [error,     setError]     = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setVerifying(true); setError("");
    try {
      await authApi.verifyEmail(otp.trim());
      // Mark verified → RootNavigator will switch to Main automatically
      await updateUser({ email_verified: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

  async function handleResend() {
    setResending(true); setError(""); setResent(false);
    try {
      await authApi.resendVerification();
      setResent(true);
    } catch (err) {
      const s = err.response?.status;
      setError(s === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again shortly.");
    } finally { setResending(false); }
  }

  async function handleSkip() {
    // Let them in but keep email_verified: false so banners show
    await updateUser({ email_verified: false, skip_verify: true });
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.logoWrap}>
            <Image
              source={require("../../../assets/icon.png")}
              style={s.logo} resizeMode="contain"
            />
            <Text style={s.appName}>
              Split<Text style={{ color: COLORS.primary }}>Ease</Text>
            </Text>
          </View>

          <View style={s.card}>
            <View style={s.iconCircle}>
              <Text style={s.iconEmoji}>✉️</Text>
            </View>

            <Text style={s.heading}>Check your inbox</Text>
            <Text style={s.sub}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ color: COLORS.text, fontWeight: FONT_WEIGHT.semibold }}>
                {user?.email}
              </Text>
            </Text>

            {!!error && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            )}

            {resent && (
              <View style={s.successBanner}>
                <Text style={s.successText}>✓ Code resent — check your inbox.</Text>
              </View>
            )}

            <Input
              label="Verification code"
              value={otp}
              onChangeText={v => { setOtp(v.replace(/\D/g, "")); setError(""); }}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{ textAlign: "center", letterSpacing: 14, fontSize: 26, fontWeight: FONT_WEIGHT.bold }}
            />

            <Button
              title={verifying ? "Verifying…" : "Verify Email"}
              onPress={handleVerify}
              loading={verifying}
              fullWidth size="lg"
            />

            <TouchableOpacity
              onPress={handleResend} disabled={resending}
              style={s.resendBtn}
            >
              <Text style={s.resendText}>
                Didn't receive it?{" "}
                <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold }}>
                  {resending ? "Sending…" : "Resend code"}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
              <Text style={s.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flexGrow: 1, justifyContent: "center", padding: SPACING.base, gap: SPACING.xl, paddingVertical: SPACING["2xl"] },
  logoWrap:{ alignItems: "center", gap: SPACING.sm },
  logo:    { width: 72, height: 72 },
  appName: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.base,
    alignItems: "stretch",
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1, borderColor: "rgba(37,99,235,0.2)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 4,
  },
  iconEmoji: { fontSize: 26 },
  heading:  { fontSize: FONT_SIZE["2xl"], fontWeight: FONT_WEIGHT.bold, color: COLORS.text, textAlign: "center" },
  sub:      { fontSize: FONT_SIZE.base, color: COLORS.text2, textAlign: "center", lineHeight: 22 },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  errorText:   { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  successBanner: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  successText: { fontSize: FONT_SIZE.sm, color: COLORS.success },
  resendBtn:   { alignItems: "center", paddingVertical: SPACING.sm },
  resendText:  { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  skipBtn:     { alignItems: "center" },
  skipText:    { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
});