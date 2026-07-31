import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-500">{error}</span>}
    </label>
  );
}

export function inputClass(hasError: boolean = false): string {
  return `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 dark:bg-slate-800 dark:text-slate-100 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-slate-200 focus:border-cyan-400 focus:ring-cyan-100 dark:border-slate-700"
  }`;
}