"use client";

import { JSX, useState, useEffect, useRef, useCallback } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiColumns } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import prospectService from "@/src/services/prospect.service";
import FilterSideBar from "@/src/components/pages/prospect/FilterSideBar";
import { LiaFilterSolid } from "react-icons/lia";
import { ALL_COL, DEF_ACTIVE } from "@/src/components/pages/prospect/columns";
import { Prospect, ActiveColumns } from "@/src/types/prospect/prospect.type";
import { FilterValues } from "@/src/types/prospect/filterSideBar.types";
import { User } from "@/src/types/auth/auth.types";
import { MdOutlinePersonAdd, MdCall, MdSms, MdMailOutline, MdPhoneEnabled } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { FaXmark, FaCheck, FaRegEye } from "react-icons/fa6";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";
import { toast } from "react-toastify";
import Link from "next/link";
import SensitiveField from "@/src/components/common/SensitiveField";
import { useParams } from "next/navigation";
import { IoClose } from "react-icons/io5";
import BulkMailModal from "@/src/components/pages/prospect/BulkMailModal";
import BulkSmsModal from "@/src/components/pages/prospect/BulkSmsModal";
import DateFilterButton from "@/src/components/common/dateFilter";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import TagBadge from "@/src/components/common/tagBadge";
import { MdSwapHoriz } from "react-icons/md"; // For reassign icon
import ReassignModal from "@/src/components/pages/prospect/ReassignModal";
import  UserSelect from "@/src/components/common/userselect";
const PAGE_LIMIT = 10;

type CallStatus = "queued" | "in_progress" | "completed" | "failed";
type MergedFilters = FilterValues & DateFilter;

const BulkCallModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  // "idle" = not started yet, "running" = call all in progress, "done" = all done
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [statuses, setStatuses] = useState<Record<string, CallStatus>>(
    () => Object.fromEntries(leads.map((l) => [l.id, "queued"]))
  );
  const isCancelledRef = useRef(false);

  const completedCount = Object.values(statuses).filter((s) => s === "completed").length;
  const failedCount = Object.values(statuses).filter((s) => s === "failed").length;

  const setStatus = (id: string, status: CallStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: status }));

  const handleCallAll = async () => {
    isCancelledRef.current = false;
    setPhase("running");
    for (const lead of leads) {
      if (isCancelledRef.current) break;
      setStatus(lead.id, "in_progress");
      try {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          (window as any).__callTimer = timer;
        });
        if (!isCancelledRef.current) setStatus(lead.id, "completed");
      } catch {
        setStatus(lead.id, "failed");
      }
    }
    setPhase("done");
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    if ((window as any).__callTimer) clearTimeout((window as any).__callTimer);
    setStatuses((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => { if (next[id] === "in_progress") next[id] = "queued"; });
      return next;
    });
    setPhase("idle");
  };


  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <MdCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bulk Call</h3>
              <p className="text-xs text-blue-100">{leads.length} lead{leads.length > 1 ? "s" : ""} queued</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 shrink-0">
          <div className="bg-blue-500 h-1 transition-all duration-500" style={{ width: phase === "idle" ? "0%" : `${(completedCount / leads.length) * 100}%` }} />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 dark:border-gray-700 shrink-0 flex-wrap">
          {([
            { label: "Queued", count: Object.values(statuses).filter(s => s === "queued").length, color: "text-slate-500 dark:text-slate-400", dot: "bg-slate-300 dark:bg-slate-600" },
            { label: "In Progress", count: Object.values(statuses).filter(s => s === "in_progress").length, color: "text-blue-500", dot: "bg-blue-500 animate-pulse" },
            { label: "Completed", count: completedCount, color: "text-green-600", dot: "bg-green-500" },
            ...(failedCount > 0 ? [{ label: "Failed", count: failedCount, color: "text-red-500", dot: "bg-red-500" }] : []),
          ] as { label: string; count: number; color: string; dot: string }[]).map(({ label, count, color, dot }) => (
            <div key={label} className={`flex items-center gap-1.5 text-xs ${color}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span>{label}: <strong>{count}</strong></span>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
          {leads.map((lead, idx) => {
            const status = statuses[lead.id];
            const isActive = status === "in_progress";
            return (
              <div key={lead.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${isActive ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-sm" : status === "completed" ? "bg-green-50/60 dark:bg-green-900/10 border-green-100 dark:border-green-900" : status === "failed" ? "bg-red-50/60 dark:bg-red-900/10 border-red-100 dark:border-red-900" : "bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-700"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-blue-600 text-white" : status === "completed" ? "bg-green-500 text-white" : status === "failed" ? "bg-red-400 text-white" : "bg-slate-200 dark:bg-gray-600 text-slate-500 dark:text-slate-300"}`}>
                  {status === "completed" ? "✓" : status === "failed" ? "✕" : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold capitalize truncate ${isActive ? "text-blue-700 dark:text-blue-300" : status === "completed" ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-200"}`}>{lead.fullName}</p>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">{lead.phone}</p>
                </div>
                <StatusBadge status={status} />
                {isActive && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1 rounded-full bg-blue-500 animate-bounce" style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0">
          {phase === "idle" && (
            <>
              <p className="text-xs text-slate-400">Calls will be placed one by one automatically</p>
              <button onClick={handleCallAll} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition-colors">
                <MdCall className="w-4 h-4" /> Call All
              </button>
            </>
          )}
          {phase === "running" && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Calling {completedCount + 1} of {leads.length}...
              </div>
              <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-red-50 hover:text-red-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors">
                <IoClose className="w-4 h-4" /> Stop
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">{completedCount} completed{failedCount > 0 ? `, ${failedCount} failed` : ""}</p>
              <button onClick={onClose} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-md transition-colors">
                <FaCheck className="w-3.5 h-3.5" /> Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LeadContent = (): JSX.Element => {
  const params = useParams();
  const info = params?.infotype as string;

  // ── State ──────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Prospect[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchVal, setSearchVal] = useState<string>("");
  const [activeColumns, setActiveColumns] = useState<ActiveColumns>(DEF_ACTIVE[info]);
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [infoType, setInfoType] = useState<string>(info);
  const [ALL_COLUMNS, setALL_COLUMNS] = useState<any[]>(ALL_COL[info]);
  const [openFilter, setOpenFilter] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterValues>({ fullName: "" });
  const [filterQuery, setFilterQuery] = useState<FilterValues>({});
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignableLeads, setAssignableLeads] = useState<Prospect[]>([]);
  const [commSelectedIds, setCommSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCallModal, setShowBulkCallModal] = useState(false);
  const [showBulkMailModal, setShowBulkMailModal] = useState(false);
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false);
  const [singleActionLead, setSingleActionLead] = useState<Prospect | null>(null);
  const [singleActionType, setSingleActionType] = useState<"call" | "sms" | "mail" | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [singleReassignLead, setSingleReassignLead] = useState<Prospect | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const isFetchingRef = useRef<boolean>(false);
  const pageRef = useRef<number>(1);
  const hasMoreRef = useRef<boolean>(true);
  const filtersRef = useRef<MergedFilters>({ fullName: "", fromDate: "", toDate: "" });
  const bottomRef = useRef<HTMLTableRowElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const commSelectAllRef = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isAllSelected = assignableLeads.length > 0 && assignableLeads.length === selectedLeadIds.size;
  const isIndeterminate = selectedLeadIds.size > 0 && !isAllSelected;
  const isAllCommSelected = leadData.length > 0 && leadData.length === commSelectedIds.size;
  const isCommIndeterminate = commSelectedIds.size > 0 && !isAllCommSelected;
  const commSelectedLeads = leadData.filter((l) => commSelectedIds.has(l.id));
  const visibleCols = ALL_COLUMNS.filter((c) => activeColumns[c.key]);
  const activeCount = Object.values(activeColumns).filter(Boolean).length;

  const { hasPermission } = usePermissions();

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate; }, [isIndeterminate]);
  useEffect(() => { if (commSelectAllRef.current) commSelectAllRef.current.indeterminate = isCommIndeterminate; }, [isCommIndeterminate]);

  // ── Column picker outside click ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowColumnPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Column reset on infoType change ───────────────────────────────────────
  useEffect(() => {
    setALL_COLUMNS(ALL_COL[infoType]);
    setActiveColumns(DEF_ACTIVE[infoType]);
  }, [infoType]);

  // ── fetchData ─────────────────────────────────────────────────────────────
  // API response shape:
  // { success, status_code, message, data: Prospect[] }
  // No totalPages — we infer hasMore from whether a full page was returned
  const fetchData = useCallback(async (
    page: number,
    currentFilters: MergedFilters,
    reset = false
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (reset) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const result: any = await prospectService.getAll(page, PAGE_LIMIT, currentFilters);

      if (result.status === 200) {
        // API returns: { data: Prospect[] } — flat array, no pagination wrapper
        const newLeads: Prospect[] = result.data.data ?? [];

        // Since the API doesn't return totalPages, infer:
        // if we got a full page (PAGE_LIMIT items) → there might be more
        // if we got fewer → we've reached the end
        const newHasMore = newLeads.length >= PAGE_LIMIT;

        setLeadData((prev) => (reset ? newLeads : [...prev, ...newLeads]));
        setCurrentPage(page);
        setAssignableLeads((prev) =>
          reset
            ? newLeads.filter((item) => !item.assignTo?.id)
            : [...prev, ...newLeads.filter((item) => !item.assignTo?.id)]
        );

        // Update state AND ref synchronously so the observer
        // never reads a stale value before the next render
        setHasMore(newHasMore);
        hasMoreRef.current = newHasMore;
        pageRef.current = page;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const merged: MergedFilters = { ...filters, ...filterQuery, ...dateFilter };
    filtersRef.current = merged;
    fetchData(1, merged, true);
    getAssignableUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch on filter / dateFilter / filterQuery change ──────────────────
  useEffect(() => {
    const merged: MergedFilters = { ...filters, ...filterQuery, ...dateFilter };
    filtersRef.current = merged;
    fetchData(1, merged, true);
  }, [filters, filterQuery, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll observer ──────────────────────────────────────────────
  // Set up ONCE with empty deps.
  // All runtime values are read through refs → no stale closures.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&        // is there a next page?
          !isFetchingRef.current       // are we not already fetching?
        ) {
          fetchData(pageRef.current + 1, filtersRef.current);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    observerRef.current = observer;
    if (bottomRef.current) observer.observe(bottomRef.current);

    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, fullName: val }));
    }, 300);
  };

  const toggleColumn = (key: string) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setActiveColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getValue = (obj: any, path: string) => {
    if (path === "createdBy") {
      return (obj?.firstName + " " + obj?.lastName).trim();
    }
    else
      return path.split(".").reduce((acc, part) => acc?.[part], obj);
  }
  const clearAssignSelection = () => { setSelectedLeadIds(new Set()); setSelectedUserId(""); };

  const getAssignableUsers = async () => {
    const result = await prospectService.getAllActiveWithoutPagination();
    if (result.status === 200) setAssignableUsers(result.data.data);
  };

  const handleSelectAll = () => {
    if (isAllSelected) { setSelectedLeadIds(new Set()); setSelectedUserId(""); }
    else {
      const s = new Set(selectedLeadIds);
      leadData.forEach((item) => !item.assignTo && s.add(item.id));
      setSelectedLeadIds(s);
    }
  };

  const handleSelectOne = (id: string) => {
    const s = new Set(selectedLeadIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeadIds(s);
  };

  const toggleCommSelect = (id: string) => {
    setCommSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleSelectAllComm = () => {
    if (isAllCommSelected) setCommSelectedIds(new Set());
    else setCommSelectedIds(new Set(leadData.map((l) => l.id)));
  };

  const handleAssignEnquirys = async () => {
    if (!selectedUserId) { toast.warning("Please select a user to assign leads to"); return; }
    if (selectedLeadIds.size === 0) { toast.warning("Please select at least one lead"); return; }
    setIsAssigning(true);
    try {
      const result = await prospectService.assignBulkLead(selectedUserId, Array.from(selectedLeadIds));
      if (result.status === 200) {
        toast.success(result.data.message);
        clearAssignSelection();
        await fetchData(1, filtersRef.current, true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    } finally { setIsAssigning(false); }
  };

  // ── Sub-components ────────────────────────────────────────────────────────
  const RowActions = ({ item }: { item: Prospect }) => {
    const isCommChecked = commSelectedIds.has(item.id);
    return (
      <span className="flex items-center gap-1.5 p-2">
        {(hasPermission(PERMISSIONS.callProspects) || hasPermission(PERMISSIONS.smsProspects) || hasPermission(PERMISSIONS.emailProspects) || hasPermission(PERMISSIONS.assignEnquiry)) && <label className="relative inline-flex items-center cursor-pointer mr-1" title="Select for bulk communication">
          <input type="checkbox" className="sr-only" checked={isCommChecked} onChange={() => toggleCommSelect(item.id)} />
          <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isCommChecked ? "bg-slate-600 border-slate-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-slate-500"}`}>
            {isCommChecked && <FaCheck className="text-white text-[8px]" />}
          </div>
        </label>}

        {hasPermission(PERMISSIONS.readProspects) ? (
          <Link href={`/prospects/view/${item.id}`} className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-900/30 hover:bg-green-200 text-green-600 hover:scale-105 transition-transform" title="View">
            <FaRegEye className="text-sm" />
          </Link>
        ) : (
          <span className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed">
            <FaRegEye className="text-sm" />
          </span>
        )}

        {hasPermission(PERMISSIONS.callProspects) && (
          <button onClick={() => { setSingleActionLead(item); setSingleActionType("call"); }} className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-600 hover:scale-105 transition-transform" title="Call">
            <MdPhoneEnabled className="text-sm" />
          </button>
        )}
        {hasPermission(PERMISSIONS.smsProspects) && (
          <button onClick={() => { setSingleActionLead(item); setSingleActionType("sms"); }} className="h-8 w-8 flex items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 text-yellow-600 hover:scale-105 transition-transform" title="Send SMS">
            <MdSms className="text-sm" />
          </button>
        )}
        {hasPermission(PERMISSIONS.emailProspects) && (
          <button onClick={() => { setSingleActionLead(item); setSingleActionType("mail"); }} className="h-8 w-8 flex items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 text-emerald-600 hover:scale-105 transition-transform" title="Send Email">
            <MdMailOutline className="text-sm" />
          </button>
        )}
        {hasPermission(PERMISSIONS.assignEnquiry) && (
          <button
            onClick={() => setSingleReassignLead(item)}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 text-amber-600 hover:scale-105 transition-transform"
            title="Reassign Lead"
          >
            <MdSwapHoriz className="text-sm" />
          </button>
        )}
      </span>
    );
  };

  const Spinner = ({ color }: { color: string }) => (
    <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  const handleReassignLeads = async (userId: string, leadIds: string[]) => {
    try {
      const result = await prospectService.assignBulkReAssign(userId, leadIds);
      if (result.status === 200) {
        toast.success("Leads reassigned successfully!");
        setCommSelectedIds(new Set()); // Clear the selection after reassignment
        await fetchData(1, filtersRef.current, true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const m = extractErrorMessages(error);
        toast.error(`${m}`);
      } else {
        toast.error("Failed to reassign leads");
      }
    }
  };


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">

          {/* Header */}
          <div className="flex w-full items-center gap-12 justify-between">
            <h2 className="text-2xl font-bold dark:text-white text-slate-900">Prospect</h2>

            <div className="flex items-center gap-6 flex-wrap">
              {/* Search */}
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input
                  type="text"
                  className="outline-none bg-transparent"
                  value={searchVal}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name"
                />
              </div>

              {/* Column Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowColumnPicker((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-900/10 text-sm font-semibold transition-all duration-200 cursor-pointer ${showColumnPicker ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 dark:bg-gray-600 text-slate-700 dark:text-white"}`}
                >
                  <FiColumns className="text-base" />
                  Columns
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${showColumnPicker ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"}`}>{activeCount}</span>
                </button>

                {showColumnPicker && (
                  <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white dark:bg-gray-800 border border-slate-900/10 rounded-xl shadow-xl min-w-55 py-2 max-h-80 overflow-y-scroll">
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-gray-700 mb-1">
                      Select Columns
                    </p>
                    {ALL_COLUMNS.map((col) => (
                      <div
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${col.required ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700"}`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${activeColumns[col.key] ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-gray-500"}`}>
                          {activeColumns[col.key] && <span className="text-white text-[10px] leading-none">✓</span>}
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{col.label}</span>
                        {col.required && <span className="ml-auto text-[10px] bg-slate-100 dark:bg-gray-600 text-slate-400 rounded px-1.5 py-0.5">locked</span>}
                      </div>
                    ))}
                    <div className="flex gap-2 px-3 pt-2 mt-1 border-t border-slate-100 dark:border-gray-700">
                      <button
                        onClick={() => { const all = {} as ActiveColumns; ALL_COLUMNS.forEach((c) => (all[c.key] = true)); setActiveColumns(all); }}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >All</button>
                      <button
                        onClick={() => setActiveColumns(DEF_ACTIVE[infoType])}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >Reset</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export */}
              <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors">⬇</button>

              {/* Date Filter */}
              <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />

              {/* Sidebar toggle */}
              <button
                className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-normal transition-colors border-2"
                onClick={() => setOpenFilter((prev) => !prev)}
              >
                <LiaFilterSolid /> {openFilter ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
          </div>

          {/* Assign Bar */}
          {selectedLeadIds.size > 0 && (
            <div className="w-full bg-blue-600 dark:bg-blue-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <HiOutlineUserGroup className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected for assignment
                  </span>
                </div>
                <button onClick={clearAssignSelection} className="text-blue-200 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors">
                  <FaXmark className="text-xs group-hover:rotate-90" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedUserId && <span className="text-blue-200 text-[11px] ml-1">← Select a user first</span>}
                  {/* <UserSelect
                    users={assignableUsers}
                    selectedUserId={selectedUserId}
                    setSelectedUserId={setSelectedUserId}
                    placeholder="Search & select user..."
                    /> */}
                  <UserSelect
                    mode="single"
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="Search & select user..."
                  />

                </div>
                <button
                  onClick={handleAssignEnquirys}
                  disabled={!selectedUserId || isAssigning}
                  className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isAssigning
                    ? <><Spinner color="text-blue-600" /> Assigning...</>
                    : <><MdOutlinePersonAdd className="text-lg" /> Assign Leads</>}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-hidden rounded-xl">
            <div className="overflow-x-auto w-full">
              <table className="w-full">
                <thead>
                  <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                    {hasPermission(PERMISSIONS.assignEnquiry) && (
                      <th className="p-4 w-12 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input ref={selectAllRef} type="checkbox" className="sr-only" checked={isAllSelected} onChange={handleSelectAll} />
                          <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isAllSelected || isIndeterminate ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-blue-400"}`}>
                            {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                            {isIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>
                        </label>
                      </th>
                    )}
                    {visibleCols.map((col) => (
                      <th key={col.key} className={`p-4 uppercase text-xs text-slate-500 dark:text-slate-100 whitespace-nowrap ${col.key === "actions" ? "text-center" : "text-start"}`}>
                        {(hasPermission(PERMISSIONS.callProspects) || hasPermission(PERMISSIONS.smsProspects) || hasPermission(PERMISSIONS.emailProspects)) && col.key === "actions" ? (
                          <div className="flex items-center gap-4 px-2">
                            <label className="relative inline-flex items-center cursor-pointer" title="Select all for communication">
                              <input ref={commSelectAllRef} type="checkbox" className="sr-only" checked={isAllCommSelected} onChange={handleSelectAllComm} />
                              <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isAllCommSelected || isCommIndeterminate ? "bg-slate-600 border-slate-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-slate-500"}`}>
                                {isAllCommSelected && <FaCheck className="text-white text-[8px]" />}
                                {isCommIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                              </div>
                            </label>
                            <span>{col.label}</span>
                          </div>
                        ) : col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-${i}`} className={`${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}>
                        {hasPermission(PERMISSIONS.assignEnquiry) && <td className="p-4"><Skeleton borderRadius={10} /></td>}
                        {Object.entries(activeColumns).map(([key, isActive]) =>
                          isActive ? <td key={key} className="p-4"><Skeleton borderRadius={10} /></td> : null
                        )}
                      </tr>
                    ))
                  ) : leadData.length > 0 ? (
                    <>
                      {leadData.map((item, i) => {
                        const isChecked = selectedLeadIds.has(item.id);
                        return (
                          <tr key={item.id} className={`${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}>
                            {hasPermission(PERMISSIONS.assignEnquiry) && (
                              <td className="p-4 text-center">
                                {!item.assignTo?.id ? (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleSelectOne(item.id)} />
                                    <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isChecked ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"}`}>
                                      {isChecked && <FaCheck className="text-white text-[9px]" />}
                                    </div>
                                  </label>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-100 dark:bg-green-900/30" title="Already assigned">
                                    <FaCheck className="text-green-500 text-[8px]" />
                                  </span>
                                )}
                              </td>
                            )}
                            {Object.entries(activeColumns).map(([key, isActive]) => {
                              if (!isActive) return null;
                              const value = getValue(item, key);
                              let content;
                              if (key === "status") content = <StatusBadge status={value ?? "-"} />;
                              else if (key === "technologies" && Array.isArray(value)) content = <span className="capitalize text-sm whitespace-nowrap">{value.join(", ")}</span>;
                              else if (key === "projectType") content = <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">{value}</span>;
                              else if (typeof value === "object" && value !== null) content = <span className="capitalize text-sm whitespace-nowrap">{Object.values(value).join(" ").trim() || "-"}</span>;
                              else if (key === "email") content = <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />;
                              else if (key === "phone") content = <SensitiveField value={value} link={`tel:${value}`} maskedValue={maskPhone(value)} fontSize="sm" />;
                              else if (key === "actions") content = <RowActions item={item} />;
                              else if (key === "createdAt") content = <CreatedAt timestamp={value} />;
                              else if (key === "createdBy") content = <span className="capitalize text-sm whitespace-nowrap">{item.createdBy?.firstName + " " + item.createdBy?.lastName}</span>;
                              else if (key === "dataTag") content = <TagBadge tag={item.dataTag || "N/A"} />;
                              else if (key === "source") content = (
                                <span className={`bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-medium`}
                                >
                                  {item.source || "N/A"}
                                </span>
                              )
                              else content = <span className="capitalize text-sm whitespace-nowrap">{value ?? "-"}</span>;
                              return <td key={key} className="p-4 text-nowrap">{content}</td>;
                            })}
                          </tr>
                        );
                      })}

                      {/* Fetching-more skeletons */}
                      {isFetchingMore && Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`more-${i}`} className={`${(leadData.length + i) % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}>
                          {hasPermission(PERMISSIONS.assignEnquiry) && <td className="p-4"><Skeleton width={30} height={24} borderRadius={10} /></td>}
                          {Object.entries(activeColumns).map(([key, isActive]) =>
                            isActive ? <td key={key} className="p-4"><Skeleton borderRadius={10} /></td> : null
                          )}
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td className="p-4 text-center" colSpan={visibleCols.length + 1}>Data not found</td>
                    </tr>
                  )}

                  {/* Sentinel row — watched by IntersectionObserver */}
                  <tr ref={bottomRef}>
                    <td colSpan={visibleCols.length + 1} />
                  </tr>
                </tbody>
              </table>
            </div>

            {!hasMore && !isLoading && leadData.length > 0 && (
              <p className="p-4 text-center text-xs text-slate-400">
                — All leads loaded ({leadData.length} total) —
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter sidebar */}
      {openFilter && (
        <FilterSideBar
          open={openFilter}
          onClose={() => setOpenFilter(false)}
          onFilterChange={(f) => setFilterQuery(f)}
          onInfoTypeChange={(infotype) => setInfoType(infotype)}
          infoValue={info}
        />
      )}

      {/* Bulk modals */}
      {showBulkCallModal && <BulkCallModal leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData} onClose={() => setShowBulkCallModal(false)} />}
      {showBulkMailModal && <BulkMailModal leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData} onClose={() => setShowBulkMailModal(false)} />}
      {showBulkSmsModal && <BulkSmsModal leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData} onClose={() => setShowBulkSmsModal(false)} />}

      {/* Single lead modals */}
      {singleActionLead && singleActionType === "call" && <BulkCallModal leads={[singleActionLead]} onClose={() => { setSingleActionLead(null); setSingleActionType(null); }} />}
      {singleActionLead && singleActionType === "sms" && <BulkSmsModal leads={[singleActionLead]} onClose={() => { setSingleActionLead(null); setSingleActionType(null); }} />}
      {singleActionLead && singleActionType === "mail" && <BulkMailModal leads={[singleActionLead]} onClose={() => { setSingleActionLead(null); setSingleActionType(null); }} />}
      {showReassignModal && commSelectedLeads.length > 0 && (
        <ReassignModal
          leads={commSelectedLeads}
          assignableUsers={assignableUsers}
          onClose={() => setShowReassignModal(false)}
          onReassign={handleReassignLeads}
        />
      )}
      {singleReassignLead && (
        <ReassignModal
          leads={[singleReassignLead]}
          assignableUsers={assignableUsers}
          onClose={() => setSingleReassignLead(null)}
          onReassign={handleReassignLeads}
        />
      )}


      {/* Floating Communication Navbar */}
      <div className={`fixed bottom-0 left-72 right-0 z-40 transition-all duration-300 ease-in-out ${commSelectedIds.size > 0 ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="mx-6 mb-5">
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl shadow-2xl shadow-slate-300/50 dark:shadow-black/40 px-5 py-3.5 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <HiOutlineUserGroup className="text-indigo-600 dark:text-indigo-400 text-lg" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {commSelectedIds.size}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                  {commSelectedIds.size} lead{commSelectedIds.size > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">Ready to call, SMS, email, or reassign</p>
              </div>
              <div className="hidden sm:flex items-center -space-x-2 ml-1">
                {commSelectedLeads.slice(0, 5).map((lead, i) => (
                  <div key={lead.id} className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0" title={lead.fullName} style={{ zIndex: 5 - i }}>
                    {lead.fullName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                ))}
                {commSelectedIds.size > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-slate-500 dark:text-slate-300 text-[9px] font-bold shrink-0">
                    +{commSelectedIds.size - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-gray-600 shrink-0" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasPermission(PERMISSIONS.callProspects) && (
                <button onClick={() => setShowBulkCallModal(true)} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-700 hover:border-blue-600 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md">
                  <MdPhoneEnabled className="text-base group-hover:scale-110 transition-transform" /> <span>Call All</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.smsProspects) && (
                <button onClick={() => setShowBulkSmsModal(true)} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-200 dark:border-amber-700 hover:border-amber-500 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md">
                  <MdSms className="text-base group-hover:scale-110 transition-transform" /> <span>SMS All</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.emailProspects) && (
                <button onClick={() => setShowBulkMailModal(true)} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-200 dark:border-emerald-700 hover:border-emerald-600 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md">
                  <MdMailOutline className="text-base group-hover:scale-110 transition-transform" /> <span>Mail All</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.assignEnquiry) && (
                <button onClick={() => setShowReassignModal(true)} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-600 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-200 dark:border-amber-700 hover:border-amber-600 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md">
                  <MdSwapHoriz className="text-base group-hover:scale-110 transition-transform" /> <span>Reassign</span>
                </button>
              )}
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-gray-600 shrink-0" />

            {/* Clear */}
            <button
              onClick={() => setCommSelectedIds(new Set())}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
              title="Clear selection"
            >
              <IoClose className="text-base" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadContent;