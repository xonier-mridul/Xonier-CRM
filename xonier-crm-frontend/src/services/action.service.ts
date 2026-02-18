import api from "../lib/axios";

interface ActivityFilters {
  entityType?: string;
  action?: string;
  from?: string; 
  to?: string;   
}

export interface ActivitySummaryFilters {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

const ActivityService = {
  getByUser(
    userId: string,
    page: number,
    limit: number,
    filters?: ActivityFilters
  ) {
    const params = new URLSearchParams();

    if (page !== undefined) params.append("page", String(page));
    if (limit !== undefined) params.append("limit", String(limit));

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    return api.get(`/activity/user/${userId}`, { params });
  },
  
  getSummaryByUser(
    userId: string,
    filters?: ActivitySummaryFilters
  ) {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    return api.get(`/activity/user/${userId}/summary`, { params });
  },
};

export default ActivityService;
