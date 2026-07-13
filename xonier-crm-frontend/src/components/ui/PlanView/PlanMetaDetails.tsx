import { Plan } from "@/src/types/plan/plan.types";
import React from "react";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import PlanViewCard from "./PlanViewCard";
import PlanViewInfoItem from "./PlanViewInfoItem";
import { useTranslation } from "react-i18next";

interface PlanMetaDetailsProps {
  plan: Plan;
  formatDate: (value?: string | Date | null) => string;
  formatLabel: (value?: string | null) => string;
}

const PlanMetaDetails = ({ plan, formatDate, formatLabel }: PlanMetaDetailsProps) => {
  const { t } = useTranslation();
  return (
    <PlanViewCard
      title={t("configuration")}
      description="Visibility, trial, and record timeline"
      icon={<IoShieldCheckmarkOutline className="text-xl" />}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlanViewInfoItem label={t("plan_id")} value={plan.id} />
        <PlanViewInfoItem label={t("status")} value={formatLabel(plan.status)} />
        <PlanViewInfoItem label={t("visibility")} value={formatLabel(plan.visibility)} />
        <PlanViewInfoItem label={t("trial_days")} value={plan.trial_days > 0 ? `${plan.trial_days} days` : "No trial"} />
        <PlanViewInfoItem label={t("created_at")} value={formatDate(plan.createdAt)} />
        <PlanViewInfoItem label={t("updated_at")} value={formatDate(plan.updatedAt)} />
        {plan.deletedAt ? <PlanViewInfoItem label={t("deleted_at")} value={formatDate(plan.deletedAt)} /> : null}
      </div>
    </PlanViewCard>
  );
};

export default PlanMetaDetails;
