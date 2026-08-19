"use client";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { JSX, useState, useEffect, useRef } from "react";
import { FaRegEye } from "react-icons/fa";
import { IoIosSearch } from "react-icons/io";
import { usePermissions } from "@/src/hooks/usePermissions";
import { DEAL_PIPELINE, DEAL_STAGES, DEAL_STATUS, PERMISSIONS } from "@/src/constants/enum";
import { Deal } from "@/src/types/deals/deal.types";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import { toast } from "react-toastify";
import dealService from "@/src/services/deal.service";
import { TeamService } from "@/src/services/team.service";
// import { DesignationService } from "@/src/services/designation.service"; // ✅ uncommented
import Skeleton from "react-loading-skeleton";
import TabsButton from "@/src/components/ui/TabsButton";
import { MdOutlineEdit, MdOutlineLeaderboard } from "react-icons/md";
import Link from "next/link";
import { formatDate } from "@/src/app/utils/date.utils";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import { FaRegPaperPlane } from "react-icons/fa";
import Pagination from "@/src/components/common/pagination";
import { useSearchParams } from "next/navigation";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAdvancedFilters } from "@/src/hooks/useAdvanceFilter";
import AdvancedFilters from "@/src/components/common/AdvanceFilter";

const DealContent = (): JSX.Element => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dealData, setDealData] = useState<Deal[]>([]);
  const [wonDealData, setWonDealData] = useState<Deal[]>([]);
  const [lostDealData, setLostDealData] = useState<Deal[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wonCurrentPage, setWonCurrentPage] = useState<number>(1);
  const [lostCurrentPage, setLostCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [wonPageLimit, setWonPageLimit] = useState<number>(10);
  const [lostPageLimit, setLostPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalWonPages, setTotalWonPages] = useState<number>(1);
  const [totalLostPages, setTotalLostPages] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });

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
  const searchFilters = useSearchParams();
  const userid = searchFilters.get("userid");

  // ✅ Build filters object for API calls
  const buildFiltersObject = () => ({
    name: searchVal,
    team: teamFilter || undefined,
    designation: designationFilter || undefined,
    source: sourceFilter || undefined,
    userid,
    ...dateFilter,
  });

  const getUserData = async (): Promise<void> => {
    try {
      // const result = await dealService.getAllActiveWithoutPagination(); // adjust this call if needed
      // if (result.status === 200) setUserData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  const getDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(currentPage, pageLimit, buildFiltersObject());
      if (result.status === 200) {
        const data = result.data.data;
        setDealData(data.data);
        console.log("deal data: ", data.data);
        setCurrentPage(Number(data.page));
        setPageLimit(Number(data.limit));
        setTotalPages(Number(data.totalPages));
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

  const getWonDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(wonCurrentPage, wonPageLimit, {
        ...buildFiltersObject(),
        stage: "won",
      });
      if (result.status === 200) {
        const data = result.data.data;
        setWonDealData(data.data);
        setWonCurrentPage(Number(data.page));
        setWonPageLimit(Number(data.limit));
        setTotalWonPages(Number(data.totalPages));
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

  const getLostDealData = async () => {
    setIsLoading(true);
    try {
      const result = await dealService.getAll(lostCurrentPage, lostPageLimit, {
        ...buildFiltersObject(),
        stage: "lost",
      });
      if (result.status === 200) {
        const data = result.data.data;
        setLostDealData(data.data);
        setLostCurrentPage(Number(data.page));
        setLostPageLimit(Number(data.limit));
        setTotalLostPages(Number(data.totalPages));
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
    if (no === 2) await getWonDealData();
    if (no === 3) await getLostDealData();
  };

  const handlePageLimit = async (v: number) => {
    if (currentTab === 1) setPageLimit(v);
    else if (currentTab === 2) setWonPageLimit(v);
    else if (currentTab === 3) setLostPageLimit(v);
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Search will trigger re-fetch via useEffect
    }, 300);
  };

  useEffect(() => {
    getDealData();
  }, [currentPage, pageLimit]);

  useEffect(() => {
    getWonDealData();
  }, [wonCurrentPage, wonPageLimit]);

  useEffect(() => {
    getLostDealData();
  }, [lostCurrentPage, lostPageLimit]);

  useEffect(() => {
    getTeamData();
    getDesignationData();
    getUserData();
  }, []);

  // ✅ SINGLE effect — refetch whenever any filter changes (search, date, team, designation, source)
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    if (currentTab === 1) getDealData();
    else if (currentTab === 2) getWonDealData();
    else if (currentTab === 3) getLostDealData();
  }, [searchVal, dateFilter, teamFilter, designationFilter, sourceFilter]);

  // ✅ SINGLE effect — reset everything when switching tabs
  useEffect(() => {
    setSearchVal("");
    resetAdvancedFilters();
  }, [currentTab]);

  // Base data for the active tab
  const baseDealData = currentTab === 1 ? dealData : currentTab === 2 ? wonDealData : lostDealData;

  // Client-side filter: Sales Person filter compares against deal's createdBy user
  const currentDealData = !salesPersonFilter
    ? baseDealData
    : baseDealData.filter((item: any) => item.createdBy?.id === salesPersonFilter);

  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">
        <div className="flex w-full items-center gap-12 justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              {t("all_sales_deals")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{t("create_edit_or_remove_deals")}</p>
          </div>
          <div className="flex items-center gap-6">
            <select
              name="limit"
              id="limit"
              className="bg-slate-50  dark:bg-gray-600 px-3 py-2.5 rounded-lg border text-slate-500 border-slate-900/10 outline-none dark:text-white/70"
              onChange={(e) => handlePageLimit(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">50</option>
            </select>
            <div className="bg-slate-50 dark:bg-gray-600 text-slate-500 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2 dark:text-white/70">
              <IoIosSearch className="text-xl" />
              <input
                type="text"
                className="outline-none "
                placeholder={t("search_2")}
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

        <div className="w-full flex justify-between">
          <ul className=" flex items-center gap-5">
            <li>
              <TabsButton
                btnTxt="All Deals"
                dataLen={dealData.length}
                no={1}
                currentVal={currentTab}
                onClickEvent={() => setCurrentTab(1)}
              />
            </li>
            <li>
              <TabsButton
                btnTxt="Won Deals"
                dataLen={wonDealData.length}
                no={2}
                currentVal={currentTab}
                onClickEvent={() => handleTabs(2)}
              />
            </li>
            <li>
              <TabsButton
                btnTxt="Lost Deals"
                dataLen={lostDealData.length}
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

        <div className="w-full rounded-xl overflow-x-scroll text-nowrap">
          {currentTab === 1 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead>
                <tr className="w-full border-b-2 border-zinc-300 dark:border-zinc-400 bg-slate-200 dark:bg-gray-800">
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                    {t("deal_name")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                    {t("deal_stage")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                    {t("against")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                    {t("created_date_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-300">
                    {t("created_by_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-300">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      return (
                        <tr
                          key={item.deal_id}
                          className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}
                        >
                          <td className="flex gap-1 flex-col p-4">
                            <h4 className="capitalize text-slate-500 text-[16px] dark:text-white/70">{item.dealName}</h4>
                          </td>
                          <td className="p-4 ">
                            <span
                              className={`${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-orange-500"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-cyan-600"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-cyan-500"
                                  : item.dealPipeline.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-600"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-green-500"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST
                                  ? "bg-red-500"
                                  : item.dealStage.trim() === DEAL_STAGES.DELETE
                                  ? "bg-red-500"
                                  : "bg-gray-600"
                              } text-white px-4 py-1.5 text-sm rounded-md capitalize`}
                            >
                              {item.dealStage.trim()}
                            </span>
                          </td>
                          <td className="p-4 ">
                            <span
                              className="bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                            >
                              {item?.lead_id?.lead_id ?? "N/A"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1.5 rounded-md bg-cyan-100 text-xs text-cyan-600 font-medium">
                              {date}
                            </span>
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/users/${item.createdBy.id}`}
                              className="flex text-[12px] items-center capitalize gap-1.5 bg-green-100/80 dark:bg-green-100 text-green-500 px-3.5 py-1 rounded-full w-fit cursor-pointer hover:scale-103 hover:bg-green-500 hover:text-white"
                            >
                              <FaRegUser className="text-[12px]" />
                              {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                            </Link>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {hasPermission(PERMISSIONS.readDeal) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                                >
                                  <FaRegEye className="text-xl" />
                                </Link>
                              ) : (
                                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                                  <FaRegEye className="text-xl" />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateDeal) && item.status !== DEAL_STATUS.DELETE ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                                >
                                  <MdOutlineEdit className="text-xl" />
                                </Link>
                              ) : (
                                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-400 opacity-80 cursor-not-allowed">
                                  <MdOutlineEdit className="text-xl" />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.createQuote) && item.status !== DEAL_STATUS.DELETE ? (
                                item.inQuotation ? (
                                  <span className="h-9 w-9 flex items-center justify-center rounded-md bg-orange-500 text-white  cursor-no-drop">
                                    <FaRegPaperPlane className="text-lg" />
                                  </span>
                                ) : (
                                  <Link
                                    href={`/deals/quotation/${item.id}`}
                                    className="h-9 w-9 flex items-center justify-center rounded-md bg-orange-200/80 dark:bg-orange-100 hover:bg-orange-300/70 dark:hover:bg-orange-200 text-orange-500 hover:scale-104"
                                  >
                                    <FaRegPaperPlane className="text-lg" />
                                  </Link>
                                )
                              ) : (
                                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-orange-100 text-orange-400 opacity-80 cursor-not-allowed">
                                  <FaRegPaperPlane className="text-lg" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={6}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                    const rr = i % 2 == 0;
                    return (
                      <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                        <td className="text-center p-4">
                          <Skeleton height={30} borderRadius={14} />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <Skeleton height={28} borderRadius={12} />
                          </div>
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
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentTab === 2 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead>
                <tr className="w-full border-b-2 border-zinc-300 bg-slate-200 dark:bg-gray-800">
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                    {t("deal_name")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("deal_stage")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("against")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("created_date_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                    {t("created_by_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      return (
                        <tr key={item.deal_id} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                          <td className="flex gap-1 flex-col p-4">
                            <h4 className="capitalize text-slate-500 text-[16px] dark:text-white/70">{item.dealName}</h4>
                          </td>
                          <td className="p-4 ">
                            <span
                              className={`${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-orange-500"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-cyan-600"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-cyan-500"
                                  : item.dealStage.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-600"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-green-500"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST
                                  ? "bg-red-500"
                                  : "bg-gray-600"
                              } text-white px-4 py-1.5 text-sm rounded-md capitalize`}
                            >
                              {item.dealStage.trim()}
                            </span>
                          </td>
                          <td className="p-4 ">
                            <span
                              className="bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                            >
                              {item?.lead_id?.lead_id}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-sm text-cyan-600 font-medium">{date}</span>
                          </td>
                          <td className="p-4">{item.createdBy?.firstName + " " + item.createdBy?.lastName}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {hasPermission(PERMISSIONS.readLead) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                                >
                                  <FaRegEye className="text-xl" />
                                </Link>
                              ) : (
                                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                                  <FaRegEye className="text-xl" />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateLead) ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                                >
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
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={7}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                    const rr = i % 2 == 0;
                    return (
                      <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                        <td className="text-center p-4">
                          <Skeleton height={30} borderRadius={14} />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <Skeleton height={28} borderRadius={12} />
                          </div>
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
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentTab === 3 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead>
                <tr className="w-full border-b-2 border-zinc-300 bg-slate-200 dark:bg-gray-800">
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                    {t("deal_name")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("deal_stage")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("against")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("created_date_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
                    {t("created_by_2")}
                  </th>
                  <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      return (
                        <tr key={item.deal_id} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                          <td className="flex gap-1 flex-col p-4">
                            <h4 className="capitalize text-slate-500 text-[16px] dark:text-white/70">{item.dealName}</h4>
                          </td>
                          <td className="p-4 ">
                            <span
                              className={`${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-orange-500"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-cyan-600"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-cyan-500"
                                  : item.dealStage.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-600"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-green-500"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST
                                  ? "bg-red-500"
                                  : "bg-gray-600"
                              } text-white px-4 py-1.5 text-sm rounded-md capitalize`}
                            >
                              {item.dealStage.trim()}
                            </span>
                          </td>
                          <td className="p-4 ">
                            <span
                              className="bg-cyan-100 text-cyan-500 px-3 py-1.5 text-xs rounded-sm cursor-copy"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                            >
                              {item?.lead_id?.lead_id}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-4 py-1.5 rounded-md bg-cyan-200 text-sm text-cyan-600 font-medium">{date}</span>
                          </td>
                          <td className="p-4">{item.createdBy?.firstName + " " + item.createdBy?.lastName}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              {hasPermission(PERMISSIONS.readLead) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                                >
                                  <FaRegEye className="text-xl" />
                                </Link>
                              ) : (
                                <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50  text-green-500 opacity-80 cursor-not-allowed">
                                  <FaRegEye className="text-xl" />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateLead) ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                                >
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
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={7}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                    const rr = i % 2 == 0;
                    return (
                      <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                        <td className="text-center p-4">
                          <Skeleton height={30} borderRadius={14} />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <Skeleton height={28} borderRadius={12} />
                          </div>
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
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

       
          {currentTab === 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} className="w-full" />
          )}
          {currentTab === 2 && (
            <Pagination
              currentPage={wonCurrentPage}
              totalPages={totalWonPages}
              onPageChange={(page) => setWonCurrentPage(page)}
              className="w-full"
            />
          )}
          {currentTab === 3 && (
            <Pagination
              currentPage={lostCurrentPage}
              totalPages={totalLostPages}
              onPageChange={(page) => setLostCurrentPage(page)}
              className="w-full"
            />
          )}
        
      </div>
    </div>
  );
};

export default DealContent;