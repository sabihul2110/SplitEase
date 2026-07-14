// SplitEase/mobile/src/api/people.js


import client from './client';
import { ENDPOINTS } from '../config/api';

export const getPeople         = ()                => client.get(ENDPOINTS.people);
export const createPerson      = (payload)         => client.post(ENDPOINTS.people, payload);
export const deletePerson      = (id)              => client.delete(ENDPOINTS.deletePerson(id));
export const getEntries        = (personId)        => client.get(ENDPOINTS.personEntries(personId));
export const addEntry          = (personId, payload) => client.post(ENDPOINTS.addEntry(personId), payload);
export const repayEntry        = (entryId, amt)    => client.post(ENDPOINTS.repayEntry(entryId), { repayment_amount: amt });
export const deleteEntry       = (entryId)         => client.delete(ENDPOINTS.deleteEntry(entryId));
export const acceptEntry       = (entryId)         => client.post(ENDPOINTS.acceptEntry(entryId));
export const rejectEntry       = (entryId)         => client.post(ENDPOINTS.rejectEntry(entryId));
export const getPendingRequests = () => client.get(ENDPOINTS.pendingRequests);
export const settleUp           = (personId)       => client.post(ENDPOINTS.settleUp(personId));
export const getSentRequests    = ()               => client.get(ENDPOINTS.sentRequests);
export const searchUsers       = (q)               => client.get(ENDPOINTS.userSearch(q));

export const getPendingRepayments = () => client.get(ENDPOINTS.pendingRepayments);
export const getSentRepayments    = () => client.get(ENDPOINTS.sentRepayments);
export const acceptRepayment      = (repaymentId) => client.post(ENDPOINTS.acceptRepayment(repaymentId));
export const rejectRepayment      = (repaymentId) => client.post(ENDPOINTS.rejectRepayment(repaymentId));
export const cancelRepayment      = (repaymentId) => client.delete(ENDPOINTS.cancelRepayment(repaymentId));

export const getPendingSettlements = () => client.get(ENDPOINTS.pendingSettlements);
export const getSentSettlements    = () => client.get(ENDPOINTS.sentSettlements);
export const acceptSettlement      = (requestId) => client.post(ENDPOINTS.acceptSettlement(requestId));
export const rejectSettlement      = (requestId) => client.post(ENDPOINTS.rejectSettlement(requestId));
export const cancelSettlement      = (requestId) => client.delete(ENDPOINTS.cancelSettlement(requestId));