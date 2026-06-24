"use client";

import React, { Dispatch, SetStateAction } from "react";
import Pagination from "../../common/pagination";
import { IoIosSearch } from "react-icons/io";
import Skeleton from "react-loading-skeleton";
import { IoEyeOutline } from "react-icons/io5";
import { GoDotFill } from "react-icons/go";
import { CURRENCY } from "@/src/constants/enum";
import { SubscriptionTableProps } from "@/src/types/subscription/subscription.types";
import Link from "next/link";


// ─── Extended Props ────────────────────────────────────────────────────────────

interface ExtendedSubscriptionTableProps extends SubscriptionTableProps {
  searchVal: string;
  onSearch: (val: string) => void;
  setPageLimit: Dispatch<SetStateAction<number>>
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const currencySymbol: Record<string, string> = {
  [CURRENCY.USD]: "$",
  [CURRENCY.EUR]: "€",
  [CURRENCY.GBP]: "£",
};

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

const COLUMNS = [
  "Subscription ID",
  "Plan Name",
  "Status",
  "Final Price",
  "Billing Cycle",
  "Start Date",
  "Actions",
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

const SubscriptionTable: React.FC<ExtendedSubscriptionTableProps> = ({
  subScriptionData,
  isLoading,
  currentPage,
  onPageChange,
  pageLimit,
  setPageLimit,
  totalPages,
  searchVal,
  onSearch,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 w-full flex flex-col gap-6 overflow-hidden">
      
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-4 justify-between p-6 border-b border-slate-900/10 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold dark:text-white text-slate-900">Subscriptions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage user subscriptions</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={pageLimit}
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setPageLimit(Number(e.target.value))
            }
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <div className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 flex items-center gap-2">
            <IoIosSearch className="text-lg text-gray-400" />
            <input
              type="text"
              className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400 w-44"
              placeholder="Search subscriptions..."
              value={searchVal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearch(e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {!isLoading ? (
              subScriptionData && subScriptionData.length > 0 ? (
                subScriptionData.map((item) => {
                  const symbol = (item.planId &&  item.planId instanceof Object) ? currencySymbol[item.planId?.currency] ?? "" : "";
                  const startDate = new Date(item.startSubscriptionDate).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "long", year: "numeric" }
                  );
                  const statusKey = item.status?.toLowerCase() ?? "";

                  return (
                    <tr
                      key={item.id}
                      className="group hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {/* Subscription ID */}
                      <td className="py-4 pr-4">
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          {item.subscriptionId}
                        </span>
                      </td>

                      {/* Plan Name */}
                      <td className="py-4 pr-4">
                        <span className="font-semibold text-sm text-slate-500 dark:text-white capitalize">
                          {(item.planId &&  item.planId instanceof Object) ?item.planId?.name ?? "—" : "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md capitalize ${
                            statusStyles[statusKey] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <GoDotFill className="text-[10px]" />
                          {item.status}
                        </span>
                      </td>

                      {/* Final Price */}
                      <td className="py-4 pr-4">
                        <span className="text-sm font-medium text-slate-700 dark:text-white">
                          {symbol}
                          {item.finalPrice}
                        </span>
                      </td>

                      {/* Billing Cycle */}
                      <td className="py-4 pr-4">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md capitalize bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                          {item.billingCycle}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="py-4 pr-4">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {startDate}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/subscriptions/${item.id}`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                          >
                            <IoEyeOutline className="text-base" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    No subscriptions found
                  </td>
                </tr>
              )
            ) : (
              Array.from({ length: pageLimit }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-gray-700">
                  {Array.from({ length: COLUMNS.length }).map((_, j) => (
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

      {/* ── Pagination ── */}
      <div className="px-6 pb-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};

export default SubscriptionTable;
