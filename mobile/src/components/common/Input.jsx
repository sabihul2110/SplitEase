// SplitEase/mobile/src/components/common/Input.jsx

/**
 * Input.jsx
 * Styled text input matching the web app's .form-group system.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../../constants/theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoCorrect    = false,
  error,
  hint,
  multiline,
  numberOfLines,
  editable = true,
  style,
  inputStyle,
  rightElement,
  ...props
}) {
  const [focused,    setFocused]    = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const isSecure = secureTextEntry && !showSecret;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <View style={[
        styles.inputWrap,
        focused && styles.inputFocused,
        error  && styles.inputError,
        !editable && styles.inputDisabled,
      ]}>
        <TextInput
          style={[
            styles.input,
            multiline && { height: numberOfLines ? numberOfLines * 22 : 80, textAlignVertical: 'top' },
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
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowSecret(v => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.eyeText}>{showSecret ? '○' : '●'}</Text>
          </TouchableOpacity>
        )}

        {rightElement && !secureTextEntry && (
          <View style={styles.rightEl}>{rightElement}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint  && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: '500',
    color:      COLORS.text2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.surface2,
    borderRadius:    RADIUS.md,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
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
    flex:       1,
    color:      COLORS.text,
    fontSize:   FONT_SIZE.md,
    paddingVertical: SPACING.md,
    fontWeight: '400',
  },
  eyeBtn: {
    paddingLeft: SPACING.sm,
  },
  eyeText: {
    color:    COLORS.text3,
    fontSize: FONT_SIZE.sm,
  },
  rightEl: {
    paddingLeft: SPACING.sm,
  },
  error: {
    fontSize: FONT_SIZE.sm,
    color:    COLORS.danger,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color:    COLORS.text3,
  },
});