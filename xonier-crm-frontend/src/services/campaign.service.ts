import api from "../lib/axios";
import {
  ICampaignCreatePayload,
  ICampaignUpdatePayload,
  ICampaignStatusUpdatePayload,
} from "../types/campaign/campaign.types";

type CampaignQueryValue = string | number | boolean;

const CampaignService = {
  create: (data: ICampaignCreatePayload) => api.post("/campaign/create", data),
  
  getAll: (page?: number, limit?: number, filters?: Record<string, CampaignQueryValue>) => {
    const params = new URLSearchParams();

    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    return api.get(`/campaign/all?${params.toString()}`);
  },

  getPipelineLeads: (
    filter: string,
    page?: number,
    limit?: number,
    filters?: Record<string, CampaignQueryValue>,
  ) => {
    const params = new URLSearchParams({ filter });
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    return api.get(`/campaign/pipeline-leads?${params.toString()}`);
  },

  getById: (id: string) => api.get(`/campaign/get-by-id/${id}`),
  
  update: (id: string, payload: ICampaignUpdatePayload) => 
    api.put(`/campaign/update/${id}`, payload),
    
  updateStatus: (id: string, payload: ICampaignStatusUpdatePayload) => 
    api.patch(`/campaign/update/${id}/status`, payload),
    
  delete: (id: string) => api.delete(`/campaign/delete/${id}`),

  getCampaignLeads: (campaignId: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));
    return api.get(`/campaign/${campaignId}/leads?${params.toString()}`);
  },

  importLeads: (campaignId: string, data: { leads: Record<string, unknown>[]; dataTag?: string }) =>
    api.post(`/campaign/${campaignId}/leads/import`, data),

  getEngagementStats: (signal?: AbortSignal) => api.get("/campaign/engagement-stats", { signal }),
  getAgents: () => api.get("/campaign/agents"),

  claimLead: (campaignId: string, campaignLeadId: string) =>
    api.post(`/campaign/${campaignId}/leads/${campaignLeadId}/claim`),

  assignLead: (campaignId: string, campaignLeadId: string, agentId: string) =>
    api.patch(`/campaign/${campaignId}/leads/${campaignLeadId}/assign`, { agentId }),
};

export default CampaignService;
