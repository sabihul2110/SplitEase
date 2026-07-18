// web/src/api/people.js


import api from "./client.js";
import { ENDPOINTS } from "../config/api";

export const getPeople          = ()                     => api.get(ENDPOINTS.people);
export const createPerson       = (data)                 => api.post(ENDPOINTS.people, data);
export const deletePerson       = (id)                   => api.delete(ENDPOINTS.deletePerson(id));
export const getEntries         = (personId)             => api.get(ENDPOINTS.personEntries(personId));
export const addEntry           = (personId, data)       => api.post(ENDPOINTS.addEntry(personId), data);
export const deleteEntry        = (entryId)              => api.delete(ENDPOINTS.deleteEntry(entryId));
export const acceptEntry        = (entryId)              => api.post(ENDPOINTS.acceptEntry(entryId));
export const rejectEntry        = (entryId)              => api.post(ENDPOINTS.rejectEntry(entryId));
export const getPendingRequests = ()                     => api.get(ENDPOINTS.pendingRequests);
export const getSentRequests    = ()                     => api.get(ENDPOINTS.sentRequests);
export const settleUp           = (personId, settlementDate) =>
  api.post(ENDPOINTS.settleUp(personId), { settlement_date: settlementDate || null });
export const searchUsers        = (q)                    => api.get(ENDPOINTS.userSearch(q));

export const getPendingRepayments = () => api.get(ENDPOINTS.pendingRepayments);
export const getSentRepayments    = () => api.get(ENDPOINTS.sentRepayments);
export const acceptRepayment      = (repaymentId) => api.post(ENDPOINTS.acceptRepayment(repaymentId));
export const rejectRepayment      = (repaymentId) => api.post(ENDPOINTS.rejectRepayment(repaymentId));
export const cancelRepayment      = (repaymentId) => api.delete(ENDPOINTS.cancelRepayment(repaymentId));

export const getPendingSettlements = () => api.get(ENDPOINTS.pendingSettlements);
export const getSentSettlements    = () => api.get(ENDPOINTS.sentSettlements);
export const acceptSettlement      = (requestId, settlementDate) =>
  api.post(ENDPOINTS.acceptSettlement(requestId), { settlement_date: settlementDate || null });
export const rejectSettlement      = (requestId) => api.post(ENDPOINTS.rejectSettlement(requestId));
export const cancelSettlement      = (requestId) => api.delete(ENDPOINTS.cancelSettlement(requestId));