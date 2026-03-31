import api from "../lib/axios";
import { ParamValue } from "next/dist/server/request/params";

const prospectService = {
  getAll: (page?: number, limit?: number, filters?: Record<string, any>) => {
    const params = new URLSearchParams();

    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {

        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.append(key, value.join(","));
          }
        }
        else if (typeof value === "object") {
          const values = Object.values(value).filter(
            (v) => v !== "" && v !== undefined && v !== null
          );
          if (values.length > 0) {
            params.append(key, values.join(","));
          }
        }
        else {
          params.append(key, String(value));
        }
      });
    }
    return api.get(`/prospect/all?${params.toString()}`);
  },
  getById: (id: ParamValue) => api.get(`/prospect/get-by-id/${id}`),
  getAllActiveWithoutPagination: () => api.get("/auth/active/all-without-pagination"),
  assignBulkLead: (userId: string, leadsId: Array<string>) => api.post("/prospect/bulk-assign", { assignedTo: userId, enquiryIds: leadsId }),
  sendMessage: (phone: string, message: string) => api.post("/communication/sms/send", { sendTo:phone, message }),
  bulkSms: (sendTo: Array<string>, message: string) => api.post("/communication/sms/bulk-send", { sendTo, message }),
  assignBulkReAssign: (userId: string, enquiry_id: Array<string>) => api.post("/prospect/bulk-reassign", { assignedTo: userId, enquiryIds: enquiry_id }),
};


export default prospectService