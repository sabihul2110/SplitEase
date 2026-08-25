// web/src/app/UserRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UserRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_verified) return <Navigate to="/verify-email" replace />;
  if (!user.terms_accepted) return <Navigate to="/accept-terms" replace />;
  return children;
}