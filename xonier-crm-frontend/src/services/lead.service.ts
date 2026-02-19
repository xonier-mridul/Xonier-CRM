import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { BulkLeadPayload, LeadPayload, UpdateLeadStatusPayload } from "../types/leads/leads.types";
import { SALES_STATUS } from "../constants/enum";



const LeadService = {
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

    return api.get(`/lead/all?${params.toString()}`);
  },
  getAllByCreator: (page?: number, limit?: number, filters?: Record<string, any>) => {
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

    return api.get(`/lead/leads-by-user/all?${params.toString()}`);
  },
  create: (data: LeadPayload)=> api.post("/lead/create", data),
  assignBulkLead: (userId: string, leadsId: Array<string>)=> api.patch("/lead/assign/bulk", {userId, leadsId}),
  bulkCreate: (data: BulkLeadPayload )=> api.post("/lead/create/bulk", data),
  getById: (id: ParamValue)=> api.get(`/lead/get-by-id/${id}`),
  update: (id: ParamValue, payload: LeadPayload)=> api.put(`/lead/update/${id}`, payload),
  updateStatus: (id:string, payload: UpdateLeadStatusPayload) =>api.patch(`/lead/update/${id}/status`, payload),
  delete: (id: string)=> api.delete(`/lead/delete/${id}`)
};


export default LeadService