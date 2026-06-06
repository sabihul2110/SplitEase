// SplitEase/mobile/src/components/common/AppAlert.jsx


import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from "../../constants/theme";

export default function AppAlert({ config }) {
  if (!config) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={s.overlay}>
        <View style={s.box}>
          {!!config.title && <Text style={s.title}>{config.title}</Text>}
          {!!config.message && <Text style={s.message}>{config.message}</Text>}
          <View style={s.btnRow}>
            {(config.buttons || [{ text: "OK" }]).map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.btn,
                  btn.style === "destructive" && s.btnDanger,
                  btn.style === "cancel" && s.btnGhost,
                  !btn.style && s.btnPrimary,
                ]}
                onPress={btn.onPress}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.btnText,
                    btn.style === "destructive" && { color: COLORS.white },
                    btn.style === "cancel" && { color: COLORS.text2 },
                    !btn.style && { color: COLORS.white },
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  box: {
    backgroundColor: "#171c2c",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "#242a3d",
    padding: SPACING.xl,
    width: "100%",
    gap: SPACING.sm,
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  message: {
    fontSize: FONT_SIZE.sm,
    color: "#8892b0",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
    marginTop: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDanger: {
    backgroundColor: "rgba(239,68,68,0.85)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  btnGhost: {
    backgroundColor: "#1e2438",
    borderWidth: 1,
    borderColor: "#2e3650",
  },
  btnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});