// SplitEase/web/src/api/users.js


import api from "./client.js";

export const updateProfile  = (data) => api.put("/users/me", data);
export const resetMyData    = () => api.post("/users/reset-my-data");
export const forceResetData = () => api.post("/users/reset-my-data/force");
export const getAllUsers    = () => api.get("/users/all");
export const deleteUser     = (id) => api.delete(`/users/${id}`);
export const adminWipe      = () => api.post("/users/admin-wipe");