import { FEATURE_STATUS } from "@/src/constants/enum";



export interface Feature {
  id: string;
  name: string;
  sortDescription: string;
  description: string;
  feature_key: string;
  status: FEATURE_STATUS;
  system: boolean;
  createdAt: string;
}

export interface PaginatedFeatures {
  data: Feature[];
  page: number;
  totalPages: number;
  limit: number;
}

export interface FeatureListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: FEATURE_STATUS;
  system?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}