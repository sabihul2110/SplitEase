// SplitEase/mobile/src/components/global/OTAUpdateModal.jsx

import React from 'react';
import { View, Text, Modal, StyleSheet, Image } from 'react-native';
import { useOTAUpdate } from '../../hooks/useOTAUpdate';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Button from '../common/Button';

export function OTAUpdateModal() {
  // 1. Pull the logic from your custom hook
  const { 
    updateAvailable, 
    isDownloading, 
    downloadAndInstallUpdate, 
    dismissUpdate 
  } = useOTAUpdate();

  // 2. If no update, render nothing
  if (!updateAvailable) return null;

  // 3. Render the UI
  return (
    <Modal visible={updateAvailable} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logoImage} 
            resizeMode="cover"
          />
          
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.body}>
            A new version of SplitEase is available.
          </Text>
          
          <View style={styles.row}>
            <Button
              title="Later"
              variant="ghost"
              onPress={dismissUpdate}
              disabled={isDownloading}
              style={{ flex: 1 }}
            />
            
            <Button
              title={isDownloading ? "Updating..." : "Update Now"}
              variant="primary"
              onPress={downloadAndInstallUpdate}
              loading={isDownloading}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border2,
    padding: SPACING.xl,
    width: "100%",
    gap: SPACING.md,
    alignItems: "center",
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  body: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text2,
    textAlign: "center",
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.sm,
    width: "100%",
  },
});