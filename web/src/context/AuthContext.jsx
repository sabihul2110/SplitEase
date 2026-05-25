// --- web/src/context/AuthContext.jsx ---

/**
 * AuthContext.jsx
 *
 * Global auth state. Persists across refresh via localStorage.
 *
 * On first load:
 * - Reads saved user from localStorage
 * - Calls /auth/me to validate the token is still good
 * - If token is expired/invalid → clears state, user goes to login
 * - Shows a loading screen while validating (prevents empty state flash)
 */

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [authChecked,  setAuthChecked]  = useState(false); // true once validation is done

  // On mount: restore from localStorage and validate token
  useEffect(() => {
    async function validateSession() {
      try {
        const saved = localStorage.getItem("expense_user");
        if (!saved) {
          setAuthChecked(true);
          return;
        }

        const parsed = JSON.parse(saved);
        if (!parsed?.access_token) {
          localStorage.removeItem("expense_user");
          setAuthChecked(true);
          return;
        }

        // Validate token is still good by calling /auth/me
        // This also handles the case where backend restarted
        const { data } = await api.get("/auth/me");
        // Update stored user with fresh data from server
        const freshUser = { ...parsed, ...data };
        setUser(freshUser);
        localStorage.setItem("expense_user", JSON.stringify(freshUser));

      } catch {
        // Token invalid or expired → clear everything
        localStorage.removeItem("expense_user");
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }

    validateSession();
  }, []);

  function login(userData) {
    setUser(userData);
    localStorage.setItem("expense_user", JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("expense_user");
  }

  // Show nothing until auth is validated — prevents flash of empty state
  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0d0e14", flexDirection: "column", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, background: "#2563eb", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, color: "#fff",
        }}>S</div>
        <div style={{
          width: 18, height: 18, border: "2px solid #252730",
          borderTopColor: "#2563eb", borderRadius: "50%",
          animation: "spin 0.65s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, authChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}