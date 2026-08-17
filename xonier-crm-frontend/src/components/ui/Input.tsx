"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  link?:boolean
  
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  type = "text",
  className = "",
  link= false,
  required = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const isTextarea = type === "textarea";
  const {t} = useTranslation()


  const commonClasses = `
    w-full px-3 py-2 rounded-md border text-sm
    bg-white dark:bg-gray-700 text-black dark:text-white
    border-gray-300 dark:border-gray-300/30
    disabled:opacity-60 disabled:cursor-not-allowed
     focus:ring-2 
    focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 text-slate-600  focus:ring-teal-400/20
    ${error ? "border-red-500 focus:ring-red-500" : ""}
    ${className}
  `;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
  <label className="text-sm     font-semibold 
 text-gray-700 dark:text-gray-200 capitalize flex gap-2">
   <> {t(label.toLowerCase())}
    {required && <span className="text-red-500 text-xl">*</span>}</>
    {link == true && (<div className="flex items-center text-xs justify-end text-blue-400">
              <Link href={"/forgot-companyId"} className=" font-semibold">
               ({t("get_companyId")})
              </Link>
            </div>)}
  </label>
)}

      <div className="relative">
        {isTextarea ? (
          <textarea
            required={required}
            className={`${commonClasses} resize-none`}
            rows={5}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            type={isPassword && showPassword ? "text" : type}
            required={required}
            className={commonClasses}
            
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-cyan-500"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>

      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
};

export default Input;
