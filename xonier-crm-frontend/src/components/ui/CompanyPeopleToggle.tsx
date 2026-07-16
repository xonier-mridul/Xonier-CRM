"use client";
import React from "react";
import { useTranslation } from "react-i18next";

type ToggleValue = "company" | "people";

interface CompanyPeopleToggleProps {
  value?: ToggleValue;
  onChange?: (value: ToggleValue) => void;
}

const CompanyPeopleToggle: React.FC<CompanyPeopleToggleProps> = ({
  value = "company",
  onChange,
}) => {
  const { t } = useTranslation();

  const toggle = () => {
    const newType: ToggleValue = value === "company" ? "people" : "company";
    onChange?.(newType);
  };

  return (
    <div
      onClick={toggle}
      className="relative h-8 w-55 rounded-full cursor-pointer flex items-center px-2
      bg-black dark:bg-white transition-colors"
    >
      {/* Sliding circle */}
      <div
        className={`absolute top-1 h-6 w-25 left-1 rounded-full transition-all duration-300
        bg-white dark:bg-black
        ${value === "people" ? "translate-x-28" : ""}`}
      />

      <div className="flex justify-between w-full px-5 text-sm font-semibold z-10">
        <span
          className={`${
            value === "company"
              ? "text-black dark:text-white"
              : "text-white dark:text-black"
          }`}
        >
          {t("company")}
        </span>

        <span
          className={`${
            value === "people"
              ? "text-black dark:text-white"
              : "text-white dark:text-black"
          }`}
        >
          {t("people")}
        </span>
      </div>
    </div>
  );
};

export default CompanyPeopleToggle;