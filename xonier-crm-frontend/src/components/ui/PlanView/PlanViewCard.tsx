import React, { ReactNode } from "react";

interface PlanViewCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

const PlanViewCard = ({ title, description, icon, children, action }: PlanViewCardProps) => {
  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200">
              {icon}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {description ? <p className="text-sm text-slate-500 dark:text-gray-400">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

export default PlanViewCard;
