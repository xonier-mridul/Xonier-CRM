import api from "@/src/lib/axios";
export interface LeadStatus { key: string; name: string; type: "ongoing" | "final"; color: string; order: number; leadCount?: number }
export type LeadStatusInput = Pick<LeadStatus, "name" | "type" | "color" | "order">;
export const LeadStatusService = {
  list: () => api.get("/lead-status/all"),
  create: (data: LeadStatusInput) => api.post("/lead-status/create", data),
  update: (key: string, data: LeadStatusInput) => api.put(`/lead-status/update/${encodeURIComponent(key)}`, data),
  delete: (key: string) => api.delete(`/lead-status/delete/${encodeURIComponent(key)}`),
};
export function notifyLeadStatusesChanged() { window.dispatchEvent(new Event("lead-statuses-changed")); }
