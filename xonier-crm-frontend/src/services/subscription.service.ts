import api from "../lib/axios"


export const SubscriptionService = {
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
    return api.get(`/subscription?${params.toString()}`);
  },
  getById : (id:string)=> api.get(`/subscription/${id}`),
}