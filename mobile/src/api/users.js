// SplitEase/mobile/src/api/users.js


import client from './client';
import { ENDPOINTS } from '../config/api';

export const getAllUsers = () => client.get(ENDPOINTS.allUsers);
export const deleteUser  = (id) => client.delete(ENDPOINTS.deleteUser(id));
export const adminWipe   = () => client.post(ENDPOINTS.adminWipe);