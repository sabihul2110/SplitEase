// SplitEase/mobile/src/navigation/MainNavigator.jsx


import React from "react";
import { Platform, View } from "react-native";
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
import LoansScreen            from "../screens/loans/LoansScreen";
import PeopleScreen           from "../screens/loans/PeopleScreen";
import PersonLedgerScreen     from "../screens/loans/PersonLedgerScreen";
import PendingRequestsScreen  from "../screens/loans/PendingRequestsScreen";
import ActivityScreen from "../screens/activity/ActivityScreen";
import SettlementsScreen from "../screens/settlements/SettlementsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import AccountScreen from "../screens/account/AccountScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import MoreScreen from "../screens/menu/MoreScreen";
import ManageTemplatesScreen from "../screens/templates/ManageTemplatesScreen";
import EditTemplateScreen from "../screens/templates/EditTemplateScreen";
import ManageBillsScreen from "../screens/bills/ManageBillsScreen";
import EditBillScreen from "../screens/bills/EditBillScreen";
import QuickEntryScreen from "../screens/quickEntry/QuickEntryScreen";
import RunRoutineScreen from "../screens/routines/RunRoutineScreen";
import ManageRoutinesScreen from "../screens/routines/ManageRoutinesScreen";
import EditRoutineScreen from "../screens/routines/EditRoutineScreen";


function TabIcon({ name, focused, badgeCount }) {
  const iconMap = {
    Dashboard: Icons.dashboard,
    Expenses:  Icons.expenses,
    Groups:    Icons.groups,
    Loans:     Icons.loansRupee,
    More:      Icons.more,
  };
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return (
    <View style={{ width: 24, height: 24 }}>
      <IconComponent size={24} color={focused ? COLORS.primary : COLORS.text3} />
      {badgeCount > 0 && (
        <View style={{
          position: 'absolute', top: -3, right: -3,
          width: 9, height: 9, borderRadius: 5,
          backgroundColor: COLORS.danger,
          borderWidth: 1.5, borderColor: COLORS.surface,
        }} />
      )}
    </View>
  );
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
      <ExpensesTabStack.Screen name="QuickEntry"   component={QuickEntryScreen} />
      <ExpensesTabStack.Screen name="RunRoutine"   component={RunRoutineScreen} />
      <ExpensesTabStack.Screen name="ManageRoutines" component={ManageRoutinesScreen} />
      <ExpensesTabStack.Screen name="EditRoutine"    component={EditRoutineScreen} />
      <ExpensesTabStack.Screen name="ManageTemplates" component={ManageTemplatesScreen} />
      <ExpensesTabStack.Screen name="EditTemplate"    component={EditTemplateScreen} />
      <ExpensesTabStack.Screen name="ManageBills"     component={ManageBillsScreen} />
      <ExpensesTabStack.Screen name="EditBill"        component={EditBillScreen} />
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
      <LoanStack.Screen name="LoansHome"        component={LoansScreen} />
      <LoanStack.Screen name="People"           component={PeopleScreen} />
      <LoanStack.Screen name="PersonLedger"     component={PersonLedgerScreen} />
      <LoanStack.Screen name="PendingRequests"  component={PendingRequestsScreen} />
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
  const [ledgerBadge, setLedgerBadge] = React.useState(0);
  const fetchBadgeRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    async function fetchBadge() {
      try {
        const client = require('../api/client').default;
        const res = await client.get('/api/v1/ledger-notifications/unread-count');
        if (active) setLedgerBadge(res.data?.count || 0);
      } catch { if (active) setLedgerBadge(0); }
    }
    fetchBadgeRef.current = fetchBadge;
    fetchBadge();
    const interval = setInterval(fetchBadge, 15000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const handleNavStateChange = React.useCallback(() => {
    fetchBadgeRef.current?.();
  }, []);

  React.useEffect(() => {
    global.__refreshLedgerBadge = () => fetchBadgeRef.current?.();
    return () => { global.__refreshLedgerBadge = null; };
  }, []);

  return (
    <Tab.Navigator
      screenListeners={{
        state: handleNavStateChange,
      }}
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
          <TabIcon
            name={route.name}
            focused={focused}
            badgeCount={route.name === 'Loans' ? ledgerBadge : 0}
          />
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