import { Plan } from "@/src/types/plan/plan.types";
import React from "react";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import PlanViewCard from "./PlanViewCard";
import PlanViewInfoItem from "./PlanViewInfoItem";

interface PlanMetaDetailsProps {
  plan: Plan;
  formatDate: (value?: string | Date | null) => string;
  formatLabel: (value?: string | null) => string;
}

const PlanMetaDetails = ({ plan, formatDate, formatLabel }: PlanMetaDetailsProps) => {
  return (
    <PlanViewCard
      title="Configuration"
      description="Visibility, trial, and record timeline"
      icon={<IoShieldCheckmarkOutline className="text-xl" />}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlanViewInfoItem label="Plan ID" value={plan.id} />
        <PlanViewInfoItem label="Status" value={formatLabel(plan.status)} />
        <PlanViewInfoItem label="Visibility" value={formatLabel(plan.visibility)} />
        <PlanViewInfoItem label="Trial Days" value={plan.trial_days > 0 ? `${plan.trial_days} days` : "No trial"} />
        <PlanViewInfoItem label="Created At" value={formatDate(plan.createdAt)} />
        <PlanViewInfoItem label="Updated At" value={formatDate(plan.updatedAt)} />
        {plan.deletedAt ? <PlanViewInfoItem label="Deleted At" value={formatDate(plan.deletedAt)} /> : null}
      </div>
    </PlanViewCard>
  );
};

export default PlanMetaDetails;
