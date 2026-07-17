// SplitEase/mobile/src/api/routines.js

import client from './client';

const BASE = '/api/v1/routines';

export const getRoutines       = ()            => client.get(`${BASE}/`);
export const getRoutine        = (id)          => client.get(`${BASE}/${id}`);
export const createRoutine     = (payload)     => client.post(`${BASE}/`, payload);
export const updateRoutine     = (id, payload) => client.put(`${BASE}/${id}`, payload);
export const deleteRoutine     = (id)          => client.delete(`${BASE}/${id}`);
export const executeRoutine    = (id, payload) => client.post(`${BASE}/${id}/execute`, payload);