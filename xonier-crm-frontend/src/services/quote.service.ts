import api from "../lib/axios";
import { QuotationCreatePayload, QuotationUpdatePayload, QuoteStatusUpdatePayload } from "../types/quotations/quote.types";


export const QuoteService = {
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

    return api.get(`/quote/get-all?${params.toString()}`);
  },
  get_by_id: (id:string)=> api.get(`/quote/get-by-id/${id}`),
  create: (payload: QuotationCreatePayload)=> api.post("/quote/create", payload),
  update: (id: string, payload: QuotationUpdatePayload)=> api.put(`/quote/update/${id}`, payload),
  updateStatus: (id: string, payload: QuoteStatusUpdatePayload)=> api.put(`/quote/update/${id}`, payload),
  resend: (id:string)=> api.post(`/quote/resend/${id}`, {}), 
  delete: (id:string)=> api.delete(`/quote/delete/${id}`)
 
}