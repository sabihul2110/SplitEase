// SplitEase/web/src/api/groups.js

import api from "./client.js";

export const getGroups      = () => api.get("/groups/");
export const getAllGroups   = () => api.get("/groups/all");
export const wipeAllGroups  = () => api.delete("/groups/admin/wipe-groups");
export const getUsers       = () => api.get("/users/");
export const createGroup    = (data) => api.post("/groups/", data);
export const deleteGroup    = (id, force=false) => api.delete(`/groups/${id}${force?"?force=true":""}`);
export const getMembers     = (id) => api.get(`/groups/${id}/members`);
export const leaveGroup     = (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`);
export const generateInvite = (id) => api.post(`/groups/${id}/invite`);
export const remindMember   = (id, data) => api.post(`/groups/${id}/remind`, data);
export const getMembersBulk = (ids) => api.post("/groups/members-bulk", { group_ids: ids });
export const getHasExpenses = (ids) => api.post("/groups/has-expenses-bulk", { group_ids: ids });
export const getInviteInfo  = (token) => api.get(`/invite/${token}`);
export const joinInvite     = (token) => api.post(`/invite/${token}/join`);