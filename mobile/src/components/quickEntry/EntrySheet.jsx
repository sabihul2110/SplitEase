// SplitEase/mobile/src/components/quickEntry/EntrySheet.jsx

import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import EntryForm from './EntryForm';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS } from '../../constants/theme';

export default function EntrySheet({
  title, requireAmount, defaultAmount, defaultTime,
  isGroup, groupId, onClose, onSubmit,
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Persistent full-screen dim — a sibling of the KeyboardAvoidingView,
          not a child of it, so it never shrinks when the keyboard resizes
          the sheet below (Android 'height' behavior shrinks its own View,
          which used to expose undimmed screen behind it). */}
      <View style={styles.backdrop} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <EntryForm
            requireAmount={requireAmount}
            defaultAmount={defaultAmount}
            defaultTime={defaultTime}
            isGroup={isGroup}
            groupId={groupId}
            onCancel={onClose}
            onSubmit={onSubmit}
            beforeFields={<Text style={styles.title}>{title}</Text>}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 2,
  },
  title: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
});