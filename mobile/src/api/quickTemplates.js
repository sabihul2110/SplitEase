// SplitEase/mobile/src/api/quickTemplates.js

import client from './client';

const BASE = '/api/v1/quick-templates';

export const getTemplates    = ()            => client.get(`${BASE}/`);
export const createTemplate  = (payload)     => client.post(`${BASE}/`, payload);
export const updateTemplate  = (id, payload) => client.put(`${BASE}/${id}`, payload);
export const deleteTemplate  = (id)          => client.delete(`${BASE}/${id}`);
export const executeTemplate = (id, payload) => client.post(`${BASE}/${id}/execute`, payload);