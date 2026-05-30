// SplitEase/mobile/src/navigation/MainNavigator.jsx

import React from "react";
import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS } from "../constants/theme";
import { Icons } from "../constants/icons";

// Screens
import DashboardScreen from "../screens/main/DashboardScreen";
import GroupsScreen from "../screens/groups/GroupsScreen";
import GroupDetailScreen from "../screens/groups/GroupDetailScreen";
import ExpensesScreen from "../screens/expenses/ExpensesScreen";
import AddExpenseScreen from "../screens/expenses/AddExpenseScreen";
import AddPaymentScreen from "../screens/expenses/AddPaymentScreen";
import AddEntryScreen from "../screens/expenses/AddEntryScreen";
import LoansScreen from "../screens/loans/LoansScreen";
import ActivityScreen from "../screens/activity/ActivityScreen";
import SettlementsScreen from "../screens/settlements/SettlementsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import AccountScreen from "../screens/account/AccountScreen";
import MoreScreen from "../screens/more/MoreScreen";

// ── Tab Icons ──────────────────────────────────────────────────────────────

function TabIcon({ name, focused }) {
  const iconMap = {
    Dashboard: Icons.dashboard,
    Expenses: Icons.expenses,
    Groups: Icons.groups,
    Loans: Icons.loans,
    More: Icons.more,
  };
  const IconComponent = iconMap[name];
  const color = focused ? COLORS.primary : COLORS.text3;
  if (!IconComponent) {
    return (
      <View
        style={{
          width: 24,
          height: 24,
          backgroundColor: color,
          borderRadius: 12,
        }}
      />
    );
  }
  return <IconComponent size={24} color={color} />;
}

// ── Stacks ─────────────────────────────────────────────────────────────────

const DashStack = createNativeStackNavigator();
function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="DashboardHome" component={DashboardScreen} />
      {/* Account and Notifications are pushed from the Dashboard header */}
      <DashStack.Screen name="Account" component={AccountScreen} />
      <DashStack.Screen name="Notifications" component={NotificationsScreen} />
    </DashStack.Navigator>
  );
}

const ExpensesTabStack = createNativeStackNavigator();
function ExpensesStack() {
  return (
    <ExpensesTabStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesTabStack.Screen name="ExpensesHome" component={ExpensesScreen} />
      <ExpensesTabStack.Screen name="AddEntry" component={AddEntryScreen} />
    </ExpensesTabStack.Navigator>
  );
}

const GroupStack = createNativeStackNavigator();
function GroupsStack() {
  return (
    <GroupStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupStack.Screen name="GroupsList" component={GroupsScreen} />
      <GroupStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <GroupStack.Screen name="AddExpense" component={AddExpenseScreen} />
      <GroupStack.Screen name="AddPayment" component={AddPaymentScreen} />
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

// More tab: Activity + Settle Up only — Profile/Settings/Notifications moved to Dashboard header
const MoreStack = createNativeStackNavigator();
function MoreTabStack() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Activity" component={ActivityScreen} />
      <MoreStack.Screen name="Settlements" component={SettlementsScreen} />
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
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 62,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Expenses" component={ExpensesStack} />
      <Tab.Screen name="Groups" component={GroupsStack} />
      <Tab.Screen name="Loans" component={LoansStack} />
      <Tab.Screen name="More" component={MoreTabStack} />
    </Tab.Navigator>
  );
}
