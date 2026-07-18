// SplitEase/web/src/api/users.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const updateProfile  = (data) => api.put(ENDPOINTS.updateMe, data);
export const resetMyData    = () => api.post(ENDPOINTS.resetData);
export const forceResetData = () => api.post(ENDPOINTS.forceResetData);
export const getAllUsers    = () => api.get(ENDPOINTS.allUsers);
export const deleteUser     = (id) => api.delete(ENDPOINTS.deleteUser(id));
export const adminWipe      = () => api.post(ENDPOINTS.adminWipe);