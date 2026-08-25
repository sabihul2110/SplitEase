// SplitEase/mobile/src/screens/auth/AcceptTermsScreen.jsx

import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as authApi from "../../api/auth";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from "../../constants/theme";

// Hosted on the web app — no need to duplicate the full legal text natively.
const TERMS_URL   = "https://splitease-pied-nine.vercel.app/terms";
const PRIVACY_URL = "https://splitease-pied-nine.vercel.app/privacy";

export default function AcceptTermsScreen() {
  const { updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setLoading(true); setError("");
    try {
      await authApi.acceptTerms();
      await updateUser({ terms_accepted: true });
    } catch (err) {
      setError("Could not save your response. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoWrap}>
          <Image source={require("../../../assets/icon.png")} style={s.logo} resizeMode="contain" />
          <Text style={s.appName}>Split<Text style={{ color: COLORS.primary }}>Ease</Text></Text>
        </View>

        <View style={s.card}>
          <Text style={s.heading}>We've updated our Terms & Privacy Policy</Text>
          <Text style={s.sub}>Please review and accept before continuing.</Text>

          {!!error && (
            <View style={s.errorBanner}><Text style={s.errorText}>⚠ {error}</Text></View>
          )}

          <View style={{ flexDirection: "row", gap: 20, marginVertical: 16 }}>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={s.link}>Read Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={s.link}>Read Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <Button title={loading ? "Saving…" : "I Agree — Continue"} onPress={handleAccept}
            loading={loading} fullWidth size="lg" />

          <TouchableOpacity onPress={logout} style={{ alignItems: "center", marginTop: 14 }}>
            <Text style={s.declineText}>I don't agree — sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.xl, gap: SPACING.sm,
  },
  heading: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  sub:     { fontSize: FONT_SIZE.sm, color: COLORS.text2, marginBottom: 4 },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.danger },
  link:      { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  declineText: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
});