// SplitEase/mobile/src/screens/auth/SignupScreen.jsx


import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authApi from "../../api/auth";
import Button from "../../components/common/Button";
import AppAlert from "../../components/common/AppAlert";
import Input from "../../components/common/Input";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function SignupScreen({ navigation }) {
  const { login, logout } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", upi_id: "",
  });
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [step,       setStep]       = useState("form");
  const [otp,        setOtp]        = useState("");
  const [otpError,   setOtpError]   = useState("");
  const [verifying,  setVerifying]  = useState(false);
  const [resending, setResending] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  function showAlert(title, message) {
    setAlertConfig({
      title,
      message,
      buttons: [{ text: "OK", onPress: () => setAlertConfig(null) }],
    });
  }
  
  async function handleVerify() {
    if (otp.length !== 6) { setOtpError("Enter the 6-digit code from your email."); return; }
    setVerifying(true); setOtpError("");
    try {
      await authApi.verifyEmail(otp.trim());
      navigation.replace("Main");
    } catch (err) {
      setOtpError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

    async function handleGoBack() {
    await logout();
    setStep("form");
    setOtp("");
    setOtpError("");
  }

  async function handleResend() {
    setResending(true); setOtpError("");
    try {
      await authApi.resendVerification();
    } catch (err) {
      const s = err.response?.status;
      setOtpError(s === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again shortly.");
    } finally { setResending(false); }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      if (form.upi_id.trim()) payload.upi_id = form.upi_id.trim();

      const { data } = await authApi.signup(payload);

      await login({
        access_token:   data.access_token,
        user_id:        data.user_id,
        name:           data.name,
        email:          data.email,
        role:           data.role,
        email_verified: data.email_verified ?? false,
      });
      setStep("verify");
    } catch (err) {
      const httpStatus = err.response?.status;
      if (httpStatus === 429) {
        showAlert("Too Many Attempts", "Please wait a few minutes before trying again.");
      } else if (httpStatus === 503) {
        showAlert("Email Unavailable", "Account created but verification email could not be sent. You can resend from your profile.");
      } else {
        showAlert("Signup Failed", err.response?.data?.detail || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <AppAlert config={alertConfig} />
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <Image source={require("../../../assets/adaptive-icon.png")}
                style={styles.logoImage} resizeMode="contain" />
              <Text style={styles.appName}>SplitEase</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Verify your email</Text>
              <Text style={styles.subheading}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: COLORS.text, fontWeight: FONT_WEIGHT.semibold }}>{form.email}</Text>
              </Text>
              <Input
                label="6-Digit Code"
                value={otp}
                onChangeText={v => { setOtp(v.replace(/\D/g, "")); setOtpError(""); }}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                error={otpError}
                style={{ textAlign: "center", letterSpacing: 12, fontSize: 24, fontWeight: FONT_WEIGHT.bold }}
              />
              <Button
                title={verifying ? "Verifying…" : "Verify Email"}
                onPress={handleVerify}
                loading={verifying}
                fullWidth size="lg"
              />
              <TouchableOpacity onPress={handleResend} disabled={resending}
                style={{ alignItems: "center", paddingVertical: SPACING.sm }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.text2 }}>
                  Didn't receive it?{" "}
                  <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold }}>
                    {resending ? "Sending…" : "Resend code"}
                  </Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGoBack}
                style={{ alignItems: "center", paddingVertical: SPACING.xs }}>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text3 }}>
                  ← Wrong email? Go back
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <AppAlert config={alertConfig} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require("../../../assets/adaptive-icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>
              Split<Text style={{ color: COLORS.primary }}>Ease</Text>
            </Text>
            <Text style={{ color: COLORS.text2 }}>Split Fair. Settle Fast.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>
              Join and start splitting expenses
            </Text>

            <View style={styles.fields}>
              <Input
                label="Full Name"
                value={form.name}
                onChangeText={(v) => set("name", v)}
                placeholder="Alex Johnson"
                autoCapitalize="words"
                error={errors.name}
              />
              <Input
                label="Email"
                value={form.email}
                onChangeText={(v) => set("email", v)}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                value={form.password}
                onChangeText={(v) => set("password", v)}
                placeholder="At least 6 characters"
                secureTextEntry
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                value={form.confirmPassword}
                onChangeText={(v) => set("confirmPassword", v)}
                placeholder="Repeat your password"
                secureTextEntry
                error={errors.confirmPassword}
              />
              <Input
                label="UPI ID (optional)"
                value={form.upi_id}
                onChangeText={(v) => set("upi_id", v)}
                placeholder="yourname@upi"
                hint="Used for settlement payments"
                autoCapitalize="none"
              />
            </View>

            <Button
              title={loading ? "Creating account…" : "Create Account"}
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
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING.base,
    gap: SPACING.xl,
    paddingVertical: SPACING["2xl"],
  },
  logoWrap: { alignItems: "center", gap: SPACING.sm },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.base,
  },
  heading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subheading: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text2,
    marginBottom: SPACING.sm,
  },
  fields: { gap: SPACING.base },
  submitBtn: { marginTop: SPACING.sm },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: FONT_SIZE.base, color: COLORS.text2 },
  footerLink: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
