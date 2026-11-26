import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
};

/** Shared page heading aligned with the CRM dashboard's compact visual hierarchy. */
export default function PageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">{eyebrow}</p>}
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
