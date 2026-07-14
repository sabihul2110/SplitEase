// web/src/app/routes.jsx
//
// Route table for the data router (createBrowserRouter). AppShell is a
// layout route — it renders once and stays mounted across navigations;
// child routes render into its <Outlet />. Each route's `handle` carries
// page-specific UI (title, header actions) that AppShell reads via
// useMatches() — this is the standard React Router v6.4+ data-router
// pattern, not a workaround.

import { Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AdminLayout from "../components/layout/AdminLayout";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

import Dashboard from "../pages/dashboard/Dashboard";
import Groups from "../pages/groups/Groups";
import GroupDetail from "../pages/groups/GroupDetail";
import JoinGroup from "../pages/groups/JoinGroup";
import AddExpense from "../pages/expenses/AddExpense";
import AddPayment from "../pages/payments/AddPayment";
import Settlements from "../pages/settlements/Settlements";
import Activity from "../pages/activity/Activity";
import Profile from "../pages/settings/Profile";
import Settings from "../pages/settings/Settings";
import Expenses from "../pages/expenses/Expenses";
import Loans from "../pages/loans/Loans";
import PendingRequests from "../pages/loans/PendingRequests";
import Maintenance from "../pages/system/Maintenance";

import AdminOverview from "../pages/admin/AdminOverview";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminGroups from "../pages/admin/AdminGroups";
import AdminTransactions from "../pages/admin/AdminTransactions";

import UserRoute from "./UserRoute";
import AdminRoute from "./AdminRoute";
import RootRedirect from "./RootRedirect";

export const routes = [
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/join/:token", element: <JoinGroup /> },
  { path: "/down", element: <Maintenance reason="down" /> },
  { path: "/maintenance", element: <Maintenance reason="maintenance" /> },

  {
    element: <UserRoute><AppShell /></UserRoute>,
    children: [
      { path: "/dashboard", element: <Dashboard />, handle: { title: "Dashboard" } },
      // { path: "/groups", element: <Groups />, handle: { title: "Groups" } },
      // { path: "/groups/:id", element: <GroupDetail /> },
      // { path: "/groups/:id/add-expense", element: <AddExpense />, handle: { title: "Add Expense" } },
      // { path: "/groups/:id/add-payment", element: <AddPayment />, handle: { title: "Record Payment" } },
      // { path: "/settlements", element: <Settlements />, handle: { title: "Settlements" } },
      // { path: "/activity", element: <Activity />, handle: { title: "Activity" } },
      // { path: "/profile", element: <Profile />, handle: { title: "Profile" } },
      // { path: "/settings", element: <Settings />, handle: { title: "Settings" } },
      // { path: "/expenses", element: <Expenses />, handle: { title: "Expenses" } },
      // { path: "/loans", element: <Loans />, handle: { title: "Loans & Ledger" } },
      { path: "/groups", element: <Groups /> },
      { path: "/groups/:id", element: <GroupDetail /> },
      { path: "/groups/:id/add-expense", element: <AddExpense />, handle: { title: "Add Expense" } },
      { path: "/groups/:id/add-payment", element: <AddPayment />, handle: { title: "Record Payment" } },
      { path: "/settlements", element: <Settlements /> },
      { path: "/activity", element: <Activity /> },
      { path: "/profile", element: <Profile /> },
      { path: "/settings", element: <Settings /> },
      { path: "/expenses", element: <Expenses /> },
      { path: "/loans", element: <Loans /> },
      { path: "/people/pending", element: <PendingRequests />, handle: { title: "Pending Requests" } },
    ],
  },

  {
    path: "/admin",
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminOverview /> },
      { path: "users", element: <AdminUsers /> },
      { path: "groups", element: <AdminGroups /> },
      { path: "transactions", element: <AdminTransactions /> },
    ],
  },

  { path: "/", element: <RootRedirect /> },
  { path: "*", element: <Navigate to="/" replace /> },
];