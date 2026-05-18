

import api from "../lib/axios";

export interface DashboardStatsParams {
  filter?: "today" | "this_week" | "this_month" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
}

export const DashboardService = {
  getDashboardStats: (params?: DashboardStatsParams) =>
    api.get("/dashboard/stats", { params }),

  getAllCommon: (id: string) =>
    api.get(`/task/stats/user/${id}`),
};