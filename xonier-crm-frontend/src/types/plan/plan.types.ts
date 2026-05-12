import { CURRENCY, DISCOUNT_TYPE, FEATURE_STATUS, PLAN_STATUS, PLAN_VISIBILITY } from "@/src/constants/enum";
import { User } from "..";
import { Dispatch, SetStateAction } from "react";

export interface Price {
  monthlyPrice: number;
  yearlyPrice: number;
}

export type DiscountApply = "monthly" | "yearly" | "both";

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

export interface PlanFeature {
  feature: string | Feature;
  is_unlimited: boolean;
  limit: number | null;
  limit_override: number | null;
  is_enabled: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: Price;
  discount: number | null;
  discountType: DISCOUNT_TYPE;
  currency: CURRENCY;
  discountApply: DiscountApply | null;
  discountTill: string | null;
  features: PlanFeature[];
  status: PLAN_STATUS;
  visibility: PLAN_VISIBILITY;
  trial_days: number;
  createdAt: string;
  createdBy: User ;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface PlanFeaturePayload {
  feature: string;
  is_unlimited: boolean;
  limit?: number | null;
  limit_override?: number | null;
  is_enabled: boolean;
}

export interface CreatePlanPayload {
  name: string;
  description: string;
  price: Price;
  discount?: number | null;
  currency: CURRENCY;
  discountApply?: DiscountApply | null;
  discountType: DISCOUNT_TYPE;
  discountTill?: string | null;
  features?: PlanFeaturePayload[];
  status?: PLAN_STATUS;
  visibility?: PLAN_VISIBILITY;
  trial_days?: number;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  price?: Price;
  discount?: number | null;
  currency?: CURRENCY;
  discountApply?: DiscountApply | null;
  discountType: DISCOUNT_TYPE;
  discountTill?: string | null;
  features?: PlanFeaturePayload[];
  status?: PLAN_STATUS;
  visibility?: PLAN_VISIBILITY;
  trial_days?: number;
}

export interface PlanTableProps {
  planData: Plan[];
  isLoading: boolean;
  err: string[] | string;
  currentPage: number;
  pageLimit: number;
  totalPages: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageLimit: Dispatch<SetStateAction<number>>;
}


export interface PlanViewComponentProps {
  plan: Plan | null;
  isLoading?: boolean;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
}



 export interface PlanViewHeaderProps {
  plan: Plan;
  createdAt: string;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
}
