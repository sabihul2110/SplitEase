// SplitEase/mobile/src/components/layout/ScreenWrapper.jsx

import React from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';

export default function ScreenWrapper({
  children,
  header,
  scroll        = true,
  refreshing    = false,
  onRefresh,
  padHorizontal = true,
  padBottom     = true,
  style,
  contentStyle,
}) {
  const content = (
    <View style={[
      styles.content,
      padHorizontal && styles.px,
      padBottom     && styles.pb,
      contentStyle,
    ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['left', 'right', 'bottom']}>
      {/* 🔥 Make status bar translucent to draw behind it seamlessly */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      {header && <View style={styles.headerWrapper}>{header}</View>}

      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerWrapper: {
    width: '100%',
    zIndex: 10,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  px: {
    paddingHorizontal: SPACING.base,
  },
  pb: {
    paddingBottom: SPACING.xl,
  },
});