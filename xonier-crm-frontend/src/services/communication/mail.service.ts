import api from "@/src/lib/axios";
import { ParamValue } from "next/dist/server/request/params";
import { Template } from "@/src/types/communication/mail.types";
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
  getAllTemplates: (currentPage: number, pageLimit: number, searchVal: string) => {
    const params = new URLSearchParams();
    params.append("page", String(currentPage));
    params.append("limit", String(pageLimit));
    if (searchVal!='') {
      params.append("name", String(searchVal));
    }
    return api.get("/email-template/all"+`?${params.toString()}`);
  },
  sendEmail: (email: string, subject: string, message: string) =>{
    api.post("/communication/email/send", { email, subject, message })
  },
  createTemplate: (payload: Template) => api.post("/email-template/create", payload),
  updateTemplate: (id: ParamValue, payload: Template) => api.patch(`/email-template/update/${id}`, payload),
  getById : (id:ParamValue)=> api.get(`/email-template/get/${id}`),
  deleteTemplate : (id:ParamValue)=> api.delete(`/email-template/delete/${id}`),
  bulkMail:(payload:any) => api.post("/email/send/bulk",payload)
};

export default MailService;