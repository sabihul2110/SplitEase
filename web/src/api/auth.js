// SplitEase/web/src/api/auth.js

import api from "./client.js";

export const login         = (data)  => api.post("/auth/login", data);
export const signup        = (data)  => api.post("/auth/signup", data);
export const forgotPassword= (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (data)  => api.post("/auth/reset-password", data);
export const getMe         = ()      => api.get("/auth/me");
export const changePassword = (data) => api.post("/auth/change-password", data);
