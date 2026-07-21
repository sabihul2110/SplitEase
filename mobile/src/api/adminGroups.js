// SplitEase/mobile/src/api/adminGroups.js



import client from './client';
import { ENDPOINTS } from '../config/api';

export const getAllGroupsAdmin = () => client.get(ENDPOINTS.allGroups);
export const deleteGroupAdmin  = (id) => client.delete(`${ENDPOINTS.deleteGroup(id)}?force=true`);
export const wipeAllGroups     = () => client.delete(ENDPOINTS.wipeAllGroups);