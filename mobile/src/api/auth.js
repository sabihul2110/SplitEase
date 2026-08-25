// SplitEase/mobile/src/api/auth.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const login  = (email, password) =>
  client.post(ENDPOINTS.login,  { email, password });

export const signup = (payload) =>
  client.post(ENDPOINTS.signup, payload);

export const me     = () =>
  client.get(ENDPOINTS.me);

export const changePassword = (payload) =>
  client.post(ENDPOINTS.changePass, payload);

export const forgotPassword = (email) =>
  client.post(ENDPOINTS.forgotPassword, { email });

export const verifyEmail        = (token) => client.post(ENDPOINTS.verifyEmail,        { token });
export const resendVerification = ()      => client.post(ENDPOINTS.resendVerification);

export const resetPassword = (payload) =>
  client.post(ENDPOINTS.resetPassword, payload);

export const updateMe = (payload) =>
  client.put(ENDPOINTS.updateMe, payload);

export const acceptTerms   = () => client.post(ENDPOINTS.acceptTerms);