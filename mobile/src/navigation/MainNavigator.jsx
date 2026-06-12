// SplitEase/mobile/src/navigation/MainNavigator.jsx
//
// FIX: SettingsScreen added to both MoreTabStack and DashStack
// so it's reachable via navigation.navigate("Settings") from anywhere.
// Industry pattern (Instagram, Linear):
//   Profile tab = identity (your posts / your data)
//   Settings = gear/hamburger → separate screen (not a tab)
// Here: Settings is accessed from MenuScreen (More tab).

import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS } from "../constants/theme";
import { Icons } from "../components/icons/icons";

// Screens
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import GroupsScreen from "../screens/groups/GroupsScreen";
import GroupDetailScreen from "../screens/groups/GroupDetailScreen";
import ExpensesScreen from "../screens/expenses/ExpensesScreen";
import AddGroupExpenseScreen from "../screens/groups/AddGroupExpenseScreen";
import AddGroupPaymentScreen from "../screens/groups/AddGroupPaymentScreen";
import AddExpenseScreen from "../screens/expenses/AddExpenseScreen";
import LoansScreen from "../screens/loans/LoansScreen";
import ActivityScreen from "../screens/activity/ActivityScreen";
import SettlementsScreen from "../screens/settlements/SettlementsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import AccountScreen from "../screens/account/AccountScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import MenuScreen from "../screens/menu/MenuScreen";

// ── Tab icon component ──────────────────────────────────────────────────────
function TabIcon({ name, focused }) {
  const iconMap = {
    Dashboard: Icons.dashboard,
    Expenses:  Icons.expenses,
    Groups:    Icons.groups,
    Loans:     Icons.loansRupee,
    More:      Icons.more,
  };
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return <IconComponent size={24} color={focused ? COLORS.primary : COLORS.text3} />;
}

// ── Stacks ──────────────────────────────────────────────────────────────────

const DashStack = createNativeStackNavigator();
function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="DashboardHome"  component={DashboardScreen} />
      <DashStack.Screen name="Account"        component={AccountScreen} />
      <DashStack.Screen name="Settings"       component={SettingsScreen} />
      <DashStack.Screen name="Notifications"  component={NotificationsScreen} />
      <DashStack.Screen name="VerifyEmail"    component={VerifyEmailScreen} />
    </DashStack.Navigator>
  );
}

const ExpensesTabStack = createNativeStackNavigator();
function ExpensesStack() {
  return (
    <ExpensesTabStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesTabStack.Screen name="ExpensesHome" component={ExpensesScreen} />
      <ExpensesTabStack.Screen name="AddEntry"     component={AddExpenseScreen} />
    </ExpensesTabStack.Navigator>
  );
}

const GroupStack = createNativeStackNavigator();
function GroupsStack() {
  return (
    <GroupStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupStack.Screen name="GroupsList"  component={GroupsScreen} />
      <GroupStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <GroupStack.Screen name="AddExpense"  component={AddGroupExpenseScreen} />
      <GroupStack.Screen name="AddPayment"  component={AddGroupPaymentScreen} />
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

// More tab — MenuScreen is the hub; Settings and Account are pushed from here
const MoreStack = createNativeStackNavigator();
function MoreTabStack() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome"      component={MenuScreen} />
      <MoreStack.Screen name="Activity"      component={ActivityScreen} />
      <MoreStack.Screen name="Settlements"   component={SettlementsScreen} />
      <MoreStack.Screen name="Settings"      component={SettingsScreen} />
      <MoreStack.Screen name="Account"       component={AccountScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
    </MoreStack.Navigator>
  );
}

// ── Bottom Tab Navigator ────────────────────────────────────────────────────
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
          height:          Platform.OS === "ios" ? 88 : 68,
          paddingBottom:   Platform.OS === "ios" ? 26 : 10,
          paddingTop:      8,
          // Docked with top rounded edges — clean modern look
          borderTopLeftRadius:  24,
          borderTopRightRadius: 24,
          position: "absolute",
          bottom: 0,
          left:   0,
          right:  0,
          elevation:     12,
          shadowColor:   "#000",
          shadowOffset:  { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius:  12,
        },
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    "600",
          marginTop:     2,
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Expenses"  component={ExpensesStack} />
      <Tab.Screen name="Groups"    component={GroupsStack} />
      <Tab.Screen name="Loans"     component={LoansStack} />
      <Tab.Screen name="More"      component={MoreTabStack} />
    </Tab.Navigator>
  );
}