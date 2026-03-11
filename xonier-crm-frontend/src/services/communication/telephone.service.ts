import api from "@/src/lib/axios";
import { CreatePhoneNumber } from "@/src/types/communication/telephone.types";



export const TelephoneServices = {
     getAllActives: (page?: number, limit?: number, filters?: Record<string, any>)=>{
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
    return api.get(`/telephone/getall/active?${params.toString()}`);
  },
  create: (payload: CreatePhoneNumber)=> api.post("/telephone/register", payload),
  update: (id: string, payload : {status:string})=> api.patch(`/telephone/update/status/${id}`, payload),
  delete: (id: string)=> api.delete(`/telephone/soft-delete/${id}`),
}