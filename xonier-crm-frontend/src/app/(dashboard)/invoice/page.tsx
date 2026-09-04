"use client";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import axios from "axios";
import Link from "next/link";
import React, { JSX, useEffect, useState, useRef } from "react";
import { FaPlus, FaRegEye } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import InvoiceService from "@/src/services/invoice.service";
import { Invoice } from "@/src/types/invoice/invoice.types";
import { handleCopy } from "../../utils/clipboard.utils";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { formatDate } from "../../utils/date.utils";
import { formatCurrency } from "../../utils/currency.utils";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentText,
  IoSendOutline,
  IoCardOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import CreatedAt from "@/src/components/common/CreatedAt";
import StatusBadge from "@/src/components/common/Status";
import { useTranslation } from "react-i18next";
import { FiUser, FiCalendar, FiDollarSign, FiActivity, FiClock, FiSettings } from "react-icons/fi";
import Pagination from "@/src/components/common/pagination";

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [err, setErr] = useState<string[] | string>("");
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [searchVal, setSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalPages,setTotalPages]=useState<number>(1)

  const { hasPermission } = usePermissions();

  const getInvoiceData = async () => {
    setIsLoading(true)
    try {
      const result = await InvoiceService.getAll(currentPage, pageLimit, { fullName: searchVal, ...dateFilter, status: statusFilter || undefined })
      if (result.status === 200) {
        const data = result.data.data
        setInvoiceData(data.data)
        setCurrentPage(Number(data.page))
        setPageLimit(Number(data.limit))
        setTotalPages(Number(data.totalPages))
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getInvoiceData()
  }, [currentPage, pageLimit, searchVal, dateFilter, statusFilter]);
  const handleSearch = (val: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchVal(val);
    }, 500);
  };
  return (
    <div>
      <div className="bg-white mb-4 dark:bg-gray-700 dark:backdrop-blur-sm  gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold  dark:text-white text-slate-900 capitalize">
            {t("invoices")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t("you_want_to_manage_your_invoices")}
          </p>
        </div>
      </div>

      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              {t("all_invoices")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 ">
              {t("edit_or_remove_invoices")}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 outline-none text-slate-500 rounded-lg border-[1px] border-slate-900/10 dark:text-white/70"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 text-slate-500 rounded-lg border-[1px] border-slate-900/10 flex items-center gap-2 dark:text-white/70">
              <IoIosSearch className="text-xl" />
              <input type="text" className="outline-none" placeholder={t("search_3")} onChange={(e) => handleSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 outline-none text-slate-500 rounded-lg border-[1px] border-slate-900/10 dark:text-white/70 capitalize"
              >
                <option value="">All Statuses</option>
                {["DRAFT", "ISSUED", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"].map(s => (
                  <option key={s} value={s}>{s.toLowerCase().replace("_", " ")}</option>
                ))}
              </select>
              <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
            </div>
          </div>
        </div>
        <div className="w-full rounded-xl overflow-x-scroll text-nowrap">

          <table className="w-full rounded-xl overflow-x-scroll text-nowrap">
            <thead>
              <tr className="w-full border-b border-slate-200/80 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
                {/* <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                  Invoice Id
                </th> */}
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiUser className="text-[13px] text-cyan-500"/> {t("client_info")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-amber-500"/> {t("issue_date")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-400 dark:text-slate-500">
                  {" "}
                  {t("due_date")}
                </th>

                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiDollarSign className="text-[14px] text-emerald-500"/> {t("amount")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiActivity className="text-[13px] text-indigo-400"/> {t("status")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiClock className="text-[13px] text-slate-400"/> {t("created_date")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiUser className="text-[13px] text-slate-400"/> {t("created_by")}</div>
                </th>
                <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FiSettings className="text-[13px] text-slate-400"/> {t("actions")}</div>
                </th>
              </tr>
            </thead>

            <tbody className="">
              {!isLoading ? ((invoiceData && Array.isArray(invoiceData) && invoiceData.length > 0) ? (
                invoiceData.map((item, i) => {
                  let rr = i % 2 == 0;
                  const issueDate = item.issueDate ? formatDate(item.issueDate) : "";
                  const dueDate = formatDate(item.dueDate)
                  const amount = formatCurrency(item.total)
                  return (
                    <tr
                      key={item.invoiceId}
                      className="border-b border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/30 w-full transition-colors duration-150 text-nowrap"
                    >
                      {/* <td className="p-4">
                      <Link href={`/invoice/view/${item.id}`} className="text-sm cursor-pointer hover:text-cyan-500" > {item.invoiceId}</Link>
                    </td> */}
                      <td className="flex gap-1 flex-col p-4">
                        <h4 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 capitalize">{item.customerName}</h4>{" "}

                      </td>
                      <td className="p-4 ">
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                          {issueDate}
                        </span>
                      </td>
                      <td className="p-4 ">
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                          {" "}
                          {dueDate}
                        </span>
                      </td>
                      <td className="p-4"> <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200"> {amount} </span> </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium border ${item.status.toUpperCase() === 'DRAFT'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                            : item.status.toUpperCase() === 'ISSUED'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : item.status.toUpperCase() === 'SENT'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
                              : item.status.toUpperCase() === 'PAID'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                                : item.status.toUpperCase() === 'PARTIALLY_PAID'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : item.status.toUpperCase() === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                    : item.status.toUpperCase() === 'CANCELLED'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                            }`}
                        >
                          {item.status.toUpperCase() === 'DRAFT' && <IoDocumentText className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'ISSUED' && <IoSendOutline className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'SENT' && <IoSendOutline className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'PAID' && <IoCheckmarkCircle className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'PARTIALLY_PAID' && <IoCardOutline className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'OVERDUE' && <IoAlertCircleOutline className="w-3.5 h-3.5" />}
                          {item.status.toUpperCase() === 'CANCELLED' && <IoCloseCircle className="w-3.5 h-3.5" />}
                          {!['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'].includes(item.status.toUpperCase()) && (
                            <IoDocumentText className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">
                            {item.status.toLowerCase().replace('_', ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="p-4">

                        <div className="flex items-center gap-2">
                          <CreatedAt timestamp={item.createdAt} />
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 capitalize">{item.createdBy?.firstName + " " + item.createdBy?.lastName}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {hasPermission(PERMISSIONS.readInvoice) ? <Link
                            href={`/invoice/view/${item.id}`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                          >
                            <FaRegEye className="text-xl" />
                          </Link> : <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"> <FaRegEye className="text-xl" /> </span>}
                          {/* {hasPermission(PERMISSIONS.updateEnquiry) ? (
                          <Link
                            href={`/enquiry/update/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md
               bg-yellow-200/80 dark:bg-yellow-100
               hover:bg-yellow-300/70 dark:hover:bg-yellow-200
               text-yellow-500 hover:scale-104"
                          >
                            <MdOutlineEdit className="text-xl" />
                          </Link>
                        ) : (
                          <span
                            className="h-9 w-9 flex items-center justify-center rounded-md
               bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed"
                          >
                            <MdOutlineEdit className="text-xl" />
                          </span>
                        )} */}
                          {/* <button
                          onClick={() => handleDelete(item.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-red-100 disabled:opacity-80"
                          disabled={!hasPermission(PERMISSIONS.deleteEnquiry)}
                        >
                          {" "}
                          <MdDeleteOutline className="text-xl" />{" "}
                        </button> */}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : <tr><td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={8}>{t("data_not_found")}</td></tr>) : (
                <tr className="p-4">
                  <td className="text-center p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                  <td className="p-4">
                    <Skeleton height={30} borderRadius={14} />
                  </td>
                </tr>
              )}
            </tbody>

          </table>
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default page;
