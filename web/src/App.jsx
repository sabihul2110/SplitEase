// --- web/src/App.jsx ---

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// User pages
import Login        from "./pages/Login";
import Signup       from "./pages/Signup";
import Dashboard    from "./pages/Dashboard";
import Groups       from "./pages/Groups";
import GroupDetail  from "./pages/GroupDetail";
import AddExpense   from "./pages/AddExpense";
import AddPayment   from "./pages/AddPayment";
import Settlements  from "./pages/Settlements";
import Activity     from "./pages/Activity";
import JoinGroup from "./pages/JoinGroup";
import Profile  from "./pages/Profile";
import Settings from "./pages/Settings";
import Expenses from "./pages/Expenses";
import Loans    from "./pages/Loans";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Admin
import AdminLayout       from "./components/AdminLayout";
import AdminOverview     from "./pages/admin/AdminOverview";
import AdminUsers        from "./pages/admin/AdminUsers";
import AdminGroups       from "./pages/admin/AdminGroups";
import AdminTransactions from "./pages/admin/AdminTransactions";

function UserRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"       element={<Login />} />
      <Route path="/signup"      element={<Signup />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      <Route path="/join/:token" element={<JoinGroup />} />

      {/* User app — every page is a flat, independent route */}
      <Route path="/dashboard"              element={<UserRoute><Dashboard /></UserRoute>} />
      <Route path="/groups"                 element={<UserRoute><Groups /></UserRoute>} />
      <Route path="/groups/:id"             element={<UserRoute><GroupDetail /></UserRoute>} />
      <Route path="/groups/:id/add-expense" element={<UserRoute><AddExpense /></UserRoute>} />
      <Route path="/groups/:id/add-payment" element={<UserRoute><AddPayment /></UserRoute>} />
      <Route path="/settlements"            element={<UserRoute><Settlements /></UserRoute>} />
      <Route path="/activity" element={<UserRoute><Activity /></UserRoute>} />
      <Route path="/profile"  element={<UserRoute><Profile /></UserRoute>} />
      <Route path="/settings" element={<UserRoute><Settings /></UserRoute>} />
     <Route path="/expenses" element={<UserRoute><Expenses /></UserRoute>} />
     <Route path="/loans"     element={<UserRoute><Loans /></UserRoute>} />

      {/* Admin — separate layout, nested admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index               element={<AdminOverview />} />
        <Route path="users"        element={<AdminUsers />} />
        <Route path="groups"       element={<AdminGroups />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}