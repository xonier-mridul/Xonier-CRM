// CompanyViewTable.tsx  — already shared by you above, only fix the id reference
// company._id comes from MongoDB, your type has both _id and companyId
// change key={company.id} → key={company._id} everywhere

"use client";

import {
  Company,
  CompanyFilterParams,
} from "@/src/types/company/company.types";
import React from "react";
import Pagination from "../../common/pagination";
import { IoIosSearch } from "react-icons/io";
import Skeleton from "react-loading-skeleton";
import { MdOutlineEdit } from "react-icons/md";
import { IoTrash, IoEyeOutline, IoRefreshOutline } from "react-icons/io5";
import {
  COMPANY_STATUS,
  NUMBER_OF_EMPLOYEES,
} from "@/src/constants/enum";
import Link from "next/link";

interface CompanyViewTableProps {
  companyData: Company[];
  isLoading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageLimit: number;
  totalPages: number;
  setPageLimit: (limit: number) => void;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  searchVal: string;
  onSearch: (val: string) => void;
  filters: CompanyFilterParams;
  onFilterChange: (filters: Partial<CompanyFilterParams>) => void;
}

const statusStyles: Record<string, string> = {
  [COMPANY_STATUS.ACTIVE]:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [COMPANY_STATUS.PENDING_VERIFICATION]:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [COMPANY_STATUS.SUSPENDED]:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  [COMPANY_STATUS.INACTIVE]:
    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  [COMPANY_STATUS.DELETED]:
    "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

const sizeLabel: Record<string, string> = {
  [NUMBER_OF_EMPLOYEES.LESS_THAN_50]: "<50",
  [NUMBER_OF_EMPLOYEES.FROM_50_TO_100]: "50–100",
  [NUMBER_OF_EMPLOYEES.FROM_100_TO_200]: "100–200",
  [NUMBER_OF_EMPLOYEES.FROM_200_TO_300]: "200–300",
  [NUMBER_OF_EMPLOYEES.FROM_300_TO_400]: "300–400",
  [NUMBER_OF_EMPLOYEES.FROM_400_TO_500]: "400–500",
  [NUMBER_OF_EMPLOYEES.FROM_500_TO_1000]: "500–1000",
  [NUMBER_OF_EMPLOYEES.FROM_1000_TO_2000]: "1000–2000",
  [NUMBER_OF_EMPLOYEES.FROM_2000_TO_5000]: "2000–5000",
};

const CompanyViewTable: React.FC<CompanyViewTableProps> = ({
  companyData,
  isLoading,
  currentPage,
  setCurrentPage,
  pageLimit,
  totalPages,
  setPageLimit,
  onEdit,
  onDelete,
  onRestore,
  searchVal,
  onSearch,
  filters,
  onFilterChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 w-full flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between p-6 border-b border-slate-900/10 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold dark:text-white text-slate-900">
            Companies
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage registered companies
          </p>
        </div>

        <div className="flex items-center gap-3 md:justify-between w-full flex-wrap ">
          <div className="grid grid-cols-3  gap-3">
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as COMPANY_STATUS) || undefined,
              })
            }
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
          >
            <option value="">All Status</option>
            {Object.values(COMPANY_STATUS).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={filters.companySize ?? ""}
            onChange={(e) =>
              onFilterChange({
                companySize: (e.target.value as NUMBER_OF_EMPLOYEES) || undefined,
              })
            }
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
          >
            <option value="">All Sizes</option>
            {Object.entries(sizeLabel).map(([val, label]) => (
              <option key={val} value={val}>
                {label} employees
              </option>
            ))}
          </select>

          <select
            value={pageLimit}
            onChange={(e) => setPageLimit(Number(e.target.value))}
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          </div>

          <div className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 flex items-center gap-2">
            <IoIosSearch className="text-lg text-gray-400" />
            <input
              type="text"
              className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400 w-44"
              placeholder="Search companies..."
              value={searchVal}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              {[
                "Company",
                "Contact",
                "Industry",
                "Size",
                "Country",
                "Status",
                "Subscription",
                "Registered",
                "Actions",
              ].map((col) => (
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
              companyData && companyData.length > 0 ? (
                companyData.map((company) => (
                  <tr
                    key={company.id}  // ← _id not id
                    className="group hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-4 pr-4 p-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-nowrap text-slate-900 dark:text-white capitalize">
                          {company.companyName}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5 truncate line-clamp-1">
                          {company.companyId}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 pr-4 ">
                      <div className="flex flex-col gap-0.5">
                        <Link href={`mailto:${company.email}`} className="text-xs font-medium text-slate-700 dark:text-white">
                          {company.email}
                        </Link>
                        <Link href={`tel:${company.email}`} className="text-xs text-gray-400">
                          {company.number}
                        </Link>
                      </div>
                    </td>

                    <td className="py-4 pr-4">
                      <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                        {company.industry || "—"}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      <span className="text-xs text-gray-600 text-nowrap dark:text-gray-300">
                        {company.companySize
                          ? sizeLabel[company.companySize] ?? company.companySize
                          : "—"}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      <span className="text-xs text-gray-600 dark:text-gray-300 text-nowrap uppercase">
                        {company.country ?? "—"}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 text-nowrap rounded-md capitalize ${
                          statusStyles[company.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {company.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      {company.subscription ? (
                        <Link
                          href={`/subscriptions/${company.id}`}
                          className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md"
                        >
                          {company.subscriptionCount} active
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="py-4 pr-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(company.createdAt).toLocaleDateString(
                          "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/companies/${company.id}`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                        >
                          <IoEyeOutline className="text-base" />
                        </Link>

                        <Link
                          href={`/companies/update/${company.id}`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <MdOutlineEdit className="text-base" />
                        </Link>

                        {company.status === COMPANY_STATUS.DELETED ? (
                          <button
                            onClick={() => onRestore(company.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                          >
                            <IoRefreshOutline className="text-base" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onDelete(company.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                          >
                            <IoTrash className="text-base" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    No companies found
                  </td>
                </tr>
              )
            ) : (
              Array.from({ length: pageLimit }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 dark:border-gray-700"
                >
                  {Array.from({ length: 9 }).map((_, j) => (
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

      {/* Pagination */}
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

export default CompanyViewTable;