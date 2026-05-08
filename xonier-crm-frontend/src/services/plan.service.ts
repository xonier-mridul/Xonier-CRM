import api from "../lib/axios";
import { CreatePlanPayload, UpdatePlanPayload } from "../types/plan/plan.types";



export  const PlanService  = {
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

    return api.get(`/plan?${params.toString()}`);
  },
  create: (payload: CreatePlanPayload)=> api.post("/plan", payload),
  getById: (id:string)=> api.get(`/${id}`),
  update:(id:string, payload: UpdatePlanPayload)=> api.put(`/plan/${id}`, payload),
  delete: (id:string) => api.delete(`/${id}`)
}