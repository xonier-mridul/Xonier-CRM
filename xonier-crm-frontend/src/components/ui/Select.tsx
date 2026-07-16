"use client";

import React from "react";
import { useTranslation } from "react-i18next";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}
const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder = "Select an option",
  className = "",
  required = true,
  ...props
}) => {
const {t}= useTranslation()

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
          {label} {" "}{required && <span className="text-red-500 text-xl">*</span>}
        </label>
      )}

      <select
        className={`
          w-full px-3 py-2.5 rounded-md border
          text-[14px] bg-white dark:bg-gray-700 text-black dark:text-white
          border-gray-300 dark:border-gray-300/30
          disabled:opacity-60 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-cyan-500
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option
           value="" disabled>
            {placeholder}
          </option>
        )}

        {options.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>

      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
};

export default Select;
