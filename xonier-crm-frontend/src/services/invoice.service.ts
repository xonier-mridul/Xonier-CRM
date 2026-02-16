import api from "../lib/axios";


const InvoiceService = {
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

    return api.get(`/invoice/all?${params.toString()}`);
  },
  getById: (id:string)=> api.get(`/invoice/get-by-id/${id}`),
  download: (id:string)=> api.get(`/invoice/download/${id}`, {responseType: 'blob'})
}

export default InvoiceService