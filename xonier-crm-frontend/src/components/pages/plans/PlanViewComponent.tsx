import { Plan } from "@/src/types/plan/plan.types";
import React from "react";
import PlanCreatorDetails from "../../ui/PlanView/PlanCreatorDetails";
import PlanFeaturesList from "../../ui/PlanView/PlanFeaturesList";
import PlanMetaDetails from "../../ui/PlanView/PlanMetaDetails";
import PlanPriceSummary from "../../ui/PlanView/PlanPriceSummary";
import PlanViewEmptyState from "../../ui/PlanView/PlanViewEmptyState";
import PlanViewHeader from "../../ui/PlanView/PlanViewHeader";
import PlanViewSkeleton from "../../ui/PlanView/PlanViewSkeleton";

interface PlanViewComponentProps {
  planData: Plan | null;
  isLoading?: boolean;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
}

const formatLabel = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/_/g, " ");
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const PlanViewComponent = ({ planData, isLoading = false, handleEdit, handleDelete }: PlanViewComponentProps) => {
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: planData?.currency || "USD",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${planData?.currency || ""} ${value}`;
    }
  };

  if (isLoading) {
    return <PlanViewSkeleton />;
  }

  if (!planData) {
    return <PlanViewEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PlanViewHeader plan={planData} createdAt={formatDate(planData.createdAt)} handleEdit={handleEdit} handleDelete={handleDelete} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="flex flex-col gap-6">
          <PlanPriceSummary
            plan={planData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatLabel={formatLabel}
          />
          <PlanFeaturesList features={planData.features} formatLabel={formatLabel} />
        </div>

        <div className="flex flex-col gap-6">
          <PlanMetaDetails plan={planData} formatDate={formatDate} formatLabel={formatLabel} />
          <PlanCreatorDetails createdBy={planData.createdBy} formatDate={formatDate} formatLabel={formatLabel} />
        </div>
      </div>
    </div>
  );
};

export default PlanViewComponent;
