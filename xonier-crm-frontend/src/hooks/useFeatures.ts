import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { PlanFeature } from "../types/plan/plan.types";
import { Company } from "../types/company/company.types";
import { Feature } from "../types/plan/plan.types";
import { Subscription } from "../types/subscription/subscription.types";
import { Plan } from "../types/plan/plan.types";

const isCompany = (value: unknown): value is Company =>
  typeof value === "object" && value !== null && "subscription" in value;

const isSubscription = (value: unknown): value is Subscription =>
  typeof value === "object" && value !== null && "planId" in value;

const isPlan = (value: unknown): value is Plan =>
  typeof value === "object" && value !== null && "features" in value;

const isFeature = (value: unknown): value is Feature =>
  typeof value === "object" && value !== null && "feature_key" in value;

export const useFeatures = () => {
  const user = useSelector((state: RootState) => state.auth?.user);
  const isAdmin = useSelector((state: RootState)=>state.auth.isAdmin)

  const features: PlanFeature[] = useMemo(() => {

    
    const company = user?.companyId;
    if (!isCompany(company)) return [];

    const subscription = company.subscription;
    if (!isSubscription(subscription)) return [];

    const plan = subscription.planId;
    if (!isPlan(plan)) return [];

    return plan.features ?? [];
  }, [user]);

  const hasFeature = useMemo(() => {
    
    return (featureCode: string): boolean => {
      
        if(isAdmin) return true
      if (!features.length) return false;
      const match = features.find((f) => {
        if (!isFeature(f.feature)) return false;
        return f.feature.feature_key === featureCode;
      });
      return !!match && match.is_enabled;
    };
  }, [features]);

  const getFeature = useMemo(() => {
    return (featureCode: string): PlanFeature | null => {
      return (
        features.find((f) => {
          if (!isFeature(f.feature)) return false;
          return f.feature.feature_key === featureCode;
        }) ?? null
      );
    };
  }, [features]);

  const isUnlimited = useMemo(() => {
    return (featureCode: string): boolean => {
      const f = features.find((f) => {
        if (!isFeature(f.feature)) return false;
        return f.feature.feature_key === featureCode;
      });
      return !!f && f.is_unlimited;
    };
  }, [features]);

  const getLimit = useMemo(() => {
    return (featureCode: string): number | null => {
      const f = features.find((f) => {
        if (!isFeature(f.feature)) return false;
        return f.feature.feature_key === featureCode;
      });
      if (!f) return null;
      return f.limit_override ?? f.limit ?? null;
    };
  }, [features]);

  return { hasFeature, getFeature, isUnlimited, getLimit };
};