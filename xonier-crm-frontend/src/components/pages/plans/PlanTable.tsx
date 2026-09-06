"use client";

import { Plan, PlanTableProps } from "@/src/types/plan/plan.types";
import React from "react";
import Pagination from "../../common/pagination";
import { IoIosSearch } from "react-icons/io";
import Skeleton from "react-loading-skeleton";
import { MdOutlineEdit } from "react-icons/md";
import { IoTrash, IoEyeOutline } from "react-icons/io5";
import { CURRENCY, PLAN_STATUS, PLAN_VISIBILITY } from "@/src/constants/enum";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface ExtendedPlanTableProps extends PlanTableProps {
  onEdit: (plan: Plan) => void;
  onDelete: (id: string) => void;
  searchVal: string;
  onSearch: (val: string) => void;
}

const statusStyles: Record<string, string> = {
  [PLAN_STATUS.ACTIVE]: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [PLAN_STATUS.INACTIVE]: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  [PLAN_STATUS.DELETED]: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const visibilityStyles: Record<string, string> = {
  [PLAN_VISIBILITY.PUBLIC]: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400",
  [PLAN_VISIBILITY.PRIVATE]: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

const currencySymbol: Record<string, string> = {
  [CURRENCY.USD]: "$",
  [CURRENCY.EUR]: "€",
  [CURRENCY.GBP]: "£",
};

const PlanTable: React.FC<ExtendedPlanTableProps> = ({
  planData,
  isLoading,
  currentPage,
  setCurrentPage,
  pageLimit,
  totalPages,
  setPageLimit,
  onEdit,
  onDelete,
  searchVal,
  onSearch,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 w-full flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 justify-between p-6 border-b border-slate-900/10 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold dark:text-white text-slate-900">{t("plans")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("manage_subscription_plans")}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={pageLimit}
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
            onChange={(e) => setPageLimit(Number(e.target.value))}
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n} {t("page_2")}</option>
            ))}
          </select>

          <div className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 flex items-center gap-2">
            <IoIosSearch className="text-lg text-gray-400" />
            <input
              type="text"
              className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400 w-44"
              placeholder={t("search_plans")}
              value={searchVal}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              {["Plan", "Price", "Discount", "Status", "Visibility", "Trial", "Created By", "Actions"].map((col,index) => (
                <th
                  key={col}
                  className={` ${index==0 ?'pl-2' :" "} pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {!isLoading ? 
            (
              planData && planData.length > 0 ? (
                planData.map((plan,index) => {
                  const sym = currencySymbol[plan.currency] ?? "";
                  const isDeleted = plan.status === PLAN_STATUS.DELETED;
                  const createdBy =
                    typeof plan.createdBy === "string"
                      ? plan.createdBy
                      : `${plan.createdBy?.firstName ?? ""} ${plan.createdBy?.lastName ?? ""}`.trim();

                  return (
                    <tr key={plan.id} 
                    className={`${
                      (index % 2== 0)
                        ? "bg-white dark:bg-transparent hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                        : "bg-slate-100/50 dark:bg-slate-900/30 hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                    } w-full group transition-colors `}
                    >
                      <td className="py-4 pr-4 pl-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-slate-500 dark:text-white capitalize">{plan.name}</span>
                          <span className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-40">{plan.description}</span>
                        </div>
                      </td>

                      <td className="py-4 pr-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-slate-700 dark:text-white">{sym}{plan.price.monthlyPrice}</span>/mo
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-slate-700 dark:text-white">{sym}{plan.price.yearlyPrice}</span>/yr
                          </span>
                        </div>
                      </td>

                      <td className="py-4 pr-4">
                        {plan.discount ? (
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-md">
                            {plan.discount}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-4 pr-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md capitalize ${statusStyles[plan.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {plan.status}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md capitalize ${visibilityStyles[plan.visibility] ?? ""}`}>
                          {plan.visibility}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {plan.trial_days > 0 ? `${plan.trial_days}d` : "—"}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <Link href={`/users/${plan.createdBy.id}`} className="text-xs text-green-500 dark:text-gray-300 capitalize bg-green-50 dark:bg-green-700 px-3 py-1 border border-green-400 cursor-pointer rounded-full whitespace-nowrap">{createdBy || "—"}</Link>
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {isDeleted ? (
                            <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 opacity-40 cursor-not-allowed">
                              <IoEyeOutline className="text-base" />
                            </span>
                          ) : (
                            <Link
                              href={`/plans/${plan.id}`}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-teal-100 hover:text-teal-600 dark:hover:bg-teal-900 dark:hover:text-teal-400 transition-colors"
                            >
                              <IoEyeOutline className="text-base" />
                            </Link>
                          )}

                          <button
                            onClick={() => onEdit(plan)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                          >
                            <MdOutlineEdit className="text-base" />
                          </button>

                          <button
                            onClick={() => onDelete(plan.id)}
                            disabled={isDeleted}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <IoTrash className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                    {t("no_plans_found")}
                  </td>
                </tr>
              )
            ) : (
              Array.from({ length: pageLimit }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-gray-700">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-4 pr-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 pb-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default PlanTable;
