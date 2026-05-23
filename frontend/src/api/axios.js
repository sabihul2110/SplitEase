// --- frontend/src/api/axios.js ---

/**
 * api/axios.js
 *
 * Single configured Axios instance.
 * - Attaches JWT to every request automatically
 * - On 401 response → clears localStorage and redirects to /login
 *   This handles expired tokens, backend restarts, etc.
 */

import axios from "axios";

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  baseURL: import.meta.env.VITE_API_URL || "http://192.168.1.7:8000",
});

// ── Request: attach token ─────────────────────────────────────────────────
api.interceptors.request.use(config => {
  try {
    const saved = localStorage.getItem("expense_user");
    if (saved) {
      const { access_token } = JSON.parse(saved);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    }
  } catch {}
  return config;
});

// ── Response: handle 401 globally ────────────────────────────────────────
// If any API call returns 401, the token is expired/invalid.
// Clear storage and redirect to login — no silent empty state.
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on auth pages
      const isAuthPage = window.location.pathname === "/login" ||
                         window.location.pathname === "/signup" ||
                         window.location.pathname.startsWith("/join/");
      if (!isAuthPage) {
        localStorage.removeItem("expense_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;