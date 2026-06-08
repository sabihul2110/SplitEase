// SplitEase/web/src/api/groups.js

import api from "./client.js";

export const getMyGroups      = ()        => api.get("/groups/");
export const getAllGroups = () => api.get("/groups/all");
export const wipeAllGroups    = ()        => api.delete("/groups/admin/wipe-groups");
export const getUsers         = ()        => api.get("/users/");
export const createGroup      = (data)    => api.post("/groups/", data);
export const deleteGroup      = (id, force=false) => api.delete(`/groups/${id}${force?"?force=true":""}`);
export const getMembers       = (id)      => api.get(`/groups/${id}/members`);
export const removeMember = (gid, uid) => api.delete(`/groups/${gid}/members/${uid}`);
export const generateInvite   = (id)      => api.post(`/groups/${id}/invite`);
export const sendReminder     = (id,data) => api.post(`/groups/${id}/remind`, data);
export const getMembersBulk   = (ids)     => api.post("/groups/members-bulk",      { group_ids: ids });
export const getHasExpenses   = (ids)     => api.post("/groups/has-expenses-bulk", { group_ids: ids });