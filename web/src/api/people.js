// web/src/api/people.js


import api from "./client.js";

export const getPeople          = ()                     => api.get("/people/");
export const createPerson       = (data)                 => api.post("/people/", data);
export const deletePerson       = (id)                   => api.delete(`/people/${id}`);
export const getEntries         = (personId)             => api.get(`/people/${personId}/entries`);
export const addEntry           = (personId, data)       => api.post(`/people/${personId}/entries`, data);
export const deleteEntry        = (entryId)              => api.delete(`/people/entries/${entryId}`);
export const acceptEntry        = (entryId)              => api.post(`/people/entries/${entryId}/accept`);
export const rejectEntry        = (entryId)              => api.post(`/people/entries/${entryId}/reject`);
export const getPendingRequests = ()                     => api.get("/people/pending-requests");
export const getSentRequests    = ()                     => api.get("/people/sent-requests");
export const settleUp           = (personId, settlementDate) =>
  api.post(`/people/${personId}/settle`, { settlement_date: settlementDate || null });
export const searchUsers        = (q)                    => api.get(`/users/search?q=${encodeURIComponent(q)}`);

export const getPendingRepayments = () => api.get("/people/pending-repayments");
export const getSentRepayments    = () => api.get("/people/sent-repayments");
export const acceptRepayment      = (repaymentId) => api.post(`/people/repayments/${repaymentId}/accept`);
export const rejectRepayment      = (repaymentId) => api.post(`/people/repayments/${repaymentId}/reject`);
export const cancelRepayment      = (repaymentId) => api.delete(`/people/repayments/${repaymentId}`);

export const getPendingSettlements = () => api.get("/people/pending-settlements");
export const getSentSettlements    = () => api.get("/people/sent-settlements");
export const acceptSettlement      = (requestId, settlementDate) =>
  api.post(`/people/settlements/${requestId}/accept`, { settlement_date: settlementDate || null });
export const rejectSettlement      = (requestId) => api.post(`/people/settlements/${requestId}/reject`);
export const cancelSettlement      = (requestId) => api.delete(`/people/settlements/${requestId}`);