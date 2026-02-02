import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { DealPayload, DealUpdatePayload, GetAllParams } from "../types/deals/deal.types";



const dealService = {
    create: (payload: DealPayload)=> api.post("/deal/create", payload),
    getAll: (page?: number, limit?: number, filters?: Record<string, any>)=>{
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

    return api.get(`/deal/all?${params.toString()}`);
  },
  getById: (id:ParamValue) => api.get(`/deal/get-by-id/${id}`),
  update:(id: ParamValue, payload:DealUpdatePayload)=> api.put(`/deal/update/${id}`, payload)
}

export default dealService