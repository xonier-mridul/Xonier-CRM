import api from "../lib/axios";

export interface RatedUser {
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  rating: number;
  reviews: number;
  lastRated: string;
}

export interface RatedUsersResult {
  users: RatedUser[];
  totalPages: number;
  totalUsers: number;
  stats: {
    totalRatedUsers: number;
    averageRating: number;
    highestRating: number;
  };
  filters: {
    roles: string[];
    departments: string[];
    designations: string[];
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}

export const RatingService = {
  getRatedUsers: async (
    page?: number,
    limit?: number,
    filters?: Record<string, any>
  ): Promise<{ data: RatedUsersResult }> => {
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

    const res = await api.get<ApiEnvelope<RatedUsersResult>>(
      `/rating/all-rating?${params.toString()}`
    );

    return { data: res.data.data };
  },
};