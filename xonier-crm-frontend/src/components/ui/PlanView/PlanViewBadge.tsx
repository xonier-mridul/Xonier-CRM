import React, { ReactNode } from "react";

type PlanViewBadgeVariant =
  | "active"
  | "inactive"
  | "deleted"
  | "public"
  | "private"
  | "success"
  | "warning"
  | "neutral"
  | "danger";

interface PlanViewBadgeProps {
  children: ReactNode;
  variant?: string;
}

const variantClass: Record<PlanViewBadgeVariant, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  deleted: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  public: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  private: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const PlanViewBadge = ({ children, variant = "neutral" }: PlanViewBadgeProps) => {
  const classes = variantClass[variant as PlanViewBadgeVariant] || variantClass.neutral;

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium capitalize ${classes}`}>
      {children}
    </span>
  );
};

export default PlanViewBadge;
