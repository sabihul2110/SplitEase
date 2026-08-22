// SplitEase/mobile/src/screens/auth/VerifyEmailScreen.jsx

import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image,
  TextInput, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authApi from "../../api/auth";
import Svg, { Path, Polyline } from "react-native-svg";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from "../../constants/theme";

function OtpBoxes({ value, onChange }) {
  const ref = useRef(null);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  return (
    <View style={{ position: "relative" }}>
      {/* Hidden real input captures keyboard */}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        caretHidden
        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", zIndex: 1 }}
      />
      {/* Visual boxes */}
      <TouchableOpacity activeOpacity={1} onPress={() => ref.current?.focus()}
        style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        {digits.map((d, i) => (
          <View key={i} style={[s.otpBox,
            value.length === i && s.otpBoxActive,
            d ? s.otpBoxFilled : null
          ]}>
            <Text style={s.otpDigit}>{d || ""}</Text>
          </View>
        ))}
      </TouchableOpacity>
    </View>
  );
}

export default function VerifyEmailScreen() {
  const { user, updateUser, logout } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [error,     setError]     = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);
  const [sending,   setSending]   = useState(true);
  const [codeSent,  setCodeSent]  = useState(false);

  // Icon drop-in animation
  const iconAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(iconAnim, {
      toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
    }).start();
  }, []);

  // Subtitle pulse when code arrives
  const subAnim = useRef(new Animated.Value(0)).current;
  function pulseSubtitle() {
    subAnim.setValue(0);
    Animated.timing(subAnim, {
      toValue: 1, duration: 350, useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    async function autoSend() {
      try {
        await authApi.resendVerification();
        setCodeSent(true);
        pulseSubtitle();
      } catch (err) {
        const status = err.response?.status;
        if (status === 429) {
          setCodeSent(true); // already sent recently
          pulseSubtitle();
        } else {
          setError("Could not send code. Tap 'Resend code' below.");
        }
      } finally {
        setSending(false);
      }
    }
    autoSend();
  }, []);

  async function handleVerify() {
    if (otp.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setVerifying(true); setError("");
    try {
      await authApi.verifyEmail(otp.trim());
      await updateUser({ email_verified: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

    async function handleSignOut() {
    await logout();
  }


  async function handleResend() {
    setResending(true); setError("");
    try {
      await authApi.resendVerification();
      setCodeSent(true);
      pulseSubtitle();
    } catch (err) {
      const status = err.response?.status;
      setError(status === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again shortly.");
    } finally { setResending(false); }
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
            {/* Animated icon */}
            <Animated.View style={[s.iconCircle, {
              transform: [
                { scale: iconAnim.interpolate({ inputRange: [0,1], outputRange: [0.7, 1] }) },
                { translateY: iconAnim.interpolate({ inputRange: [0,1], outputRange: [-12, 0] }) },
              ],
              opacity: iconAnim,
            }]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
                stroke={COLORS.text2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <Polyline points="22,6 12,13 2,6"/>
              </Svg>
            </Animated.View>

            <Text style={s.heading}>Check your inbox</Text>

            {/* Subtitle — shows sending state then fades to email when sent */}
            <Animated.Text style={[s.sub, {
              opacity: sending ? 0.5 : subAnim.interpolate({ inputRange: [0,1], outputRange: [0.5, 1] }),
            }]}>
              {sending ? "Sending code…" : codeSent
                ? <>Code sent to{"\n"}<Text style={{ color: COLORS.text, fontWeight: FONT_WEIGHT.semibold }}>{user?.email}</Text></>
                : "Enter code from your email below."
              }
            </Animated.Text>

            {!!error && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            )}

            <OtpBoxes value={otp} onChange={v => { setOtp(v); setError(""); }} />

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

            <TouchableOpacity onPress={handleSignOut} style={s.backBtn}>
              <Text style={s.backText}>Wrong email? Sign out and try again</Text>
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
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 4,
  },
  heading:  { fontSize: FONT_SIZE["2xl"], fontWeight: FONT_WEIGHT.bold, color: COLORS.text, textAlign: "center" },
  sub:      { fontSize: FONT_SIZE.base, color: COLORS.text2, textAlign: "center", lineHeight: 22 },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  errorText:   { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  resendBtn:   { alignItems: "center", paddingVertical: SPACING.sm },
  resendText:  { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  backBtn:     { alignItems: "center", paddingVertical: SPACING.xs },
  backText:    { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  otpBox: {
    width: 46, height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(37,99,235,0.06)",
  },
  otpBoxFilled: {
    borderColor: COLORS.primaryH,
  },
  otpDigit: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: 0,
  },
});