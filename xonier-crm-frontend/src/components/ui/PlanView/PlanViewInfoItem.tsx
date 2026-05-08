import React, { ReactNode } from "react";

interface PlanViewInfoItemProps {
  label: string;
  value: ReactNode;
}

const PlanViewInfoItem = ({ label, value }: PlanViewInfoItemProps) => {
  return (
    <div className="min-w-0 rounded-lg border border-slate-900/10 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase text-slate-400 dark:text-gray-500">{label}</p>
      <div className="mt-2 min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-gray-100">{value || "—"}</div>
    </div>
  );
};

export default PlanViewInfoItem;
