import api from "../lib/axios";



export const QueryService={
    getAll:(page?: number, limit?: number, filters?: Record<string, any>) => {
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

    return api.get(`/query?${params.toString()}`);
  },
  getById : (id:string)=> api.get(`/query/${id}`),
  deleteById:(id:string)=> api.delete(`/query/delete/${id}`),
  bulkDelete:(selectId: string[])=> api.delete("/query/bulk-delete", {data:{"ids": selectId}})

}