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
export const settleUp           = (personId)             => api.post(`/people/${personId}/settle`);
export const searchUsers        = (q)                    => api.get(`/users/search?q=${encodeURIComponent(q)}`);