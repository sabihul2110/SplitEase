// SplitEase/web/src/api/groups.js

import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getGroups      = () => api.get(ENDPOINTS.groups);
export const getAllGroups   = () => api.get(ENDPOINTS.allGroups);
export const wipeAllGroups  = () => api.delete(ENDPOINTS.wipeAllGroups);
export const getUsers       = () => api.get(ENDPOINTS.users);
export const createGroup    = (data) => api.post(ENDPOINTS.createGroup, data);
export const deleteGroup    = (id, force=false) => api.delete(`${ENDPOINTS.deleteGroup(id)}${force?"?force=true":""}`);
export const getMembers     = (id) => api.get(ENDPOINTS.groupMembers(id));
export const leaveGroup     = (groupId, userId) => api.delete(ENDPOINTS.leaveGroup(groupId, userId));
export const generateInvite = (id) => api.post(ENDPOINTS.generateInvite(id));
export const remindMember   = (id, data) => api.post(ENDPOINTS.remind(id), data);
export const getMembersBulk = (ids) => api.post(ENDPOINTS.membersBulk, { group_ids: ids });
export const getHasExpenses = (ids) => api.post(ENDPOINTS.hasExpensesBulk, { group_ids: ids });
export const getInviteInfo  = (token) => api.get(ENDPOINTS.inviteInfo(token));
export const joinInvite     = (token) => api.post(ENDPOINTS.joinInvite(token));