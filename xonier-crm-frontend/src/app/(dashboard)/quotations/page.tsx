"use client";
import TabsButton from "@/src/components/ui/TabsButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { Quotation } from "@/src/types/quotations/quote.types";
import axios from "axios";
import Link from "next/link";
import React, { JSX, useState, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { MdDriveFolderUpload, MdOutlineEdit, MdOutlineLeaderboard } from "react-icons/md";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import { FaRegEye, FaChevronDown, FaCheck } from "react-icons/fa";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS, QuotationStatus } from "@/src/constants/enum";
import { QuoteService } from "@/src/services/quote.service";
import { TeamService } from "@/src/services/team.service";
// import { DesignationService } from "@/src/services/designation.service"; // ✅ uncommented - required by getDesignationData
import { formatDate } from "../../utils/date.utils";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import StatusBadge from "@/src/components/common/Status";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import QuotationFileUploadModal from "@/src/components/common/QuotationFileUploadModal";
import { useAdvancedFilters } from "@/src/hooks/useAdvanceFilter";
import AdvancedFilters from "@/src/components/common/AdvanceFilter";
import Pagination from "@/src/components/common/pagination";

const STATUS_CONFIG = {
  [QuotationStatus.DRAFT]: { label: "Draft", color: "bg-gray-600" },
  [QuotationStatus.SENT]: { label: "Sent", color: "bg-cyan-600" },
  [QuotationStatus.UPDATED]: { label: "Updated", color: "bg-amber-500" },
  [QuotationStatus.RESEND]: { label: "Resend", color: "bg-indigo-600" },
  [QuotationStatus.VIEWED]: { label: "Viewed", color: "bg-purple-600" },
  [QuotationStatus.ACCEPTED]: { label: "Accepted", color: "bg-green-600" },
  [QuotationStatus.REJECTED]: { label: "Rejected", color: "bg-red-600" },
  [QuotationStatus.EXPIRED]: { label: "Expired", color: "bg-orange-600" },
  [QuotationStatus.DELETE]: { label: "Delete", color: "bg-red-800" },
};

const AVAILABLE_STATUSES = [
  QuotationStatus.DRAFT,
  QuotationStatus.SENT,
  QuotationStatus.UPDATED,
  QuotationStatus.RESEND,
  QuotationStatus.VIEWED,
  QuotationStatus.ACCEPTED,
  QuotationStatus.REJECTED,
  QuotationStatus.EXPIRED,
];

const StatusDropdown = ({
  currentStatus,
  quoteId,
  onStatusUpdate,
}: {
  currentStatus: QuotationStatus;
  quoteId: string;
  onStatusUpdate: (id: string, newStatus: QuotationStatus) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }
    setIsUpdating(true);
    try {
      await onStatusUpdate(quoteId, newStatus);
      setIsOpen(false);
    } catch (error) {
      // handled in parent
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`${
          STATUS_CONFIG[currentStatus]?.color || "bg-gray-500"
        } text-white px-4 py-1.5 text-sm rounded-md capitalize flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-between`}
      >
        <span>{STATUS_CONFIG[currentStatus]?.label || currentStatus}</span>
        {isUpdating ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FaChevronDown
            className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-250 min-w-[180px] py-1 max-h-[140px] overflow-y-auto">
          {AVAILABLE_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group ${
                status === currentStatus ? "bg-gray-50 dark:bg-gray-700/50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${STATUS_CONFIG[status].color}`} />
                <span className="text-sm dark:text-gray-200 capitalize">
                  {STATUS_CONFIG[status].label}
                </span>
              </div>
              {status === currentStatus && <FaCheck className="text-green-600 text-xs" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quotation[]>([]);
  const [wonQuoteData, setWonQuoteData] = useState<Quotation[]>([]);
  const [lostQuoteData, setLostQuoteData] = useState<Quotation[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wonCurrentPage, setWonCurrentPage] = useState<number>(1);
  const [lostCurrentPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [wonTotalPages, setWonTotalPages] = useState<number>(1);
  const [lostTotalPages, setLostTotalPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const [TosearchVal, setToSearchVal] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState<string | null>(null);

  // Advanced filter data sources
  const [teamData, setTeamData] = useState<any[]>([]);
  const [designationData, setDesignationData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);

  // ✅ SINGLE SOURCE OF TRUTH for all advanced filters (Team, Designation, Sales Person, Source)
  const {
    teamFilter,
    setTeamFilter,
    designationFilter,
    setDesignationFilter,
    salesPersonFilter,
    setSalesPersonFilter,
    sourceFilter,
    setSourceFilter,
    reset: resetAdvancedFilters,
    activeCount: activeAdvancedFilterCount,
  } = useAdvancedFilters();

  const { hasPermission } = usePermissions();
  const router = useRouter();

  const getUserData = async (): Promise<void> => {
    try {
      // const result = await QuoteService.getAllActiveWithoutPagination();
      // if (result.status === 200) setUserData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  const getQuotationData = async () => {
    setIsLoading(true);
    try {
      const result = await QuoteService.getAll(currentPage, pageLimit, {
        search: searchVal,
        ...dateFilter,
        team: teamFilter || undefined,
        designation: designationFilter || undefined,
        source: sourceFilter || undefined, // ✅ added
      });
      if (result.status === 200) {
        const data = result.data.data;
        setQuoteData(data.data);
        console.log(data.data)
        setCurrentPage(data.page);
        setPageLimit(data.limit);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getWonQuotationData = async () => {
    setIsLoading(true);
    try {
      const result = await QuoteService.getAll(currentPage, pageLimit, {
        status: QuotationStatus.ACCEPTED,
        search: searchVal,
        ...dateFilter,
        team: teamFilter || undefined,
        designation: designationFilter || undefined,
        source: sourceFilter || undefined, // ✅ added
      });
      if (result.status === 200) {
        const data = result.data.data;
        setWonQuoteData(data.data);
        setWonCurrentPage(data.page);
        setWonPageLimit(data.limit);
        setWonTotalPages(data.totalPages);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLostQuotationData = async () => {
    setIsLoading(true);
    try {
      const result = await QuoteService.getAll(currentPage, pageLimit, {
        status: QuotationStatus.REJECTED,
        search: searchVal,
        ...dateFilter,
        team: teamFilter || undefined,
        designation: designationFilter || undefined,
        source: sourceFilter || undefined, // ✅ added
      });
      if (result.status === 200) {
        const data = result.data.data;
        setLostQuoteData(data.data);
        setLostCurrentPage(data.page);
        setLostPageLimit(data.limit);
        setLostTotalPages(data.totalPages);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamData = async (): Promise<void> => {
    try {
      // const result = await TeamService.getAllWithoutPagination();
      // if (result.status === 200) setTeamData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  const getDesignationData = async (): Promise<void> => {
    try {
      // const result = await DesignationService.getAllWithoutPagination();
      // if (result.status === 200) setDesignationData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  const handleTabs = async (no: number): Promise<void> => {
    setCurrentTab(no);
    if (no === 2) await getQuotationData();
    if (no === 3) await getQuotationData();
  };

  const updateQuoteStatus = async (id: string, newStatus: QuotationStatus): Promise<void> => {
    try {
      const result = await QuoteService.updateStatus(id, { quotationStatus: newStatus });
      if (result.status === 200) {
        toast.success(`Quotation status updated to ${STATUS_CONFIG[newStatus].label} successfully`);
        setQuoteData((prevData) =>
          prevData.map((quote) => (quote.id === id ? { ...quote, quotationStatus: newStatus } : quote))
        );
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`Failed to update status: ${messages}`);
      } else {
        setErr(["Something went wrong"]);
        toast.error("Failed to update status");
      }
      throw error;
    }
  };

  useEffect(() => {
    getQuotationData();
  }, [currentPage, pageLimit]);

  useEffect(() => {
    getWonQuotationData();
  }, [wonCurrentPage, wonPageLimit]);

  useEffect(() => {
    getTeamData();
    getDesignationData();
  }, []);

  useEffect(() => {
    getUserData();
  }, []);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setToSearchVal(val);
    }, 500);
  };

  // ✅ SINGLE effect — refetch whenever any filter changes (search, date, team, designation, source)
  useEffect(() => {
    if (currentTab === 1) getQuotationData();
    else if (currentTab === 2) getWonQuotationData();
    else if (currentTab === 3) getLostQuotationData();
  }, [TosearchVal, dateFilter, teamFilter, designationFilter, sourceFilter]);

  // ✅ SINGLE effect — reset everything when switching tabs
  useEffect(() => {
    setToSearchVal("");
    setSearchVal("");
    resetAdvancedFilters();
  }, [currentTab]);

  // Base data for the active tab
  const baseQuoteData =
    currentTab === 1 ? quoteData : currentTab === 2 ? wonQuoteData : lostQuoteData;

  // Client-side filter: Sales Person filter compares against quote's createdBy user
  const currentQuoteData = !salesPersonFilter
    ? baseQuoteData
    : baseQuoteData.filter((item: any) => item.createdBy?.id === salesPersonFilter);

  const handleUploadSuccess = () => {
    router.refresh();
    setUploadModalOpen(null);
  };

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
              {t("all_sales_quotations")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{t("view_and_edit_quotations")}</p>
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-100 dark:bg-gray-600 px-3 py-2.5 border border-slate-900/10 outline-none text-slate-500 rounded-lg  dark:text-white/70"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2 dark:text-white/70">
              <IoIosSearch className="text-xl text-slate-400" />
              <input
                type="text"
                className="outline-none bg-transparent"
                placeholder={t("search_3")}
                value={searchVal}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div>
              <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
            </div>
            {hasPermission(PERMISSIONS.readLead) && (
              <Link
                href={"/leads"}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group"
              >
                <MdOutlineLeaderboard className="group-hover:rotate-90 transition-all duration-300" />
                {t("all_leads")}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full">
          <ul className="w-full flex items-center gap-5">
            <li>
              <TabsButton
                btnTxt={t("all_quotations")}
                dataLen={quoteData.length}
                no={1}
                currentVal={currentTab}
                onClickEvent={() => setCurrentTab(1)}
              />
            </li>
            <li>
              <TabsButton
                btnTxt={t("won_quotations")}
                dataLen={wonQuoteData.length}
                no={2}
                currentVal={currentTab}
                onClickEvent={() => handleTabs(2)}
              />
            </li>
            <li>
              <TabsButton
                btnTxt={t("lost_quotations")}
                dataLen={lostQuoteData.length}
                no={3}
                currentVal={currentTab}
                onClickEvent={() => handleTabs(3)}
              />
            </li>
          </ul>
        </div>

        {/* ✅ Common Advanced Filters component — reused across Leads/Enquiry/Deals/Quotations */}
        <AdvancedFilters
          teamData={teamData}
          designationData={designationData}
          userData={userData}
          teamFilter={teamFilter}
          designationFilter={designationFilter}
          salesPersonFilter={salesPersonFilter}
          sourceFilter={sourceFilter}
          onTeamChange={setTeamFilter}
          onDesignationChange={setDesignationFilter}
          onSalesPersonChange={setSalesPersonFilter}
          onSourceChange={setSourceFilter}
          onReset={resetAdvancedFilters}
          activeCount={activeAdvancedFilterCount}
        />

        {currentTab === 1 && (
          <table className="w-full">
            <thead className="w-full bg-slate-200">
              <tr className="w-full border-b-2 border-zinc-300 dark:border-zinc-400 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tl-xl ">
                  {t("quote_title")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("client_name")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("quotation_status")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_date")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_by")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tr-xl ">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                currentQuoteData && Array.isArray(currentQuoteData) && currentQuoteData.length > 0 ? (
                  currentQuoteData.map((item, i) => {
                    const rr = i % 2 == 0;
                    const date = formatDate(item.createdAt);
                    return (
                      <tr
                        key={item.quoteId}
                        className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}
                      >
                        <td className="flex gap-1 flex-col p-4">
                          <h4 className="capitalize text-[16px] text-slate-500 dark:text-white/70">{item.title}</h4>
                        </td>
                        <td className="p-4">
                          <span className="text-[12px] px-2 py-1 bg-green-50 text-green-500 rounded-lg">
                            {item.customerName}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.quotationStatus !== QuotationStatus.DELETE &&
                          hasPermission(PERMISSIONS.updateQuote) ? (
                            <StatusDropdown
                              currentStatus={item.quotationStatus}
                              quoteId={item.id}
                              onStatusUpdate={updateQuoteStatus}
                            />
                          ) : (
                            <StatusBadge status={item.quotationStatus} />
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-[12px] text-nowrap text-cyan-600 font-medium ">
                            {date}
                          </span>
                        </td>
                        <td className="p-4 capitalize text-[16px] text-slate-500 dark:text-white/70 ">
                          {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {hasPermission(PERMISSIONS.readQuote) ? (
                              <Link
                                href={`/quotations/view/${item.id}`}
                                className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                              >
                                <FaRegEye className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 text-green-500 opacity-80 cursor-not-allowed">
                                <FaRegEye className="text-xl" />
                              </span>
                            )}
                            {hasPermission(PERMISSIONS.updateQuote) ? (
                              <Link
                                href={`/quotations/update/${item.id}`}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                              >
                                <MdOutlineEdit className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                                <MdOutlineEdit className="text-xl" />
                              </span>
                            )}
                            {(!item.attachments || item.attachments.length === 0) && (
                              <button
                                onClick={() => setUploadModalOpen(item.id)}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-green-200/80 dark:bg-green-100 hover:bg-green-300/70 dark:hover:bg-green-200 text-green-500 hover:scale-104"
                              >
                                <MdDriveFolderUpload className="text-xl" />
                              </button>
                            )}
                            <QuotationFileUploadModal
                              isOpen={uploadModalOpen === item.id}
                              onClose={() => setUploadModalOpen(null)}
                              quotationId={item.id}
                              onUploadSuccess={handleUploadSuccess}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={6}>
                      {t("data_not_found")}
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 10 }).map((item, i) => {
                  let rr = i % 2 == 0;
                  return (
                    <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                      <td className="text-center p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Skeleton width={110} height={28} borderRadius={12} />
                          <Skeleton width={140} height={12} borderRadius={10} />
                        </div>
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Skeleton width={32} height={32} borderRadius={10} />
                          <Skeleton width={32} height={32} borderRadius={10} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {currentTab === 2 && (
          <table className="w-full">
            <thead>
              <tr className="w-full border-b-2 rounded-2xl border-zinc-300 dark:border-zinc-400 bg-slate-200 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tl-xl">
                  {t("quote_title")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("client_name")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("quotation_status")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_date")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tr-xl">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                currentQuoteData && Array.isArray(currentQuoteData) && currentQuoteData.length > 0 ? (
                  currentQuoteData.map((item, i) => {
                    let rr = i % 2 == 0;
                    const date = formatDate(item.createdAt);
                    return (
                      <tr key={item.quoteId} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                        <td className="flex gap-1 flex-col p-4">
                          <h4 className="capitalize text-[16px] text-slate-500 dark:text-white/70">{item.title}</h4>
                        </td>
                        <td className="p-4">{item.customerName}</td>
                        {hasPermission(PERMISSIONS.updateQuote) ? (
                          <td className="p-4">
                            <StatusDropdown currentStatus={item.quotationStatus} quoteId={item.id} onStatusUpdate={updateQuoteStatus} />
                          </td>
                        ) : (
                          <td className="p-4">
                            <StatusBadge status={item.quotationStatus} />
                          </td>
                        )}
                        <td className="p-4">
                          <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-sm text-cyan-600 font-medium">{date}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {hasPermission(PERMISSIONS.readLead) ? (
                              <Link href={`/quotations/view/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104">
                                <FaRegEye className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 text-green-500 opacity-80 cursor-not-allowed">
                                <FaRegEye className="text-xl" />
                              </span>
                            )}
                            {hasPermission(PERMISSIONS.updateLead) ? (
                              <Link href={`/quotations/update/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104">
                                <MdOutlineEdit className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                                <MdOutlineEdit className="text-xl" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={6}>
                      {t("data_not_found")}
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 10 }).map((item, i) => {
                  let rr = i % 2 == 0;
                  return (
                    <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                      <td className="text-center p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Skeleton width={110} height={28} borderRadius={12} />
                          <Skeleton width={140} height={12} borderRadius={10} />
                        </div>
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Skeleton width={32} height={32} borderRadius={10} />
                          <Skeleton width={32} height={32} borderRadius={10} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {currentTab === 3 && (
          <table className="w-full">
            <thead>
              <tr className="w-full  border-b-2 border-zinc-300 dark:border-zinc-400 bg-slate-200 dark:bg-gray-800">
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tl-xl">
                  {t("quote_title")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("client_name")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("quotation_status")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                  {t("created_date")}
                </th>
                <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300 rounded-tr-xl">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                currentQuoteData && Array.isArray(currentQuoteData) && currentQuoteData.length > 0 ? (
                  currentQuoteData.map((item, i) => {
                    let rr = i % 2 == 0;
                    const date = formatDate(item.createdAt);
                    return (
                      <tr key={item.quoteId} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                        <td className="flex gap-1 flex-col p-4">
                          <h4 className="capitalize text-[16px] text-slate-500 dark:text-white/70">{item.title}</h4>
                        </td>
                        <td className="p-4">{item.customerName}</td>
                        <td className="p-4">
                          <StatusDropdown currentStatus={item.quotationStatus} quoteId={item.id} onStatusUpdate={updateQuoteStatus} />
                        </td>
                        <td className="p-4">
                          <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-sm text-cyan-600 font-medium">{date}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {hasPermission(PERMISSIONS.readLead) ? (
                              <Link href={`/quotations/view/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104">
                                <FaRegEye className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 text-green-500 opacity-80 cursor-not-allowed">
                                <FaRegEye className="text-xl" />
                              </span>
                            )}
                            {hasPermission(PERMISSIONS.updateLead) ? (
                              <Link href={`/quotations/update/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104">
                                <MdOutlineEdit className="text-xl" />
                              </Link>
                            ) : (
                              <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                                <MdOutlineEdit className="text-xl" />
                              </span>
                            )}
                            {(!item.attachments || item.attachments.length === 0) && (
                              <button
                                onClick={() => setUploadModalOpen(item.id)}
                                className="h-9 w-9 flex items-center justify-center rounded-md bg-green-200/80 dark:bg-green-100 hover:bg-green-300/70 dark:hover:bg-green-200 text-green-500 hover:scale-104"
                              >
                                <MdDriveFolderUpload className="text-xl" />
                              </button>
                            )}
                            <QuotationFileUploadModal
                              isOpen={uploadModalOpen === item.id}
                              onClose={() => setUploadModalOpen(null)}
                              quotationId={item.id}
                              onUploadSuccess={handleUploadSuccess}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={6}>
                      {t("data_not_found")}
                    </td>
                  </tr>
                )
              ) : (
                Array.from({ length: 10 }).map((item, i) => {
                  let rr = i % 2 == 0;
                  return (
                    <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                      <td className="text-center p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Skeleton width={110} height={28} borderRadius={12} />
                          <Skeleton width={140} height={12} borderRadius={10} />
                        </div>
                      </td>
                      <td className="p-4">
                        <Skeleton width={80} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={120} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <Skeleton width={110} height={30} borderRadius={14} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Skeleton width={32} height={32} borderRadius={10} />
                          <Skeleton width={32} height={32} borderRadius={10} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
         <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} className="w-full" />
      </div>
      
    </div>
  );
};

export default page;