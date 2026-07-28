
"use client";

import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  value,
  onChange,
  error,
  label,
  required = false,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <PhoneInput
        international
        defaultCountry="IN"
        value={value}
        onChange={(val) => onChange(val || "")}
        disabled={disabled}
        className={`phone-input ${error ? "error" : ""}`}
      />
      {error && <span className="text-sm text-red-500">{error}</span>}
      
     
    </div>
  );
};

export default PhoneInputField;