// SplitEase/mobile/src/components/global/OTAUpdateModal.jsx
//
// OTA update modal — full state machine UI.
//
// IMPORTANT: During "downloading" state the modal is NOT dismissable.
// The user MUST keep the app open. If they close during download,
// the download cancels and they have to start over next time.
// This matches how most apps (including Expo Go) handle OTA updates.
//
// FAKE_UPDATE: Set to true in DEV to simulate the full flow.
// The fake download takes ~2 seconds with animated progress.
// Set to false before shipping.

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useOTAUpdate } from '../../hooks/useOTAUpdate';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const FAKE_UPDATE = false;

export function OTAUpdateModal() {
  const {
    state,
    updateAvailable,
    isDownloading,
    isReady,
    progress,
    downloadUpdate,
    restartApp,
    dismissUpdate,
  } = useOTAUpdate({ autoCheck: true });

  const visible = updateAvailable || isDownloading || isReady;
  if (!visible) return null;

  const pct = Math.round((progress || 0) * 100);

  // During download: block back button and make modal non-dismissable
  const canDismiss = !isDownloading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Prevent closing by tapping outside or back button during download
      onRequestClose={() => { if (canDismiss) dismissUpdate(); }}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>

          {/* App icon */}
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.title}>
            {isReady      ? 'Ready to Restart'
             : isDownloading ? 'Downloading…'
             : 'Update Available'}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {isReady ? 'Ready to apply' : 'A new version is available'}
          </Text>

          {/* State-specific content */}

          {/* Available */}
          {updateAvailable && (
            <Text style={styles.body}>
              A new version of SplitEase is ready. Tap Download — keep the app open until it finishes.
            </Text>
          )}

          {/* Downloading — progress block */}
          {isDownloading && (
            <View style={styles.progressBlock}>
              {/* Big percentage */}
              <Text style={styles.pctBig}>{pct}%</Text>
              {/* Track */}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              {/* Warning — DON'T close */}
              <View style={styles.warningRow}>
                <Text style={styles.warningDot}>⚠</Text>
                <Text style={styles.warningText}>
                  Keep this screen open. Closing the app will cancel the download.
                </Text>
              </View>
            </View>
          )}

          {/* Ready */}
          {isReady && (
            <Text style={styles.body}>
              Download complete. Tap Restart Now to apply the update.
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>

            {/* Available: Later + Download */}
            {updateAvailable && (
              <>
                <TouchableOpacity style={styles.ghostBtn} onPress={dismissUpdate}>
                  <Text style={styles.ghostBtnText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={downloadUpdate}>
                  <Text style={styles.primaryBtnText}>Download</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Downloading: no buttons */}
            {isDownloading && (
              <View style={styles.downloadingNote}>
                <Text style={styles.downloadingNoteText}>Please wait…</Text>
              </View>
            )}

            {/* Ready: Later + Restart */}
            {isReady && (
              <>
                <TouchableOpacity style={styles.ghostBtn} onPress={dismissUpdate}>
                  <Text style={styles.ghostBtnText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={restartApp}>
                  <Text style={styles.primaryBtnText}>Restart Now</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border2,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
  },

  icon: {
    width: 80,
    height: 80,
    // No borderRadius — icon.png already has it baked in
    marginBottom: 4,
  },

  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Progress block
  progressBlock: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pctBig: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primaryH,
    letterSpacing: -1,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primaryH,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  warningDot: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
    lineHeight: 18,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.xs,
  },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.base,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.base,
  },
  downloadingNote: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  downloadingNoteText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text3,
  },
});