"use client"
import { COMPANY_STATUS, COUNTRY_CODE, NUMBER_OF_EMPLOYEES } from '@/src/constants/enum';
import { Company, CompanyFilterParams } from '@/src/types/company/company.types';
import Link from 'next/link';
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { IoIosSearch } from 'react-icons/io';
import { IoEyeOutline, IoRefreshOutline } from 'react-icons/io5';
import { MdOutlineEdit } from 'react-icons/md';
import Skeleton from 'react-loading-skeleton';
import Pagination from '../../common/pagination';
import { useRouter } from 'next/navigation'
import TermsConfirmModal from '../../common/TermsConfirmModal';

interface CompanyDeleteTableProps {
  companyData: Company[];
  isLoading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageLimit: number;
  totalPages: number;
  setPageLimit: (limit: number) => void;

  onRestore: (id: string) => void;
  searchVal: string;
  onSearch: (val: string) => void;
  filters: CompanyFilterParams;
  onFilterChange: (filters: Partial<CompanyFilterParams>) => void;
}

const getCountryName = (code?: string) => {
  if (!code) return "—";

  const country = Object.entries(COUNTRY_CODE).find(
    ([, value]) => value === code);

  return country? country[0].replace(/_/g, " "): code;
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

/* ---------------------------------------------------------
   Main Table Component
--------------------------------------------------------- */
const DeletedTable: React.FC<CompanyDeleteTableProps> = ({
  companyData,
  isLoading,
  currentPage,
  setCurrentPage,
  pageLimit,
  totalPages,
  setPageLimit,
  onRestore,
  searchVal,
  onSearch,
  filters,
  onFilterChange,
}) => {
  const [restorePopup, setRestorePopup] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const router = useRouter();
  const { t } = useTranslation();

  const handleOpenRestore = (company: Company) => {
    setSelectedCompany(company);
    setRestorePopup(true);
  };

  const handleCloseRestore = () => {
    setRestorePopup(false);
    setSelectedCompany(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 w-full flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 justify-between p-6 border-b border-slate-900/10 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold dark:text-white text-slate-900">
            {t("deleted_companies")}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("manage_companies")} — {t("view_and_restore_deleted_companies")}
          </p>
        </div>

        <div className="flex items-center gap-3 md:justify-between w-full flex-wrap ">
          <div className="grid grid-cols-3  gap-3">
            <select
              value={filters.companySize ?? ""}
              onChange={(e) =>
                onFilterChange({
                  companySize: (e.target.value as NUMBER_OF_EMPLOYEES) || undefined,
                })
              }
              className="bg-slate-50 outline-none dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
            >
              <option value="">{t("all_sizes")}</option>
              {Object.entries(sizeLabel).map(([val, label]) => (
                <option key={val} value={val}>
                  {label} {t("employees")}
                </option>
              ))}
            </select>

            <select
              value={pageLimit}
              onChange={(e) => setPageLimit(Number(e.target.value))}
              className="bg-slate-50 dark:bg-gray-700 outline-none px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n} {t("page_2")}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 flex items-center gap-2">
            <IoIosSearch className="text-lg text-gray-400" />
            <input
              type="text"
              className="outline-none bg-transparent text-sm dark:text-white placeholder:text-gray-400 w-44"
              placeholder={t("search_companies")}
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
                companyData.map((company,index) => {
                    const rr = index % 2 == 0;
                    return(

                  <tr
                    key={company.id}
                    className={`${
                      rr
                        ? "bg-white dark:bg-transparent hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                        : "bg-slate-100/50 dark:bg-slate-900/30 hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                    } w-full group transition-colors `}
                
                  >
                    <td
                      onClick={() => router.push(`/companies/${company.id}`)}
                      className="py-4 pr-4 p-2 cursor-pointer"
                    >
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
                      <span className="text-white text-xs font-medium px-2.5 py-1 text-nowrap rounded-md dark:text-gray-300 capitalize bg-cyan-500 p-">
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
                      <span className="text-xs text-gray-600 dark:text-gray-300 text-nowrap capitalize">
                        {getCountryName(company.country)}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 text-nowrap rounded-md capitalize bg-red-600 text-white `}
                      >
                        {company.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      {company.subscription ? (
                        <Link
                          href={`/subscriptions/${company.id}`}
                          className="text-xs text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2.5 py-1 rounded-md"
                        >
                          {company.subscriptionCount} {t("active_3")}
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

                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/companies/${company.id}`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                        >
                          <IoEyeOutline className="text-base" />
                        </Link>

                        {/* <Link
                          href={`/companies/update/${company.id}`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <MdOutlineEdit className="text-base" />
                        </Link> */}

                        <button
                          onClick={() => handleOpenRestore(company)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-cyan-100 hover:text-cyan-600 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-400 transition-colors"
                        >
                          <IoRefreshOutline className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>)}
                )
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-gray-400 text-sm"
                  >
                    {t("no_companies_found")}
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

      {/* Restore Confirmation Modal — rendered ONCE outside the table/map */}
      <TermsConfirmModal
        isOpen={restorePopup}
        onClose={handleCloseRestore}
        onConfirm={() => {
          if (selectedCompany) onRestore(selectedCompany.id);
          handleCloseRestore();
        }}
        variant="info"
        icon={<IoRefreshOutline className="text-base" />}
        title={t("restore_company") || "Restore Company"}
        subtitle={selectedCompany?.companyName}
        description={
          
          t("restoreCompanyTerms")
        }
        terms={[
          t("restore_terms_intro"),
          t("restore_term_1"),
          t("restore_term_2"),
          t("restore_term_3"),
          t("restore_term_4"),
          t("restore_term_5"),
          t("restore_term_6"),
        ]}
        checkboxLabel={
          t("agree_terms_restore") ||
          "I have read and agree to the terms & conditions for restoring this company."
        }
        confirmLabel={t("restore") || "Restore"}
      />
    </div>
  );
};

export default DeletedTable;