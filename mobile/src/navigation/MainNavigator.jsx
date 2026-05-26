// SplitEase/mobile/src/navigation/MainNavigator.jsx

/**
 * MainNavigator.jsx
 *
 * 5 tabs matching the web sidebar:
 *   Dashboard | Groups | Loans | Activity | More (Settlements, Notifications, Settings)
 *
 * Settlements moved into "More" stack — matches web where it's a separate page
 * but less central than Dashboard/Groups/Loans.
 */

import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';

// Screens
import { Icons } from '../constants/icons';
import DashboardScreen     from '../screens/main/DashboardScreen';
import GroupsScreen        from '../screens/groups/GroupsScreen';
import GroupDetailScreen   from '../screens/groups/GroupDetailScreen';
import ExpensesScreen from '../screens/expenses/ExpensesScreen';
import AddExpenseScreen    from '../screens/expenses/AddExpenseScreen';
import AddPaymentScreen    from '../screens/expenses/AddPaymentScreen';
import LoansScreen         from '../screens/loans/LoansScreen';
import ActivityScreen      from '../screens/activity/ActivityScreen';
import SettlementsScreen   from '../screens/settlements/SettlementsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen      from '../screens/settings/SettingsScreen';
import ProfileScreen       from '../screens/settings/ProfileScreen';
import MoreScreen from '../screens/more/MoreScreen';

// ── Tab Icons ──────────────────────────────────────────────────────────────

function TabIcon({ name, focused }) {
  // Map the capitalized route names to your lowercased icon components
  const iconMap = {
    Dashboard: Icons.dashboard,
    Groups:    Icons.groups,
    Loans:     Icons.loans,
    Activity:  Icons.activity,
    More:      Icons.more, 
  };

  const IconComponent = iconMap[name];
  const color = focused ? COLORS.primary : COLORS.text3;

  // Fallback just in case an icon isn't found
  if (!IconComponent) {
    return <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }} />;
  }

  return <IconComponent size={24} color={color} />;
}

// ── Individual stacks ──────────────────────────────────────────────────────

const DashStack = createNativeStackNavigator();
function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashStack.Screen name="Expenses" component={ExpensesScreen} />
    </DashStack.Navigator>
  );
}

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

const LoanStack = createNativeStackNavigator();
function LoansStack() {
  return (
    <LoanStack.Navigator screenOptions={{ headerShown: false }}>
      <LoanStack.Screen name="LoansHome" component={LoansScreen} />
    </LoanStack.Navigator>
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
      <MoreStack.Screen name="MoreHome"      component={MoreScreen} />
      <MoreStack.Screen name="Expenses"      component={ExpensesScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="Settlements"   component={SettlementsScreen} />
      <MoreStack.Screen name="Settings"      component={SettingsScreen} />
      <MoreStack.Screen name="Profile"       component={ProfileScreen} />
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
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack}  />
      <Tab.Screen name="Groups"    component={GroupsStack}     />
      <Tab.Screen name="Loans"     component={LoansStack}      />
      <Tab.Screen name="Activity"  component={ActivityTabStack}/>
      <Tab.Screen name="More"      component={MoreTabStack}    />
    </Tab.Navigator>
  );
}