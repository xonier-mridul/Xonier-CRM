import api from "@/src/lib/axios";
import { ParamValue } from "next/dist/server/request/params";
export const MailService = {
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
    return api.get(`/communication/email/history?${params.toString()}`);
  },
  getLogById: (id: ParamValue) => api.get(`/communication/email/history/get-by-id/${id}`),
};

export default MailService;