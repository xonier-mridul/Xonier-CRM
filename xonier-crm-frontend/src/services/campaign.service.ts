import api from "../lib/axios";
import {
  ICampaignCreatePayload,
  ICampaignUpdatePayload,
  ICampaignStatusUpdatePayload,
} from "../types/campaign/campaign.types";

const CampaignService = {
  create: (data: ICampaignCreatePayload) => api.post("/campaign/create", data),
  
  getAll: (page?: number, limit?: number, filters?: Record<string, any>) => {
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

  getById: (id: string) => api.get(`/campaign/get-by-id/${id}`),
  
  update: (id: string, payload: ICampaignUpdatePayload) => 
    api.put(`/campaign/update/${id}`, payload),
    
  updateStatus: (id: string, payload: ICampaignStatusUpdatePayload) => 
    api.patch(`/campaign/update/${id}/status`, payload),
    
  delete: (id: string) => api.delete(`/campaign/delete/${id}`),
};

export default CampaignService;
