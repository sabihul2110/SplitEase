// SplitEase/mobile/src/api/people.js


import client from './client';
import { ENDPOINTS } from '../config/api';

export const getPeople      = ()           => client.get(ENDPOINTS.people);
export const createPerson   = (payload)    => client.post(ENDPOINTS.people, payload);
export const deletePerson   = (id)         => client.delete(ENDPOINTS.deletePerson(id));
export const getEntries     = (personId)   => client.get(ENDPOINTS.personEntries(personId));
export const addEntry       = (personId, payload) => client.post(ENDPOINTS.addEntry(personId), payload);
export const repayEntry     = (entryId, amt)      => client.post(ENDPOINTS.repayEntry(entryId), { repayment_amount: amt });
export const deleteEntry    = (entryId)    => client.delete(ENDPOINTS.deleteEntry(entryId));