// --- web/src/context/AuthContext.jsx ---


import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [authChecked,  setAuthChecked]  = useState(false);

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

        const { data } = await getMe();
        const freshUser = { ...parsed, ...data };
        setUser(freshUser);
        localStorage.setItem("expense_user", JSON.stringify(freshUser));

      } catch {
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

  // Expose logout globally so axios 401 interceptor can trigger it
  useEffect(() => {
    window.__authLogout = () => {
      setUser(null);
      localStorage.removeItem("expense_user");
    };
    return () => { window.__authLogout = null; };
  }, []);

  async function refreshUser() {
    try {
      const { data } = await getMe();
      const saved = JSON.parse(localStorage.getItem("expense_user") || "{}");
      const freshUser = { ...saved, ...data };
      setUser(freshUser);
      localStorage.setItem("expense_user", JSON.stringify(freshUser));
    } catch {}
  }

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0d0e14", flexDirection: "column", gap: 16,
      }}>
        {/* Updated Web Loading Logo */}
        <img 
          src="/logo.svg" 
          alt="Loading SplitEase..." 
          style={{ width: 48, height: 48, display: "block" }} 
        />
        
        {/* Loading Spinner */}
        <div style={{
          width: 20, height: 20, border: "2px solid #252730",
          borderTopColor: "#2563eb", borderRadius: "50%",
          animation: "spin 0.65s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, authChecked, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}