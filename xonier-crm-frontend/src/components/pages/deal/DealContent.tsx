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
import { AuthService } from "@/src/services/auth.service";
// import { DesignationService } from "@/src/services/designation.service"; // ✅ uncommented
import Skeleton from "react-loading-skeleton";
import TabsButton from "@/src/components/ui/TabsButton";
import { MdOutlineEdit, MdOutlineLeaderboard } from "react-icons/md";
import Link from "next/link";
import DealKanbanBoard from "./DealKanbanBoard";
import { HiOutlineMenuAlt2, HiOutlineViewBoards } from "react-icons/hi";
import { formatDate } from "@/src/app/utils/date.utils";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import { FaRegPaperPlane } from "react-icons/fa";
import Pagination from "@/src/components/common/pagination";
import { useSearchParams } from "next/navigation";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { FiBriefcase, FiActivity, FiTag, FiCalendar, FiUserPlus, FiUser, FiSettings, FiFilter, FiX, FiUserCheck } from "react-icons/fi";
import { useAdvancedFilters } from "@/src/hooks/useAdvanceFilter";
import AdvancedFilters from "@/src/components/common/AdvanceFilter";
import UserSelect from "@/src/components/common/userselect";

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
  const [inputVal, setInputVal] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });

  // Multi-select state
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [assignDropdownOpen, setAssignDropdownOpen] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignSearchVal, setAssignSearchVal] = useState<string>("");
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  // Advanced filter data sources
  const [teamData, setTeamData] = useState<any[]>([]);
  const [designationData, setDesignationData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);

  // Deals-specific filters
  const [stageFilter, setStageFilter] = useState<string>("");
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");

  // Kept for AdvancedFilters compat (unused in deals now)
  const {
    teamFilter,
    setTeamFilter,
    designationFilter,
    setDesignationFilter,
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
    stage: stageFilter || undefined,
    createdBy: salesPersonFilter || undefined,
    assignedTo: assignedToFilter || undefined,
    userid,
    ...dateFilter,
  });

  const getUserData = async (): Promise<void> => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) setUserData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
    }
  };

  // ── Multi-select helpers ──
  const toggleSelectDeal = (id: string) => {
    setSelectedDeals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    if (ids.every((id) => selectedDeals.has(id))) {
      // all already selected → deselect all
      setSelectedDeals((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // select all visible
      setSelectedDeals((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedDeals(new Set());

  const handleBulkAssign = async (userId: string) => {
    if (selectedDeals.size === 0) return;
    setIsAssigning(true);
    try {
      const result = await dealService.bulkAssign(Array.from(selectedDeals), userId);
      if (result.status === 200) {
        toast.success(`${selectedDeals.size} deal(s) assigned successfully`);
        clearSelection();
        setAssignDropdownOpen(false);
        // Refresh current tab
        if (currentTab === 1) getDealData();
        else if (currentTab === 2) getWonDealData();
        else getLostDealData();
      }
    } catch (error) {
      const messages = extractErrorMessages(error);
      toast.error(Array.isArray(messages) ? messages[0] : messages || "Failed to assign deals");
    } finally {
      setIsAssigning(false);
    }
  };

  // Close assign dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssignDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clear assign search when dropdown closes
  useEffect(() => {
    if (!assignDropdownOpen) setAssignSearchVal("");
  }, [assignDropdownOpen]);

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
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchVal(val);
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

  // ✅ SINGLE effect — refetch whenever any filter changes (search, date, stage, createdBy, assignedTo)
  useEffect(() => {
    setCurrentPage(1);
    if (currentTab === 1) getDealData();
    else if (currentTab === 2) getWonDealData();
    else if (currentTab === 3) getLostDealData();
  }, [searchVal, dateFilter, stageFilter, salesPersonFilter, assignedToFilter]);

  // ✅ SINGLE effect — reset everything when switching tabs
  useEffect(() => {
    setSearchVal("");
    setInputVal("");
    setStageFilter("");
    setSalesPersonFilter("");
    setAssignedToFilter("");
    setDateFilter({ fromDate: "", toDate: "" });
  }, [currentTab]);


  // Base data for the active tab
  const baseDealData = currentTab === 1 ? dealData : currentTab === 2 ? wonDealData : lostDealData;

  const handleStageChange = async (dealId: string, newStage: DEAL_STAGES) => {
    try {
      const res = await dealService.updateStage(dealId, newStage);
      if (res.status === 200) {
        toast.success(t("deal_stage_updated_successfully"));
        // Refetch current tab data to reflect changes
        if (currentTab === 1) getDealData();
        else if (currentTab === 2) getWonDealData();
        else if (currentTab === 3) getLostDealData();
        return true;
      }
    } catch (error) {
      const messages = extractErrorMessages(error);
      toast.error(messages[0] || t("failed_to_update_deal_stage"));
    }
    return false;
  };

  // Server-side filters handle salesPersonFilter and assignedToFilter via API
  const currentDealData = baseDealData;

  return (
    <div>
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
                value={inputVal}
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
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-cyan-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Table View"
            >
              <HiOutlineMenuAlt2 size={18} />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-700 text-cyan-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Kanban Board View"
            >
              <HiOutlineViewBoards size={18} />
            </button>
          </div>
        </div>

        {/* ✅ Deals-specific Filter Bar */}
        <div className="w-full flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-700/50 rounded-xl border border-slate-200/80 dark:border-gray-600/50">
          {/* Deal Stage */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <FiActivity className="text-indigo-400" /> Deal Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 dark:bg-gray-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-500 text-[13px] text-slate-600 dark:text-white/80 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all cursor-pointer min-w-[160px]"
            >
              <option value="">All Stages</option>
              {Object.values(DEAL_STAGES)
                .filter((s) => s !== DEAL_STAGES.DELETE)
                .map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
            </select>

          </div>

          {/* Created By */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <FiUser className="text-rose-400" /> Created By
            </label>
            <UserSelect
              mode="single"
              value={salesPersonFilter}
              onChange={setSalesPersonFilter}
              placeholder="All users"
            />
          </div>

          {/* Assigned To */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <FiUserCheck className="text-cyan-500" /> Assigned To
            </label>
            <UserSelect
              mode="single"
              value={assignedToFilter}
              onChange={setAssignedToFilter}
              placeholder="All users"
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <FiCalendar className="text-emerald-500" /> Date Range
            </label>
            <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
          </div>

          {/* Clear Filters */}
          {(stageFilter || salesPersonFilter || assignedToFilter || dateFilter.fromDate || dateFilter.toDate) && (
            <button
              onClick={() => { setStageFilter(""); setSalesPersonFilter(""); setAssignedToFilter(""); setDateFilter({ fromDate: "", toDate: "" }); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-700 text-rose-500 dark:text-rose-400 text-[12px] font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors self-end"
            >
              <FiX size={13} /> Clear Filters
            </button>
          )}

          {/* ── Bulk Assign Toolbar in Filters Area ── */}
          {selectedDeals.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-cyan-50/50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 self-end ml-auto">
              {/* Count badge */}
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-cyan-700 dark:text-cyan-300">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {selectedDeals.size}
                </span>
                selected
              </span>

              <div className="w-px h-5 bg-cyan-200 dark:bg-cyan-800" />

              {/* Assign To dropdown */}
              <div className="relative" ref={assignDropdownRef}>
                <button
                  onClick={() => setAssignDropdownOpen((v) => !v)}
                  disabled={isAssigning}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  <FiUserCheck size={14} />
                  {isAssigning ? "Assigning..." : "Assign To"}
                  <svg className={`w-3.5 h-3.5 transition-transform ${assignDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </button>

                {assignDropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="p-2 border-b border-slate-100 dark:border-gray-700">
                      <div className="relative">
                        <IoIosSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          autoFocus
                          value={assignSearchVal}
                          onChange={(e) => setAssignSearchVal(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {userData.filter(u => `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(assignSearchVal.toLowerCase())).length === 0 ? (
                        <li className="px-4 py-3 text-[13px] text-slate-400 text-center">No users found</li>
                      ) : (
                        userData.filter(u => `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(assignSearchVal.toLowerCase())).map((u: any) => (
                          <li key={u.id || u._id}>
                            <button
                              onClick={() => handleBulkAssign(u.id || u._id)}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-700 transition-colors flex items-center gap-2"
                            >
                              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                {(u.firstName?.[0] || "").toUpperCase()}{(u.lastName?.[0] || "").toUpperCase()}
                              </span>
                              <span className="capitalize truncate">{u.firstName} {u.lastName}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-medium text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors ml-1"
                title="Clear selection"
              >
                <FiX size={14} />
              </button>
            </div>
          )}
        </div>

        {viewMode === "kanban" ? (
          <div className="w-full min-w-0 overflow-x-hidden mt-4">
            <DealKanbanBoard
              deals={currentDealData}
              onStageChange={handleStageChange}
              canViewDeal={hasPermission(PERMISSIONS.readDeal)}
              canUpdateDeal={hasPermission(PERMISSIONS.updateDeal)}
              canCreateQuote={hasPermission(PERMISSIONS.createQuote)}
            />
          </div>
        ) : (
          <>
            <div className="w-full rounded-xl overflow-x-scroll text-nowrap">
          {currentTab === 1 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-200/80 dark:border-gray-700">
                <tr className="w-full">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-cyan-600 cursor-pointer accent-cyan-600"
                      checked={currentDealData.length > 0 && currentDealData.every((d: any) => selectedDeals.has(d.id))}
                      onChange={() => toggleSelectAll(currentDealData.map((d: any) => d.id))}
                    />
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiBriefcase className="text-[13px] text-cyan-500"/> {t("deal_name")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiActivity className="text-[13px] text-indigo-400"/> {t("deal_stage")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiTag className="text-[13px] text-violet-500"/> {t("against")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-emerald-500"/> {t("created_date_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-amber-500"/> {t("close_date")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUserPlus className="text-[13px] text-slate-400"/> {t("created_by_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUser className="text-[13px] text-rose-400"/> Assigned To</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiSettings className="text-[13px] text-slate-400"/> {t("actions")}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      const isSelected = selectedDeals.has(item.id);
                      return (
                        <tr
                          key={item.deal_id}
                          className={`group border-b border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/30 w-full transition-colors duration-150 text-nowrap ${isSelected ? "bg-cyan-50/60 dark:bg-cyan-900/10" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-cyan-600"
                              checked={isSelected}
                              onChange={() => toggleSelectDeal(item.id)}
                            />
                          </td>
                          <td className="px-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                            <h4 className="capitalize font-semibold text-[13px] text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 transition-colors">{item.dealName}</h4>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize tracking-wide ${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                                  : item.dealPipeline.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST || item.dealStage.trim() === DEAL_STAGES.DELETE
                                  ? "bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {item.dealStage.trim().replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-copy hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                              title="Copy Lead ID"
                            >
                              {item?.lead_id?.lead_id ?? "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{date}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.closeDate ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400">{formatDate(item.closeDate)}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/users/${item.createdBy.id}`} className="text-[13px] text-slate-500 dark:text-slate-400 capitalize hover:text-cyan-600 transition-colors">
                              {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.assignedTo ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 capitalize">
                                {item.assignedTo.firstName + " " + item.assignedTo.lastName}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {hasPermission(PERMISSIONS.readDeal) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                                  title="View"
                                >
                                  <FaRegEye size={15} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegEye size={15} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateDeal) && item.status !== DEAL_STATUS.DELETE ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Edit"
                                >
                                  <MdOutlineEdit size={16} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <MdOutlineEdit size={16} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.createQuote) && item.status !== DEAL_STATUS.DELETE ? (
                                item.inQuotation ? (
                                  <span className="h-8 w-8 flex items-center justify-center rounded-lg text-orange-300 cursor-not-allowed" title="Already in Quotation">
                                    <FaRegPaperPlane size={14} />
                                  </span>
                                ) : (
                                  <Link
                                    href={`/deals/quotation/${item.id}`}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                    title="Create Quotation"
                                  >
                                    <FaRegPaperPlane size={14} />
                                  </Link>
                                )
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegPaperPlane size={14} />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={9}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                      const rr = i % 2 == 0;
                      return (
                        <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                          <td className="p-4"><Skeleton height={28} borderRadius={12} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                        </tr>
                      );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentTab === 2 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-200/80 dark:border-gray-700">
                <tr className="w-full">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-cyan-600 cursor-pointer accent-cyan-600"
                      checked={currentDealData.length > 0 && currentDealData.every((d: any) => selectedDeals.has(d.id))}
                      onChange={() => toggleSelectAll(currentDealData.map((d: any) => d.id))}
                    />
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiBriefcase className="text-[13px] text-cyan-500"/> {t("deal_name")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiActivity className="text-[13px] text-indigo-400"/> {t("deal_stage")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiTag className="text-[13px] text-violet-500"/> {t("against")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-emerald-500"/> {t("created_date_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-amber-500"/> {t("close_date")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUserPlus className="text-[13px] text-slate-400"/> {t("created_by_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUser className="text-[13px] text-rose-400"/> Assigned To</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiSettings className="text-[13px] text-slate-400"/> {t("actions")}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      const isSelected = selectedDeals.has(item.id);
                      return (
                        <tr
                          key={item.deal_id}
                          className={`group border-b border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/30 w-full transition-colors duration-150 text-nowrap ${isSelected ? "bg-cyan-50/60 dark:bg-cyan-900/10" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-cyan-600"
                              checked={isSelected}
                              onChange={() => toggleSelectDeal(item.id)}
                            />
                          </td>
                          <td className="px-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                            <h4 className="capitalize font-semibold text-[13px] text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 transition-colors">{item.dealName}</h4>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize tracking-wide ${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                                  : item.dealPipeline.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST || item.dealStage.trim() === DEAL_STAGES.DELETE
                                  ? "bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {item.dealStage.trim().replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-copy hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                              title="Copy Lead ID"
                            >
                              {item?.lead_id?.lead_id ?? "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{date}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.closeDate ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400">{formatDate(item.closeDate)}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/users/${item.createdBy.id}`} className="text-[13px] text-slate-500 dark:text-slate-400 capitalize hover:text-cyan-600 transition-colors">
                              {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.assignedTo ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 capitalize">
                                {item.assignedTo.firstName + " " + item.assignedTo.lastName}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {hasPermission(PERMISSIONS.readDeal) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                                  title="View"
                                >
                                  <FaRegEye size={15} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegEye size={15} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateDeal) && item.status !== DEAL_STATUS.DELETE ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Edit"
                                >
                                  <MdOutlineEdit size={16} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <MdOutlineEdit size={16} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.createQuote) && item.status !== DEAL_STATUS.DELETE ? (
                                item.inQuotation ? (
                                  <span className="h-8 w-8 flex items-center justify-center rounded-lg text-orange-300 cursor-not-allowed" title="Already in Quotation">
                                    <FaRegPaperPlane size={14} />
                                  </span>
                                ) : (
                                  <Link
                                    href={`/deals/quotation/${item.id}`}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                    title="Create Quotation"
                                  >
                                    <FaRegPaperPlane size={14} />
                                  </Link>
                                )
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegPaperPlane size={14} />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={9}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                      const rr = i % 2 == 0;
                      return (
                        <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                          <td className="p-4"><Skeleton height={28} borderRadius={12} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                        </tr>
                      );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentTab === 3 && (
            <table className="w-full rounded-xl overflow-hidden">
              <thead className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-200/80 dark:border-gray-700">
                <tr className="w-full">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-cyan-600 cursor-pointer accent-cyan-600"
                      checked={currentDealData.length > 0 && currentDealData.every((d: any) => selectedDeals.has(d.id))}
                      onChange={() => toggleSelectAll(currentDealData.map((d: any) => d.id))}
                    />
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiBriefcase className="text-[13px] text-cyan-500"/> {t("deal_name")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiActivity className="text-[13px] text-indigo-400"/> {t("deal_stage")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiTag className="text-[13px] text-violet-500"/> {t("against")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-emerald-500"/> {t("created_date_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiCalendar className="text-[13px] text-amber-500"/> {t("close_date")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUserPlus className="text-[13px] text-slate-400"/> {t("created_by_2")}</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiUser className="text-[13px] text-rose-400"/> Assigned To</div>
                  </th>
                  <th className="px-4 py-3 uppercase text-[11px] font-semibold tracking-wider text-start text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><FiSettings className="text-[13px] text-slate-400"/> {t("actions")}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading ? (
                  currentDealData && Array.isArray(currentDealData) && currentDealData.length > 0 ? (
                    currentDealData.map((item, i) => {
                      const rr = i % 2 == 0;
                      const date = formatDate(item.createDate);
                      const isSelected = selectedDeals.has(item.id);
                      return (
                        <tr
                          key={item.deal_id}
                          className={`group border-b border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/30 w-full transition-colors duration-150 text-nowrap ${isSelected ? "bg-cyan-50/60 dark:bg-cyan-900/10" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-cyan-600"
                              checked={isSelected}
                              onChange={() => toggleSelectDeal(item.id)}
                            />
                          </td>
                          <td className="px-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                            <h4 className="capitalize font-semibold text-[13px] text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 transition-colors">{item.dealName}</h4>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize tracking-wide ${
                                item.dealStage.trim() === DEAL_STAGES.REQUIREMENT_ANALYSIS
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                  : item.dealStage.trim() === DEAL_STAGES.QUALIFICATION
                                  ? "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
                                  : item.dealStage.trim() === DEAL_STAGES.PROPOSAL
                                  ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                                  : item.dealPipeline.trim() === DEAL_STAGES.NEGOTIATION
                                  ? "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
                                  : item.dealStage.trim() === DEAL_STAGES.WON
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                  : item.dealStage.trim() === DEAL_STAGES.LOST || item.dealStage.trim() === DEAL_STAGES.DELETE
                                  ? "bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {item.dealStage.trim().replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-copy hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => handleCopy(item?.lead_id?.lead_id)}
                              title="Copy Lead ID"
                            >
                              {item?.lead_id?.lead_id ?? "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">{date}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.closeDate ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400">{formatDate(item.closeDate)}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/users/${item.createdBy.id}`} className="text-[13px] text-slate-500 dark:text-slate-400 capitalize hover:text-cyan-600 transition-colors">
                              {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.assignedTo ? (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 capitalize">
                                {item.assignedTo.firstName + " " + item.assignedTo.lastName}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {hasPermission(PERMISSIONS.readDeal) ? (
                                <Link
                                  href={`/deals/view/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                                  title="View"
                                >
                                  <FaRegEye size={15} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegEye size={15} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.updateDeal) && item.status !== DEAL_STATUS.DELETE ? (
                                <Link
                                  href={`/deals/update/${item.id}`}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Edit"
                                >
                                  <MdOutlineEdit size={16} />
                                </Link>
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <MdOutlineEdit size={16} />
                                </span>
                              )}
                              {hasPermission(PERMISSIONS.createQuote) && item.status !== DEAL_STATUS.DELETE ? (
                                item.inQuotation ? (
                                  <span className="h-8 w-8 flex items-center justify-center rounded-lg text-orange-300 cursor-not-allowed" title="Already in Quotation">
                                    <FaRegPaperPlane size={14} />
                                  </span>
                                ) : (
                                  <Link
                                    href={`/deals/quotation/${item.id}`}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                    title="Create Quotation"
                                  >
                                    <FaRegPaperPlane size={14} />
                                  </Link>
                                )
                              ) : (
                                <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                  <FaRegPaperPlane size={14} />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={9}>
                        {t("data_not_found")}
                      </td>
                    </tr>
                  )
                ) : (
                  Array.from({ length: 10 }).map((item, i) => {
                      const rr = i % 2 == 0;
                      return (
                        <tr key={i} className={`${rr ? "bg-white dark:bg-transparent" : "bg-slate-100/50 dark:bg-slate-800"} w-full`}>
                          <td className="p-4"><Skeleton height={28} borderRadius={12} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
                          <td className="p-4"><Skeleton height={30} borderRadius={14} /></td>
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
          </>
        )}
        
      </div>
    </div>
  );
};

export default DealContent;