// src/components/common/AdvancedFilters/AdvancedFilters.tsx
"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { MdOutlineWorkOutline } from "react-icons/md";
import { RiUserSharedLine } from "react-icons/ri";
import { FaXmark } from "react-icons/fa6";
import CustomUserFilterSelect from "@/src/components/common/CustomUserFilterSelect";
import {
  AdvancedFiltersValues,
  AdvancedFiltersVisibility,
  SourceFilterValue,
} from "@/src/types/advanceFilter/AdvanceFilter";

interface AdvancedFiltersProps extends AdvancedFiltersValues, AdvancedFiltersVisibility {
  teamData: any[];
  designationData: any[];
  userData: any[];

  onTeamChange: (val: string) => void;
  onDesignationChange: (val: string) => void;
  onSalesPersonChange: (val: string) => void;
  onSourceChange: (val: SourceFilterValue) => void;
  onReset: () => void;

  activeCount?: number;
  className?: string;
  extraFilters?: React.ReactNode;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  teamData,
  designationData,
  userData,

  teamFilter,
  designationFilter,
  salesPersonFilter,
  sourceFilter,

  onTeamChange,
  onDesignationChange,
  onSalesPersonChange,
  onSourceChange,
  onReset,

  showTeam = true,
  showDesignation = true,
  showSalesPerson = true,
  showSource = true,

  activeCount,
  className = "",
  extraFilters,
}) => {
  const { t } = useTranslation();

  const handleSourceChange = (value: SourceFilterValue) => {
    onSourceChange(value);
  };

  // ✅ sourceFilter is NOT included — clear button only reacts to team/designation/salesPerson
  const computedActiveCount =
    activeCount ??
    [teamFilter, designationFilter, salesPersonFilter].filter(Boolean).length;

  return (
    <div
      className={`w-full flex flex-wrap items-end justify-between gap-4 p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-slate-900/10 animate-in slide-in-from-top-2 duration-200 ${className}`}
    >
      {/* LEFT SIDE — Team / Designation / SalesPerson filters */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Team filter */}
        {showTeam && (
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
              <HiOutlineUserGroup className="text-sm text-cyan-500" />
              {t("team")}
            </label>
            <select
              value={teamFilter}
              onChange={(e) => onTeamChange(e.target.value)}
              className="bg-white dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm outline-none dark:text-white/70 focus:ring-2 focus:ring-cyan-500/30 transition-all"
            >
              <option value="">{t("all_teams")}</option>
              {teamData.map((teamItem: any) => (
                <option key={teamItem.id} value={teamItem.id}>
                  {teamItem.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Designation filter */}
        {showDesignation && (
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
              <MdOutlineWorkOutline className="text-sm text-purple-500" />
              {t("designation")}
            </label>
            <select
              value={designationFilter}
              onChange={(e) => onDesignationChange(e.target.value)}
              className="bg-white dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 text-sm outline-none dark:text-white/70 focus:ring-2 focus:ring-purple-500/30 transition-all"
            >
              <option value="">{t("all_designations")}</option>
              {designationData.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sales person filter */}
        {showSalesPerson && (
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
              <RiUserSharedLine className="text-sm text-amber-500" />
              {t("sales_person")}
            </label>
            <CustomUserFilterSelect
              users={userData}
              value={salesPersonFilter}
              onChange={onSalesPersonChange}
              placeholder={t("search_select_user")}
              accentColor="amber"
            />
          </div>
        )}
        
        {extraFilters}
      </div>

      {/* RIGHT SIDE — Source filter + Clear button */}
      <div className="flex flex-wrap items-end gap-2">

        {/* ✅ Source filter — does NOT trigger clear button */}
        {showSource && (
          <div className="flex flex-col gap-1.5 min-w-[170px]">
            <div className="flex rounded-lg border border-slate-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700">
              <button
                type="button"
                onClick={() => handleSourceChange("all")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
                  sourceFilter === "all"
                    ? "bg-teal-500 text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-600"
                }`}
              >
                {t("all")}
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange("company")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
                  sourceFilter === "company"
                    ? "bg-teal-500 text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-600"
                }`}
              >
                {t("company")}
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange("referral")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
                  sourceFilter === "referral"
                    ? "bg-teal-500 text-white"
                    : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-600"
                }`}
              >
                {t("referral")}
              </button>
            </div>
          </div>
        )}

        {/* ✅ Clear all filters — only shows when team/designation/salesPerson are active */}
        {computedActiveCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold
              text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40
              hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 hover:border-red-300
              transition-all cursor-pointer shrink-0"
          >
            <FaXmark className="text-xs" />
            {t("clear_all_filters")}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilters;