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
  client.post('/auth/forgot-password', { email });

export const resetPassword = (payload) =>
  client.post('/auth/reset-password', payload);