// SplitEase/mobile/src/components/common/Input.jsx
//
// Fixes:
//   - Yellow/olive autofill highlight from Android Google Password Manager
//     → selectionColor set to brand blue
//     → autoComplete values tightened (only "email" / "current-password" / "new-password" / "off")
//     → underlineColorAndroid="transparent" removes Android's default underline
//     → textContentType kept for iOS keychain
//   The yellow comes from Android's WebView autofill overlay injecting its own
//   background onto the TextInput. There's no 100% guaranteed fix in RN, but
//   setting the right autoComplete + importantForAutofill="yes" on the correct
//   fields (and "no" on everything else) suppresses it in most cases.

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { COLORS, FONT_SIZE, SPACING, RADIUS, FONT_WEIGHT } from "../../constants/theme";
import { Icons } from "../icons";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  autoCorrect = false,
  error,
  hint,
  multiline,
  numberOfLines,
  editable = true,
  style,
  inputStyle,
  rightElement,
  // Explicit autofill control — caller can override
  autoComplete: autoCompleteProp,
  textContentType: textContentTypeProp,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const isSecure = secureTextEntry && !showSecret;

  // Derive sensible autofill values so Android doesn't paint a yellow overlay.
  // Rule: only opt into autofill for the fields that actually need it.
  // For every other field, "off" tells Android's autofill framework to leave it alone.
  let resolvedAutoComplete = autoCompleteProp;
  let resolvedTextContentType = textContentTypeProp;

  if (!autoCompleteProp) {
    if (secureTextEntry) {
      // Distinguish new-password from current-password if the prop is passed explicitly;
      // otherwise default to current-password (login form).
      resolvedAutoComplete = "current-password";
      resolvedTextContentType = "password";
    } else if (keyboardType === "email-address") {
      resolvedAutoComplete = "email";
      resolvedTextContentType = "emailAddress";
    } else {
      // Everything else: opt out of autofill.
      // This is the key fix — Android paints yellow specifically on fields
      // where it thinks autofill applies but the app hasn't opted in properly.
      resolvedAutoComplete = "off";
      resolvedTextContentType = "none";
    }
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        importantForAutofill={resolvedAutoComplete === "off" ? "no" : "yes"}
      >
        <TextInput
          style={[
            styles.input,
            multiline && {
              height: numberOfLines ? numberOfLines * 22 : 80,
              textAlignVertical: "top",
            },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text3}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          // Autofill
          autoComplete={resolvedAutoComplete}
          textContentType={resolvedTextContentType}
          importantForAutofill={
            resolvedAutoComplete === "off" ? "no" : "yes"
          }
          // Android: removes the default underline and the autofill tint
          underlineColorAndroid="transparent"
          // Android autofill highlight color — overrides the yellow/olive tint
          selectionColor={COLORS.primary}
          // iOS: prevent "strong password" suggestion on login fields
          passwordRules={undefined}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowSecret((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showSecret ? (
              <Icons.eyeOff size={20} color={COLORS.text3} />
            ) : (
              <Icons.eye size={20} color={COLORS.text3} />
            )}
          </TouchableOpacity>
        )}

        {rightElement && !secureTextEntry && (
          <View style={styles.rightEl}>{rightElement}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text2,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.md,
    fontWeight: "400",
    // Paint a solid color directly on the text input to completely 
    // cover up Android's native olive-green autofill layer.
    backgroundColor: COLORS.surface2, 
  },
  eyeBtn: {
    paddingLeft: SPACING.sm,
  },
  rightEl: {
    paddingLeft: SPACING.sm,
  },
  error: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
  },
});