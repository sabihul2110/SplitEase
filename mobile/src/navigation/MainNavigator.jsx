// SplitEase/mobile/src/navigation/MainNavigator.jsx

/**
 * MainNavigator.jsx
 *
 * Main app navigation after login.
 * Structure:
 *   BottomTabs
 *     ├── Dashboard (stack: DashboardScreen)
 *     ├── Groups    (stack: GroupsScreen → GroupDetailScreen → AddExpenseScreen → AddPaymentScreen)
 *     ├── Settle    (stack: SettlementsScreen)
 *     ├── Activity  (stack: ActivityScreen)
 *     └── More      (stack: NotificationsScreen, SettingsScreen)
 *
 * Nested stacks live inside tab screens so that tab bar is visible
 * on list screens but hidden on detail/form screens.
 */

import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONT_SIZE, SPACING } from '../constants/theme';

// Screens
import DashboardScreen     from '../screens/main/DashboardScreen';
import GroupsScreen        from '../screens/groups/GroupsScreen';
import GroupDetailScreen   from '../screens/groups/GroupDetailScreen';
import AddExpenseScreen    from '../screens/expenses/AddExpenseScreen';
import AddPaymentScreen    from '../screens/expenses/AddPaymentScreen';
import SettlementsScreen   from '../screens/settlements/SettlementsScreen';
import ActivityScreen      from '../screens/activity/ActivityScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen      from '../screens/settings/SettingsScreen';

// ── Tab icons (pure RN — no icon library dependency) ──────────────────────
function TabIcon({ label, focused }) {
  const icons = {
    Dashboard: focused ? '⬡' : '⬡',
    Groups:    '◫',
    Settle:    '⇄',
    Activity:  '◎',
    More:      '···',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{
        fontSize: label === 'More' ? 10 : 18,
        color: focused ? COLORS.primary : COLORS.text3,
        fontWeight: focused ? '700' : '400',
        lineHeight: 22,
      }}>
        {icons[label] || '○'}
      </Text>
    </View>
  );
}

// ── Stacks ─────────────────────────────────────────────────────────────────
const GroupStack = createNativeStackNavigator();
function GroupsStack() {
  return (
    <GroupStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupStack.Screen name="GroupsList"   component={GroupsScreen} />
      <GroupStack.Screen name="GroupDetail"  component={GroupDetailScreen} />
      <GroupStack.Screen name="AddExpense"   component={AddExpenseScreen} />
      <GroupStack.Screen name="AddPayment"   component={AddPaymentScreen} />
    </GroupStack.Navigator>
  );
}

const DashStack = createNativeStackNavigator();
function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="DashboardHome" component={DashboardScreen} />
    </DashStack.Navigator>
  );
}

const SettleStack = createNativeStackNavigator();
function SettlementsStack() {
  return (
    <SettleStack.Navigator screenOptions={{ headerShown: false }}>
      <SettleStack.Screen name="SettlementsHome" component={SettlementsScreen} />
    </SettleStack.Navigator>
  );
}

const ActivityStack = createNativeStackNavigator();
function ActivityTabStack() {
  return (
    <ActivityStack.Navigator screenOptions={{ headerShown: false }}>
      <ActivityStack.Screen name="ActivityHome" component={ActivityScreen} />
    </ActivityStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreTabStack() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="Settings"      component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

// ── Bottom Tab Navigator ───────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          height:          Platform.OS === 'ios' ? 84 : 62,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
          paddingTop:      8,
        },
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '500',
          marginTop:  2,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack}    />
      <Tab.Screen name="Groups"    component={GroupsStack}       />
      <Tab.Screen name="Settle"    component={SettlementsStack}   />
      <Tab.Screen name="Activity"  component={ActivityTabStack}  />
      <Tab.Screen name="More"      component={MoreTabStack}      />
    </Tab.Navigator>
  );
}