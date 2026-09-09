"use client";
import { EnquiryData } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import React, { JSX, useState, useEffect, useRef } from "react";
import extractErrorMessages from "../../utils/error.utils";
import { toast } from "react-toastify";
import { EnquiryService } from "@/src/services/enquiry.service";
import { AuthService } from "@/src/services/auth.service";
import { IoIosSearch } from "react-icons/io";
import Link from "next/link";
import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FaPlus, FaCheck } from "react-icons/fa6";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { PERMISSIONS, SOURCE, SALES_STATUS, PROJECT_TYPES } from "@/src/constants/enum";
import Pagination from "@/src/components/common/pagination";
import { usePermissions } from "@/src/hooks/usePermissions";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { LiaMailBulkSolid } from "react-icons/lia";
import Skeleton from "react-loading-skeleton";
import StatusBadge from "@/src/components/common/Status";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import CreatedAt from "@/src/components/common/CreatedAt";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import { useAdvancedFilters } from "@/src/hooks/useAdvanceFilter";
import { BiFilterAlt } from "react-icons/bi";
import { IoMdClose } from "react-icons/io";
import { TbChartBar, TbTrendingUp } from "react-icons/tb";
import { HiOutlineLightBulb } from "react-icons/hi";
import {
  FiActivity, FiUser, FiCalendar, FiX, FiTag,
  FiTarget, FiUserPlus, FiSettings, FiUserCheck
} from "react-icons/fi";

const page = (): JSX.Element => {
  const { t } = useTranslation();
  const [enquiryData, setEnquiryData] = useState<EnquiryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchVal, setSearchVal] = useState<string>("");
  const [TosearchVal, setToSearchVal] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [userData, setUserData] = useState<any[]>([]);

  const {
    sourceFilter, setSourceFilter,
    salesPersonFilter, setSalesPersonFilter,
    reset: resetAdvancedFilters,
  } = useAdvancedFilters();

  // Multi-select + assign
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignDropdownOpen, setAssignDropdownOpen] = useState<boolean>(false);
  const [assignSearchVal, setAssignSearchVal] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const { hasPermission } = usePermissions();

  const clearAllFilters = () => {
    resetAdvancedFilters();
    setStatusFilter("");
    setProjectTypeFilter("");
    setAssigneeFilter("");
    setDateFilter({ fromDate: "", toDate: "" });
  };

  const getUserData = async () => {
    try {
      const result = await AuthService.getAllActiveWithoutPagination();
      if (result.status === 200) setUserData(result.data.data);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  const getEnquiryData = async () => {
    setIsLoading(true);
    try {
      const result = await EnquiryService.getAll({
        page: currentPage, limit: pageLimit,
        fullName: searchVal,
        fromDate: dateFilter.fromDate,
        toDate: dateFilter.toDate,
      });
      if (result.status === 200) {
        const data = result.data.data;
        setEnquiryData(data.data);
        setCurrentPage(data.page);
        setPageLimit(data.limit);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`);
      } else setErr(["Something went wrong"]);
    } finally { setIsLoading(false); }
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setToSearchVal(val), 500);
  };

  const handleDelete = async (id: string) => {
    try {
      const confirm = await ConfirmPopup({ title: "Are you sure", text: "Are you sure to delete this enquiry", btnTxt: "Yes, delete" });
      if (confirm) {
        const result = await EnquiryService.delete(id);
        if (result.status === 200) { toast.success("Enquiry deleted successfully"); await getEnquiryData(); }
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    }
  };

  // Close dropdown on outside click; clear search on close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node))
        setAssignDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => { if (!assignDropdownOpen) setAssignSearchVal(""); }, [assignDropdownOpen]);

  useEffect(() => { getEnquiryData(); }, [pageLimit, currentPage]);
  useEffect(() => { getUserData(); }, []);
  useEffect(() => { getEnquiryData(); }, [TosearchVal, dateFilter, sourceFilter]);

  // Client-side filters
  const filteredEnquiryData = React.useMemo(() => {
    if (!enquiryData || !Array.isArray(enquiryData)) return enquiryData;
    return (enquiryData as any[])
      .filter((i) => !salesPersonFilter || i.createdBy?.id === salesPersonFilter)
      .filter((i) => !statusFilter || i.status === statusFilter)
      .filter((i) => !projectTypeFilter || i.projectType === projectTypeFilter)
      .filter((i) => !assigneeFilter || i.assignTo?.id === assigneeFilter)
      .filter((i) => !sourceFilter || i.source === sourceFilter);
  }, [enquiryData, salesPersonFilter, statusFilter, projectTypeFilter, assigneeFilter, sourceFilter]);

  // KPIs
  const allEnquiries = Array.isArray(enquiryData) ? enquiryData : [];
  const totalEnquiries = allEnquiries.length;
  const newEnquiries = allEnquiries.filter((e: any) => e.status === SALES_STATUS.NEW).length;
  const qualifiedEnquiries = allEnquiries.filter((e: any) => e.status === SALES_STATUS.QUALIFIED).length;

  // Filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...(statusFilter ? [{ label: `Status: ${statusFilter.replace(/_/g, " ")}`, onRemove: () => setStatusFilter("") }] : []),
    ...(projectTypeFilter ? [{ label: `Type: ${projectTypeFilter.replace(/_/g, " ")}`, onRemove: () => setProjectTypeFilter("") }] : []),
    ...(assigneeFilter ? [{ label: `Assignee: ${userData.find((u: any) => (u.id || u._id) === assigneeFilter)?.firstName || "User"}`, onRemove: () => setAssigneeFilter("") }] : []),
    ...(sourceFilter ? [{ label: `Source: ${sourceFilter.replace(/_/g, " ")}`, onRemove: () => setSourceFilter("") }] : []),
    ...((dateFilter.fromDate || dateFilter.toDate) ? [{ label: `Date: ${dateFilter.fromDate || ""} → ${dateFilter.toDate || ""}`, onRemove: () => setDateFilter({ fromDate: "", toDate: "" }) }] : []),
  ];

  // Select helpers
  const allVisibleIds = Array.isArray(filteredEnquiryData) ? (filteredEnquiryData as any[]).map((i: any) => i.id) : [];
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;
  useEffect(() => { if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = isIndeterminate; }, [isIndeterminate]);

  const toggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allVisibleIds));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkAssign = async (userId: string) => {
    setAssignDropdownOpen(false);
    setIsAssigning(true);
    try {
      const result = await EnquiryService.bulkAssign(Array.from(selectedIds), userId);
      if (result.status === 200) {
        const { assignedCount } = result.data.data;
        toast.success(`${assignedCount} enquir${assignedCount === 1 ? "y" : "ies"} assigned successfully`);
        clearSelection();
        await getEnquiryData();
      }
    } catch (error) {
      const m = extractErrorMessages(error);
      toast.error(Array.isArray(m) ? m[0] : m || "Failed to assign enquiries");
    } finally { setIsAssigning(false); }
  };

  const COLS = [
    { key: "client_info", icon: <FiUser className="text-[13px] text-sky-500" />, label: t("client_info") },
    { key: "project_type", icon: <FiTag className="text-[13px] text-violet-500" />, label: t("project_type") },
    { key: "source", icon: <FiTarget className="text-[13px] text-rose-400" />, label: t("source") },
    { key: "status", icon: <FiActivity className="text-[13px] text-indigo-400" />, label: t("status") },
    { key: "created_at", icon: <FiCalendar className="text-[13px] text-teal-500" />, label: t("created_at") },
    { key: "created_by", icon: <FiUserPlus className="text-[13px] text-slate-400" />, label: t("created_by") },
    { key: "assigned_to", icon: <FiUserCheck className="text-[13px] text-cyan-500" />, label: "Assigned To" },
    { key: "actions", icon: <FiSettings className="text-[13px] text-slate-400" />, label: t("actions") },
  ];

  return (
    <div>
      {/* Bulk create banner */}
      <div className="bg-white mb-4 dark:bg-gray-700 dark:backdrop-blur-sm gap-5 p-6 rounded-xl border border-slate-900/10 w-full flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 capitalize">{t("add_bulk_enquiries")}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t("you_want_to_create_bulk_enquiries")}</p>
        </div>
        {hasPermission(PERMISSIONS.createEnquiry) && (
          <PrimaryButton text={t("create_bulk_enquiry")} link="/enquiry/bulk" icon={<LiaMailBulkSolid />} />
        )}
      </div>

      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border border-slate-900/10 w-full">
        {/* Header row */}
        <div className="flex items-center gap-10 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">{t("all_sales_enquiries")}</h2>
            <p className="text-gray-500 dark:text-gray-400">{t("create_edit_or_remove_enquiries")}</p>
          </div>
          <div className="block lg:hidden">
            <span className="w-10 h-10 cursor-pointer bg-slate-200 flex justify-center items-center rounded-xl">
              <BsThreeDotsVertical className="text-slate-400 text-xl" />
            </span>
          </div>
          <div className="items-center hidden lg:flex gap-6">
            <select
              className="bg-slate-50 outline-none text-slate-400 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 dark:text-white/70"
              onChange={(e) => setPageLimit(Number(e.target.value))}
            >
              {[10, 20, 30, 50].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <div className="bg-slate-50 text-slate-500 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
              <IoIosSearch className="text-xl text-slate-500" />
              <input type="text" className="outline-none dark:text-white/70 bg-transparent" placeholder={t("search_3")} onChange={(e) => handleSearch(e.target.value)} value={searchVal} />
            </div>
            {hasPermission(PERMISSIONS.createEnquiry) ? (
              <Link href="/enquiry/add" className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-md flex items-center gap-2 group">
                <FaPlus className="group-hover:rotate-90 transition-all duration-300" /> {t("create_new_enquiry")}
              </Link>
            ) : (
              <span className="bg-cyan-600 text-white px-5 py-2 rounded-md flex items-center gap-2 opacity-80 cursor-not-allowed">
                <FaPlus /> {t("create_new_enquiry")}
              </span>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 border border-cyan-100 dark:border-cyan-800/40 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center shrink-0"><TbChartBar className="text-cyan-600 dark:text-cyan-400" size={20} /></div>
            <div><p className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">All Enquiries</p><p className="text-lg font-bold text-slate-800 dark:text-white">{totalEnquiries}</p></div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0"><HiOutlineLightBulb className="text-amber-600 dark:text-amber-400" size={20} /></div>
            <div><p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">New Enquiries</p><p className="text-lg font-bold text-slate-800 dark:text-white">{newEnquiries}</p></div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0"><TbTrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} /></div>
            <div><p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Qualified</p><p className="text-lg font-bold text-slate-800 dark:text-white">{qualifiedEnquiries}</p></div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="w-full flex flex-col gap-3">
          <div className="w-full flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-700/50 rounded-xl border border-slate-200/80 dark:border-gray-600/50">

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"><FiActivity className="text-indigo-400" /> Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-50 dark:bg-gray-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-500 text-[13px] text-slate-600 dark:text-white/80 outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer min-w-[155px]">
                <option value="">All Statuses</option>
                {Object.values(SALES_STATUS).map((o) => <option key={o} value={o}>{o.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            {/* Project Type */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"><FiTag className="text-violet-500" /> Project Type</label>
              <select value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value)} className="bg-slate-50 dark:bg-gray-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-500 text-[13px] text-slate-600 dark:text-white/80 outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer min-w-[155px]">
                <option value="">All Types</option>
                {Object.values(PROJECT_TYPES).map((t) => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            {/* Assigned To filter */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"><FiUser className="text-amber-500" /> Assigned To</label>
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="bg-slate-50 dark:bg-gray-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-500 text-[13px] text-slate-600 dark:text-white/80 outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer min-w-[160px]">
                <option value="">All Users</option>
                {userData.map((u: any) => <option key={u.id || u._id} value={u.id || u._id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>

            {/* Source */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"><FiTarget className="text-rose-400" /> Source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-slate-50 dark:bg-gray-600 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-500 text-[13px] text-slate-600 dark:text-white/80 outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer min-w-[150px]">
                <option value="">All Sources</option>
                {Object.values(SOURCE).map((t) => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"><FiCalendar className="text-emerald-500" /> Date Range</label>
              <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
            </div>

            {/* Clear Filters */}
            {(statusFilter || projectTypeFilter || assigneeFilter || sourceFilter || dateFilter.fromDate || dateFilter.toDate) && (
              <button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-700 text-rose-500 dark:text-rose-400 text-[12px] font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors self-end">
                <FiX size={13} /> Clear Filters
              </button>
            )}

            {/* ── Bulk Assign Toolbar ── */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-cyan-50/50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 self-end ml-auto">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-cyan-700 dark:text-cyan-300">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] flex items-center justify-center font-bold">{selectedIds.size}</span>
                  selected
                </span>
                <div className="w-px h-5 bg-cyan-200 dark:bg-cyan-800" />
                <div className="relative" ref={assignDropdownRef}>
                  <button
                    onClick={() => setAssignDropdownOpen((v) => !v)}
                    disabled={isAssigning}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <FiUserCheck size={14} />
                    {isAssigning ? "Assigning..." : "Assign To"}
                    <svg className={`w-3.5 h-3.5 transition-transform ${assignDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {assignDropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="p-2 border-b border-slate-100 dark:border-gray-700">
                        <div className="relative">
                          <IoIosSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text" placeholder="Search users..." autoFocus
                            value={assignSearchVal} onChange={(e) => setAssignSearchVal(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg text-[13px] outline-none focus:border-cyan-500 transition-colors"
                          />
                        </div>
                      </div>
                      <ul className="max-h-52 overflow-y-auto">
                        {userData.filter(u => `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(assignSearchVal.toLowerCase())).length === 0 ? (
                          <li className="px-4 py-3 text-[13px] text-slate-400 text-center">No users found</li>
                        ) : (
                          userData.filter(u => `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(assignSearchVal.toLowerCase())).map((u: any) => (
                            <li key={u.id || u._id}>
                              <button onClick={() => handleBulkAssign(u.id || u._id)} className="w-full text-left px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-700 transition-colors flex items-center gap-2">
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
                <button onClick={clearSelection} className="flex items-center px-2 py-1.5 rounded-lg text-[12px] font-medium text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors" title="Clear selection">
                  <FiX size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50">
                  <BiFilterAlt size={11} />{chip.label}
                  <button onClick={chip.onRemove} className="hover:text-red-500 transition-colors ml-0.5"><IoMdClose size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="w-full rounded-xl overflow-x-auto">
          <table className="w-full rounded-xl text-nowrap">
            <thead>
              <tr className="w-full border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
                <th className="px-4 py-3 w-12">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input ref={headerCheckboxRef} type="checkbox" className="sr-only" checked={isAllSelected} onChange={toggleAll} />
                    <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all ${isAllSelected || isIndeterminate ? "bg-cyan-600 border-cyan-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-cyan-400"}`}>
                      {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                      {isIndeterminate && !isAllSelected && <span className="block w-2 h-0.5 bg-white rounded-full" />}
                    </div>
                  </label>
                </th>
                {COLS.map((col) => (
                  <th key={col.key} className="px-4 py-3 uppercase text-[11px] text-start text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                    <div className="flex items-center gap-1.5">{col.icon} {col.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                filteredEnquiryData && Array.isArray(filteredEnquiryData) && filteredEnquiryData.length > 0 ? (
                  (filteredEnquiryData as any[]).map((item) => {
                    const isChecked = selectedIds.has(item.id);
                    const assignedUser = item.assignTo;
                    return (
                      <tr
                        key={item.enquiry_id}
                        className={`${isChecked ? "bg-slate-50 dark:bg-slate-900/20 border-l-[3px] border-l-cyan-500" : "border-b border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/30"} w-full transition-colors duration-150`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleOne(item.id)} />
                            <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all ${isChecked ? "bg-cyan-600 border-cyan-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-cyan-400"}`}>
                              {isChecked && <FaCheck className="text-white text-[9px]" />}
                            </div>
                          </label>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 capitalize">{item.fullName}</p>
                          <Link href={`mailto:${item.email}`} className="text-[13px] text-slate-400 dark:text-slate-500 hover:text-cyan-600 transition-colors">{item.email}</Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize">
                            {(item.projectType || "N/A").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[13px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 capitalize">
                            {(item.source || "N/A").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3.5"><CreatedAt timestamp={item.createdAt} /></td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-slate-500 dark:text-slate-400 capitalize">
                            {item.createdBy?.firstName + " " + item.createdBy?.lastName}
                          </span>
                        </td>
                        {/* Assigned To column */}
                        <td className="px-4 py-3.5">
                          {assignedUser?.firstName ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/40 capitalize">
                              <span className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                                {(assignedUser.firstName?.[0] || "").toUpperCase()}{(assignedUser.lastName?.[0] || "").toUpperCase()}
                              </span>
                              {assignedUser.firstName} {assignedUser.lastName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {hasPermission(PERMISSIONS.readEnquiry) ? (
                              <Link href={`/enquiry/view/${item.id}`} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors" title="View">
                                <FaRegEye size={15} />
                              </Link>
                            ) : <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"><FaRegEye size={15} /></span>}
                            {hasPermission(PERMISSIONS.updateEnquiry) ? (
                              <Link href={`/enquiry/update/${item.id}`} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                                <MdOutlineEdit size={16} />
                              </Link>
                            ) : <span className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"><MdOutlineEdit size={16} /></span>}
                            {hasPermission(PERMISSIONS.deleteEnquiry) ? (
                              <button onClick={() => handleDelete(item.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                                <MdDeleteOutline size={16} />
                              </button>
                            ) : <button disabled className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 cursor-not-allowed"><MdDeleteOutline size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td className="p-4 text-center text-slate-500 dark:text-white/70" colSpan={9}>{t("data_not_found")}</td></tr>
                )
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-gray-700/60">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5"><Skeleton height={28} borderRadius={8} /></td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
      </div>
    </div>
  );
};

export default page;