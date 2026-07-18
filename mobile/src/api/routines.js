// SplitEase/mobile/src/api/routines.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getRoutines       = ()            => client.get(ENDPOINTS.routines);
export const getRoutine        = (id)          => client.get(ENDPOINTS.routineById(id));
export const createRoutine     = (payload)     => client.post(ENDPOINTS.routines, payload);
export const updateRoutine     = (id, payload) => client.put(ENDPOINTS.routineById(id), payload);
export const deleteRoutine     = (id)          => client.delete(ENDPOINTS.routineById(id));
export const executeRoutine    = (id, payload) => client.post(ENDPOINTS.routineExecute(id), payload);