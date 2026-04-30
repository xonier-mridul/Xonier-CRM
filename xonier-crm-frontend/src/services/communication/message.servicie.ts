import api from "@/src/lib/axios";
import { ParamValue } from "next/dist/server/request/params";

export const MessageService = {
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
    return api.get(`/communication/sms/history?${params.toString()}`);
  },
  getById: (id: ParamValue) => .get(`/communication/sms/get-by-id/${id}`),
};

export default MessageService;