// SplitEase/mobile/src/api/quickTemplates.js

import client from './client';
import { ENDPOINTS } from '../config/api';

export const getTemplates    = ()            => client.get(ENDPOINTS.quickTemplates);
export const createTemplate  = (payload)     => client.post(ENDPOINTS.quickTemplates, payload);
export const updateTemplate  = (id, payload) => client.put(ENDPOINTS.quickTemplateById(id), payload);
export const deleteTemplate  = (id)          => client.delete(ENDPOINTS.quickTemplateById(id));
export const executeTemplate = (id, payload) => client.post(ENDPOINTS.quickTemplateExecute(id), payload);