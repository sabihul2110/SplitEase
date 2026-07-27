// --- web/src/api/client.js ---


import axios from "axios";

function resolveApiBase() {
  // Runtime override for Scenario 2 (deployed web + local backend) —
  // lets you point an ALREADY-DEPLOYED build at a different backend
  // without rebuilding/redeploying, since this code still runs in
  // the browser regardless of where the HTML/JS was served from.
  // In browser devtools console on the live site:
  //   localStorage.setItem('splitease_api_override', 'http://localhost:8000')
  // then reload. Clear it to go back to the build-time default:
  //   localStorage.removeItem('splitease_api_override')
  try {
    const override = localStorage.getItem('splitease_api_override');
    if (override) return override;
  } catch {}
  return import.meta.env.VITE_API_URL || "https://splitease-4hcc.onrender.com";
}

const api = axios.create({
  baseURL: resolveApiBase() + "/api/v1",
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
  async error => {
    if (!error.response && error.code !== "ERR_CANCELED") {
      const config = error.config;
      if (!config._retried) {
        config._retried = true;
        await new Promise(r => setTimeout(r, 3000));
        return api(config);
      }

      const isAuthPage = window.location.pathname === "/login" ||
                         window.location.pathname === "/signup";
      if (!isAuthPage && window.location.pathname !== "/down") {
        window.location.href = "/down";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === "/login" ||
                         window.location.pathname === "/signup" ||
                         window.location.pathname === "/forgot-password" ||
                         window.location.pathname === "/reset-password" ||
                         window.location.pathname.startsWith("/join/");
      if (!isAuthPage) {
        localStorage.removeItem("expense_user");
        // Use global logout if AuthContext has registered it (avoids hard reload race)
        if (window.__authLogout) {
          window.__authLogout();
        } else {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;