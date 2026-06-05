// SplitEase/mobile/src/api/groups.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getGroups      = ()       => client.get(ENDPOINTS.groups);
export const createGroup    = (payload) => client.post(ENDPOINTS.createGroup, payload);
export const deleteGroup    = (id, force) =>
  client.delete(`${ENDPOINTS.deleteGroup(id)}${force ? '?force=true' : ''}`);
export const getMembers     = (id)     => client.get(ENDPOINTS.groupMembers(id));
export const getMembersBulk = (ids)    => client.post(ENDPOINTS.membersBulk, { group_ids: ids });
export const getCategories  = ()       => client.get(ENDPOINTS.categories);
export const getSubcategories = (id)   => client.get(ENDPOINTS.subcategories(id));
export const generateInvite = (id)     => client.post(ENDPOINTS.generateInvite(id));
export const getInviteInfo  = (token)  => client.get(ENDPOINTS.inviteInfo(token));
export const joinInvite     = (token)  => client.post(ENDPOINTS.joinInvite(token));
export const remindMember   = (groupId, payload) =>
  client.post(ENDPOINTS.remind(groupId), payload);

export const getUsers   = () => client.get(ENDPOINTS.users);
export const leaveGroup = (groupId, userId) =>
  client.delete(ENDPOINTS.leaveGroup(groupId, userId));