// SplitEase/web/src/api/auth.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const login         = (data)  => api.post(ENDPOINTS.login, data);
export const signup        = (data)  => api.post(ENDPOINTS.signup, data);
export const forgotPassword = (email) => api.post(ENDPOINTS.forgotPassword, { email });
export const verifyEmail        = (token) => api.post(ENDPOINTS.verifyEmail,        { token });
export const resendVerification = ()      => api.post(ENDPOINTS.resendVerification);
export const resetPassword = (data)  => api.post(ENDPOINTS.resetPassword, data);
export const getMe         = ()      => api.get(ENDPOINTS.me);
export const changePassword = (data) => api.post(ENDPOINTS.changePass, data);
export const acceptTerms   = () => api.post(ENDPOINTS.acceptTerms);
