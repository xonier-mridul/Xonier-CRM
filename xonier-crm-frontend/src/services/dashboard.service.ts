import api from "../lib/axios";
import { GetDashboardParams } from "@/src/types/dashboard/dashboard.types";

export const DashboardService = {
    getAll: (params: GetDashboardParams) => api.get(`/dashboard/stats?${params.page && `page=${params.page}`}${params.limit &&`&limit=${params.limit}`} ${params.search && `&search=${params.search}`}`),
    
}

