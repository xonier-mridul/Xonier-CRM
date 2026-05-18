import { FEATURE_STATUS } from "@/src/constants/enum";
import { Feature } from "next/dist/build/webpack/plugins/telemetry-plugin/telemetry-plugin";



export interface PlanFeature {
  feature: Feature | string;
  is_enabled: boolean;
  is_unlimited: boolean;
  limit: number | null;
  limit_override: number | null;
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