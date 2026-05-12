import { Plan } from "@/src/types/plan/plan.types";
import React from "react";
import { IoCardOutline, IoPricetagOutline } from "react-icons/io5";
import PlanViewCard from "./PlanViewCard";
import PlanViewInfoItem from "./PlanViewInfoItem";

interface PlanPriceSummaryProps {
  plan: Plan;
  formatCurrency: (value: number) => string;
  formatDate: (value?: string | Date | null) => string;
  formatLabel: (value?: string | null) => string;
}

const PlanPriceSummary = ({ plan, formatCurrency, formatDate, formatLabel }: PlanPriceSummaryProps) => {
  const monthlyTotal = plan.price.monthlyPrice * 12;
  const yearlySavings = monthlyTotal - plan.price.yearlyPrice;
  const hasYearlySavings = yearlySavings > 0;
  const discountValue =
    plan.discount === null
      ? "No discount"
      : plan.discountType === "percentage"
        ? `${plan.discount}%`
        : formatCurrency(plan.discount);

  return (
    <PlanViewCard
      title="Pricing"
      description="Monthly, yearly, and discount configuration"
      icon={<IoCardOutline className="text-xl" />}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
          <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Monthly</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price.monthlyPrice)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">per month</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Yearly</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price.yearlyPrice)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">per year</p>
        </div>
        <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-center gap-2">
            <IoPricetagOutline className="text-base text-amber-500" />
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Discount</p>
          </div>
          <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{discountValue}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{formatLabel(plan.discountApply) || "Not applied"}</p>
        </div>
        <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Yearly Savings</p>
          <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{hasYearlySavings ? formatCurrency(yearlySavings) : "—"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{hasYearlySavings ? "against monthly billing" : "No savings set"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <PlanViewInfoItem label="Currency" value={plan.currency} />
        <PlanViewInfoItem label="Discount Type" value={formatLabel(plan.discountType)} />
        <PlanViewInfoItem label="Discount Till" value={formatDate(plan.discountTill)} />
      </div>
    </PlanViewCard>
  );
};

export default PlanPriceSummary;
