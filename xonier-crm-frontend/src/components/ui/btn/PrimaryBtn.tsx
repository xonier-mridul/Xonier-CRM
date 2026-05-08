import React from 'react'

const variantClass: Record<NonNullable<EventPrimaryButtonProps["variant"]>, string> = {
  default:
    "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:border-blue-900/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
  danger:
    "border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 hover:text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-300",
};

const PrimaryBtn = ({text, icon, event, isLoading, isLoadingTxt, disabled, variant = "default"}:EventPrimaryButtonProps) => {
  return (
    <button
                type="button"
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variantClass[variant]}`}
                onClick={event}
                disabled={disabled || isLoading}
              >
                {icon}
                {isLoading ? `${isLoadingTxt ?? "Loading..."}` : text}
              </button>
  )
}

export default PrimaryBtn
