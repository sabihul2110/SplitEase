// SplitEase/web/src/api/timeline.js

import api from "./client.js";

export const getTimeline = (limit = 200) => api.get(`/timeline/?limit=${limit}`);

export const downloadStatement = (startDate, endDate, label, periodType = "range") => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);
  if (label) qs.set("label", label);
  qs.set("period_type", periodType);
  return api.get(`/timeline/statement?${qs.toString()}`, { responseType: "blob" });
};