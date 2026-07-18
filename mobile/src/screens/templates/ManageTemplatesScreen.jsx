// SplitEase/mobile/src/screens/templates/ManageTemplatesScreen.jsx

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as quickTemplatesApi from '../../api/quickTemplates';
import ScreenHeader from '../../components/layout/ScreenHeader';
import { LoadingState, EmptyState } from '../../components/common/Ui';
import { Icons } from '../../components/icons';
import { TemplateIcon } from '../../constants/templateIcons';
import AppAlert from '../../components/common/AppAlert';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, TAB_BAR_HEIGHT } from '../../constants/theme';

export default function ManageTemplatesScreen() {
  const navigation = useNavigation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await quickTemplatesApi.getTemplates();
      setTemplates(data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(t) {
    setAlertConfig({
      title: 'Delete Template',
      message: `Delete "${t.name}"?`,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(null) },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setAlertConfig(null);
            await quickTemplatesApi.deleteTemplate(t.template_id);
            load();
          },
        },
      ],
    });
  }

  if (loading) return <LoadingState label="Loading templates…" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Quick Templates"
        showBack
        actions={
          <TouchableOpacity onPress={() => navigation.navigate('EditTemplate')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icons.plus size={22} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={templates}
        keyExtractor={(t) => String(t.template_id)}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: TAB_BAR_HEIGHT, gap: SPACING.sm }}
        ListEmptyComponent={
          <EmptyState icon="zap" title="No templates yet" subtitle="Add one to speed up daily logging." />
        }
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('EditTemplate', { template: item })}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}><TemplateIcon name={item.icon_name} size={18} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.group_id ? 'Group' : 'Personal'}
                  {item.default_amount != null ? ` · ₹${item.default_amount}` : ' · Variable'}
                  {' · '}{item.default_time?.slice(0, 5)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icons.trash size={18} color={COLORS.text3} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <AppAlert config={alertConfig} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.text3, marginTop: 2 },
});