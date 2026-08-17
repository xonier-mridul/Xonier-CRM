// components/Support/shared/StatusBadge.tsx

import { ServiceStatusLevel } from "@/src/types/support/support.type";

interface StatusBadgeProps {
  status: ServiceStatusLevel;
  label: string;
}

const containerStyles: Record<ServiceStatusLevel, string> = {
  operational: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  outage: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const dotStyles: Record<ServiceStatusLevel, string> = {
  operational: "bg-emerald-500",
  maintenance: "bg-amber-500",
  outage: "bg-red-500",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${containerStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {label}
    </span>
  );
}