"use client";

import { JSX, useState, useEffect, useRef } from "react";
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
import { MdOutlinePersonAdd } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { FaXmark, FaCheck, FaRegEye, FaRegHandshake, FaHandshake } from "react-icons/fa6";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";
import { toast } from "react-toastify";
import Link from "next/link";
import SensitiveField from "@/src/components/common/SensitiveField";
import { features } from "process";

const PAGE_LIMIT = 10;
const LeadContent = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Prospect[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchVal, setSearchVal] = useState<string>("");
  const [activeColumns, setActiveColumns] = useState<ActiveColumns>(DEF_ACTIVE["company"]);
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [infoType, setInfoType] = useState<string>("company");
  const [ALL_COLUMNS, setALL_COLUMNS] = useState<any[]>(ALL_COL["company"]);
  const [openFilter, setOpenFilter] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterValues>({ fullName: "" });
  const [filterQuery, setFilterQuery] = useState<FilterValues>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  // const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignableLeads, setAssignableLeads] = useState<Prospect[]>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef<boolean>(false); // prevent duplicate calls
  const pageRef = useRef<number>(1);      // always up-to-date page for observer cb
  const bottomRef = useRef<HTMLTableRowElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const isAllSelected = assignableLeads.length === selectedLeadIds.size;
  const isIndeterminate = selectedLeadIds.size > 0 && !isAllSelected;
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate; }, [isIndeterminate]);
  // useEffect(()=>{
  //   setIsAllSelected(assignableLeads.length == selectedLeadIds.size);
  // },[assignableLeads, selectedLeadIds])


  const { hasPermission } = usePermissions();

  // Keep pageRef in sync with state
  useEffect(() => { pageRef.current = currentPage; }, [currentPage]);

  // Close column picker on outside click
  useEffect(() => {
    function handleOutsideClick(e: globalThis.MouseEvent): void {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = async (page: number, currentFilters: FilterValues, reset = false) => {
    // Prevent duplicate in-flight requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (reset) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const result: any = await prospectService.getAll(page, PAGE_LIMIT, currentFilters);
      if (result.status === 200) {
        const data = result.data.data;
        const newLeads: Prospect[] = data;

        setLeadData((prev) => (reset ? newLeads : [...prev, ...newLeads]));
        setCurrentPage(page);
        debugger;
        setAssignableLeads((Prev) => (reset) ? [...newLeads.filter((item) => {
          return item.assignTo?.id ? false : item.id;
        })] : [...Prev, ...newLeads.filter((item) => {
          return item.assignTo?.id ? false : item.id;
        })]);

        // If we got fewer than PAGE_LIMIT rows, there's nothing more to fetch
        const totalPages = Number(data.totalPages);
        setHasMore(page < totalPages);
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
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(1, filters, true);
    getAssignableUsers();
  }, []);

  // Re-fetch from page 1 whenever filters change
  useEffect(() => {
    rowRefs.current.clear();
    setHasMore(true);
    fetchData(1, filters, true);
  }, [filters]);

  useEffect(() => {
    if (!bottomRef.current) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry.isIntersecting &&
          hasMore &&
          !isFetchingRef.current
        ) {
          fetchData(pageRef.current + 1, filters);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      }
    );

    observerRef.current.observe(bottomRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, filters, leadData.length]);

  // Re-attach observer whenever leadData or hasMore changes
  useEffect(() => {
    if (!hasMore) {
      if (observerRef.current) observerRef.current.disconnect();
      return;
    }
  }, [leadData, hasMore]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, []);
  useEffect(() => {
    fetchData(1, { ...filters, ...filterQuery }, true);
  }, [filterQuery]);
  useEffect(() => {
    setALL_COLUMNS(ALL_COL[infoType]);
    setActiveColumns(DEF_ACTIVE[infoType]);
  }, [infoType]);

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, fullName: val }));
    }, 300);
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const toggleColumn = (key: string): void => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setActiveColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const getValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  const visibleCols = ALL_COLUMNS.filter((c) => activeColumns[c.key]);
  const activeCount = Object.values(activeColumns).filter(Boolean).length;

  // ── Row ref callback ───────────────────────────────────────────────────────

  const setRowRef = (index: number) => (el: HTMLTableRowElement | null) => {
    if (el) {
      rowRefs.current.set(index, el);
    } else {
      rowRefs.current.delete(index);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
      ${status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        : status === "contacted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          : status === "qualified" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            : status === "proposal" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
              : status === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : status === "lost" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"}`}>
      {status}
    </span>
  );
  const RowActions = ({ item }: { item: Prospect }) => {

    return (
      <span className="flex items-center gap-2 p-4">
        {hasPermission(PERMISSIONS.readProspects) ? (
          <Link href={`/prospects/view/${item.id}`} className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 text-green-500 hover:scale-105 transition-transform">
            <FaRegEye className="text-lg" />
          </Link>
        ) : (
          <span className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed"><FaRegEye className="text-lg" /></span>
        )}
      </span>
    );
  }


  // assign leads
  const clearAssignSelection = () => { setSelectedLeadIds(new Set()); setSelectedUserId(""); };

  const getAssignableUsers = async () => {
    const result = await prospectService.getAllActiveWithoutPagination();
    if (result.status === 200) setAssignableUsers(result.data.data);
  }
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadIds(new Set());
      setSelectedUserId("");
    }
    else {
      const s = new Set(selectedLeadIds);
      leadData.forEach((item) => (!item.assignTo) && s.add(item.id));
      setSelectedLeadIds(s);
    }
  };
  const handleSelectOne = (id: string) => {
    const s = new Set(selectedLeadIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeadIds(s);
  };
  const handleAssignLeads = async (): Promise<void> => {
    if (!selectedUserId) { toast.warning("Please select a user to assign leads to"); return; }
    if (selectedLeadIds.size === 0) { toast.warning("Please select at least one lead"); return; }
    setIsAssigning(true);
    try {
      const result = await prospectService.assignBulkLead(selectedUserId, Array.from(selectedLeadIds));

      debugger;
      if (result.status === 200) {
        const message = result.data.message;
        toast.success(message);
        clearAssignSelection();
        await Promise.all([fetchData(1, filters, true)]);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    } finally { setIsAssigning(false); }

  };

  const Spinner = ({ color }: { color: string }) => (
    <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );



  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">

          {/* ── Header ── */}
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900">Prospect</h2>
            </div>

            <div className="flex items-center gap-6 flex-wrap">

              {/* Search */}
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input
                  type="text"
                  className="outline-none bg-transparent"
                  value={searchVal}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* ── Column Picker ── */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowColumnPicker((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-900/10 text-sm font-semibold transition-all duration-200 ${showColumnPicker
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 dark:bg-gray-600 text-slate-700 dark:text-white"
                    }`}
                >
                  <FiColumns className="text-base" />
                  Columns
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${showColumnPicker ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"}`}>
                    {activeCount}
                  </span>
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
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${col.required
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${activeColumns[col.key] ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-gray-500"}`}>
                          {activeColumns[col.key] && (
                            <span className="text-white text-[10px] leading-none">✓</span>
                          )}
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{col.label}</span>
                        {col.required && (
                          <span className="ml-auto text-[10px] bg-slate-100 dark:bg-gray-600 text-slate-400 rounded px-1.5 py-0.5">locked</span>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 px-3 pt-2 mt-1 border-t border-slate-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          const all = {} as ActiveColumns;
                          ALL_COLUMNS.forEach((c) => (all[c.key] = true));
                          setActiveColumns(all);
                        }}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveColumns(DEF_ACTIVE[infoType])}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors">
                ⬆
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors">
                ⬇
              </button>
              <div className="ml-auto flex ">
                <button
                  className="px-3 py-1 rounded-md flex items-center gap-2 text-sm  font-normal transition-colors border-2 ml-1"
                  onClick={() => setOpenFilter((prev) => !prev)}
                >
                  <LiaFilterSolid className="m-0" /> {openFilter ? "Hide Filters" : "Show Filters"}
                </button>
              </div>
              <div className="ml-auto flex ">

              </div>
            </div>
          </div>

          {selectedLeadIds.size > 0 && (
            <div className="w-full bg-blue-600 dark:bg-blue-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <HiOutlineUserGroup className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <button onClick={clearAssignSelection} className="text-blue-200 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors">
                  <FaXmark className="text-xs group-hover:rotate-90" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedUserId && <span className="text-blue-200 text-[11px] ml-1">← Select a user first</span>}
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg border-0 outline-none text-sm min-w-52 cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>— Select user to assign —</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName ?? ""}{u.userRole[0]?.name ? ` · ${u.userRole[0].name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignLeads}
                  disabled={!selectedUserId || isAssigning}
                  className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isAssigning ? <><Spinner color="text-blue-600" /> Assigning...</> : <><MdOutlinePersonAdd className="text-lg" /> Assign Leads</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Table ── */}
          <div className="w-full overflow-hidden rounded-xl">
            <div className="overflow-x-auto w-full">
              <table className="w-full  overflow-scroll overflow-x-scroll">
                <thead>
                  <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                    {hasPermission(PERMISSIONS.assignLead) && (
                      <th className="p-4 w-12 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input ref={selectAllRef} type="checkbox" className="sr-only" checked={isAllSelected} onChange={handleSelectAll} />
                          <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                                              ${isAllSelected || isIndeterminate ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-blue-400"}`}>
                            {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                            {isIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>
                        </label>
                      </th>
                    )}
                    {visibleCols.map((col) => (
                      <th
                        key={col.key}
                        className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Initial loading skeletons */}
                  {isLoading ? (
                    (
                      Array.from({ length: 5 }).map((_, i) => {
                        const rr = (leadData.length + i) % 2 === 0;

                        return (
                          <tr
                            key={`more-${i}`}
                            className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500 whitespace-nowrap"
                              } w-full`}
                          >
                            {hasPermission(PERMISSIONS.assignLead) && (
                              <td className="p-4">
                                <Skeleton width={30} height={24} borderRadius={10} />
                              </td>
                            )}

                            {Object.entries(activeColumns).map(([key, isActive]) =>
                              isActive ? (
                                <td key={key} className="p-4">
                                  <Skeleton width={120} height={24} borderRadius={10} />
                                </td>
                              ) : null
                            )}
                          </tr>
                        );
                      })
                    )
                  ) : leadData && Array.isArray(leadData) && leadData.length > 0 ? (
                    <>
                      {leadData.map((item, i) => {
                        const rr = i % 2 === 0;
                        const isChecked = selectedLeadIds.has(item.id);

                        return (
                          <tr
                            key={item.id}
                            ref={setRowRef(i)}
                            className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"
                              } w-full`}
                          >
                            {hasPermission(PERMISSIONS.assignLead) && (
                              <td className="p-4 text-center">
                                {(!item.assignTo?.id) ? (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleSelectOne(item.id)} />
                                    <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150
                                                ${isChecked ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"}`}>
                                      {isChecked && <FaCheck className="text-white text-[9px]" />}
                                    </div>
                                  </label>
                                ) : item.assignTo?.id ? (
                                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-100 dark:bg-green-900/30" title="Already assigned">
                                    <FaCheck className="text-green-500 text-[8px]" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-4.5 h-4.5" title="Self-created leads cannot be assigned">
                                    <span className="block w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                  </span>
                                )}
                              </td>
                            )}
                            {Object.entries(activeColumns).map(([key, isActive]) => {
                              if (!isActive) return null;

                              const value = getValue(item, key);

                              let content;

                              if (key === "status") {
                                content = <StatusBadge status={value ?? "-"} />;
                              }
                              else if (key === "technologies" && Array.isArray(value)) {
                                content = (
                                  <span className="capitalize text-sm whitespace-nowrap">
                                    {value.join(", ")}
                                  </span>
                                );
                              }
                              else if (key == "projectType") {
                                content = (
                                  <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">{value}</span>

                                );
                              }
                              else if (typeof value === "object" && value !== null) {
                                content = (
                                  <span className="capitalize text-sm whitespace-nowrap">
                                    {Object.values(value).join(", ")}
                                  </span>
                                );
                              }
                              else if (key == "email") {
                                content = (
                                  <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />

                                );
                              }
                              else if (key == "phone") {
                                content = (
                                  <SensitiveField value={value} link={`tel:${value}`} maskedValue={maskPhone(value)} fontSize="sm" />
                                );
                              }
                              else if (key == "actions") {
                                content = (
                                  <RowActions item={item} />
                                );
                              }
                              else {
                                content = (
                                  <span className="capitalize text-sm whitespace-nowrap">
                                    {value ?? "-"}
                                  </span>
                                );
                              }

                              return (
                                <td key={key} className="p-4">
                                  {content}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Inline fetch-more skeleton rows — shown while loading next chunk */}
                      {isFetchingMore &&
                        Array.from({ length: 5 }).map((_, i) => {
                          const rr = (leadData.length + i) % 2 === 0;

                          return (
                            <tr
                              key={`more-${i}`}
                              className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"
                                } w-full`}
                            >
                              {Object.entries(activeColumns).map(([key, isActive]) =>
                                isActive ? (
                                  <td key={key} className="p-4">
                                    <Skeleton />
                                  </td>
                                ) : null
                              )}
                            </tr>
                          );
                        })}

                      {/* End of list indicator */}
                    </>
                  ) : (
                    <tr>
                      <td className="p-4 text-center" colSpan={visibleCols.length}>
                        Data not found
                      </td>
                    </tr>
                  )}
                  <tr ref={bottomRef}>
                    <td colSpan={visibleCols.length}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {!hasMore && !isFetchingMore && (
              <p className="p-4 text-center text-xs text-slate-400" >
                — All leads loaded ({leadData.length} total) —
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {openFilter && (
          <>
            <FilterSideBar
              open={openFilter}
              onClose={() => setOpenFilter(false)}
              onFilterChange={(filters) => setFilterQuery(filters)}
              onInfoTypeChange={(infotype) => setInfoType(infotype)}
            />
          </>
        )
        }
      </div>
    </>
  );
};

export default LeadContent;
