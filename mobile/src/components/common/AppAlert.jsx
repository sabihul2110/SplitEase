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
                    btn.style === "destructive" && { color: "#ff453a", fontWeight: FONT_WEIGHT.bold },
                    btn.style === "cancel" && { color: COLORS.text },
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
    backgroundColor: "#0c0c10",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "#242a3d",
    padding: SPACING.xl,
    width: "100%",
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: "left",
    letterSpacing: -0.2,
  },
  message: {
    fontSize: FONT_SIZE.base,
    color: "#c2c6d4",
    textAlign: "left",
    lineHeight: 21,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDanger: {
    backgroundColor: "rgba(255, 69, 58, 0.16)",
  },
  btnGhost: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  btnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});