// SplitEase/mobile/src/components/global/UpdateChecker.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { Icons } from '../../constants/icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';
import Button from '../common/Button';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) return; // Don't check in development
      
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('Error checking for updates', e);
      }
    }
    checkForUpdates();
  }, []);

  const handleUpdate = async () => {
    setIsDownloading(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // This restarts the app with the new code
    } catch (e) {
      console.log('Error fetching update', e);
      setIsDownloading(false);
      setUpdateAvailable(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <Modal visible={updateAvailable} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconWrap}>
            <Icons.activity size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.body}>
            A new version of SplitEase is available with bug fixes and UX improvements.
          </Text>
          
          <View style={styles.row}>
            <Button
              title="Later"
              variant="ghost"
              onPress={() => setUpdateAvailable(false)}
              disabled={isDownloading}
              style={{ flex: 1 }}
            />
            
            <Button
              title={isDownloading ? "Updating..." : "Update Now"}
              variant="primary"
              onPress={handleUpdate}
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
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    alignItems: "center",
    justifyContent: "center",
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