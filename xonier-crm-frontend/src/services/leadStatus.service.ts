import api from "@/src/lib/axios";
export interface LeadStatus { key: string; name: string; type: "ongoing" | "final"; color: string; order: number; leadCount?: number; protected?: boolean }
export type LeadStatusInput = Pick<LeadStatus, "name" | "type" | "color" | "order">;
export const stageSettingsService = (resource: "lead-status" | "deal-stage") => ({
  list: () => api.get(`/${resource}/all`),
  create: (data: LeadStatusInput) => api.post(`/${resource}/create`, data),
  update: (key: string, data: LeadStatusInput) => api.put(`/${resource}/update/${encodeURIComponent(key)}`, data),
  delete: (key: string) => api.delete(`/${resource}/delete/${encodeURIComponent(key)}`),
});
export const LeadStatusService = stageSettingsService("lead-status");
export const DealStageSettingsService = stageSettingsService("deal-stage");
export function notifyLeadStatusesChanged() { window.dispatchEvent(new Event("lead-statuses-changed")); }
