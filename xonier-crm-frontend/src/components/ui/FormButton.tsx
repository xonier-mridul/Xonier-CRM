"use client";

import React from "react";
import { ImSpinner2 } from "react-icons/im";

interface FormButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const FormButton: React.FC<FormButtonProps> = ({
  children,
  isLoading = false,
  disabled,
  className = "",
  ...props
}) => {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`
        w-full flex items-center justify-center gap-2
        rounded-md px-4 py-2 font-medium
        bg-blue-600 text-white
        hover:bg-blue-700 hover:cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <ImSpinner2 className="animate-spin text-lg" />
      )}
      {children}
    </button>
  );
};

export default FormButton;

