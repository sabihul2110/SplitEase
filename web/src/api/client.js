// --- web/src/api/client.js ---


import axios from "axios";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "https://splitease-kfda.onrender.com") + "/api/v1",
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

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === "/login" ||
                         window.location.pathname === "/signup" ||
                         window.location.pathname === "/forgot-password" ||
                         window.location.pathname === "/reset-password" ||
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