"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CampaignService from "@/src/services/campaign.service";
import { CampaignStatus, ICampaign } from "@/src/types/campaign/campaign.types";
import Pagination from "@/src/components/common/pagination";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  Package, Users, Filter, Megaphone, Plus, Search, ArrowDownUp, List, Grid,
  MoreVertical, Mail, FileText, LayoutTemplate, Briefcase, Check, Pause, Play,
  Clock3, Flame, CalendarCheck, MessageCircle,
  RefreshCw, CalendarCheck2
} from "lucide-react";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import CreateCampaignModal from "./CreateCampaignModal";
import CampaignDetailView from "./CampaignDetailView";
import PipelineLeadTable, { PipelineLeadFilter } from "./PipelineLeadTable";

const PIE_COLORS: Record<string, string> = {
  not_reached: "#9ca3af",
  connected: "#3b82f6",
  not_connected: "#eab308",
  interested: "#10b981",
  meeting_scheduled: "#8b5cf6",
  not_interested: "#f43f5e",
  wrong_number: "#ef4444",
  call_back: "#f59e0b",
};

const PIE_LABELS: Record<string, string> = {
  not_reached: "Not Reached",
  connected: "Connected",
  not_connected: "Not Connected",
  interested: "Interested",
  meeting_scheduled: "Meeting Scheduled",
  not_interested: "Not Interested",
  wrong_number: "Wrong Number",
  call_back: "Call Back",
};

interface LeadStatusCount {
  status: string;
  label: string;
  count: number;
}

interface EngagementStatsResponse {
  stats: { status: string; count: number }[];
  pieBreakdown: {
    fresh: LeadStatusCount[];
    inProgress: LeadStatusCount[];
    lost: LeadStatusCount[];
  };
  totalLeads: number;
  totalInProgress: number;
  totalClosed: number;
  closedBreakdown: { won: number; lost: number };
  campaigns: { total: number; active: number; paused: number };
  highlights: Record<"interested" | "meetingsScheduled" | "meetingsCompleted" | "callBack" | "followUps", number>;
  funnel?: Partial<Record<"all" | "contacted" | "engaged" | "meetings" | "closed_won", number>>;
}

const getCampaignIconAndBg = (index: number) => {
  const styles = [
    { bg: 'bg-[#18A1C4]', icon: <Mail className="text-white" size={20} /> },
    { bg: 'bg-blue-500', icon: <FileText className="text-white" size={20} /> },
    { bg: 'bg-orange-500', icon: <LayoutTemplate className="text-white" size={20} /> },
    { bg: 'bg-green-500', icon: <Briefcase className="text-white" size={20} /> },
  ];
  return styles[index % styles.length];
};

const PipelineContent = () => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(null);
  const [selectedPipelineFilter, setSelectedPipelineFilter] = useState<{
    filter: PipelineLeadFilter;
    title: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [engagementStats, setEngagementStats] = useState<EngagementStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearchVal, setDebouncedSearchVal] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
      if (searchVal !== debouncedSearchVal) setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchVal, debouncedSearchVal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setSelectedCampaignIds([]); // Reset selection when fetching/paginating
    try {
      const filters: Record<string, string> = {};
      if (debouncedSearchVal) filters.search = debouncedSearchVal;
      if (statusFilter) filters.status = statusFilter;
      if (sortField) filters.sortField = sortField;
      if (sortOrder) filters.sortOrder = sortOrder;

      const res = await CampaignService.getAll(currentPage, pageLimit, filters);
      if (res.status === 200) {
        setCampaigns(res.data.data.data);
        setCurrentPage(Number(res.data.data.page));
        setPageLimit(Number(res.data.data.limit));
        setTotalPages(Number(res.data.data.totalPages));
      }
    } catch {
      toast.error(t("failed_to_fetch_campaigns") || "Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchVal, pageLimit, sortField, sortOrder, statusFilter, t]);

  const fetchEngagementStats = useCallback((signal?: AbortSignal) => {
    return CampaignService.getEngagementStats(signal).then(res => {
      if (signal?.aborted) return;
      setEngagementStats(res.data.data);
      setStatsError(false);
    }).catch(() => {
      if (!signal?.aborted) setStatsError(true);
    }).finally(() => {
      if (!signal?.aborted) setStatsLoading(false);
    });
  }, []);

  const refreshStats = () => {
    setStatsLoading(true);
    void fetchEngagementStats();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchCampaigns(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCampaigns]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchEngagementStats(controller.signal);
    return () => controller.abort();
  }, [fetchEngagementStats]);

  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Derive the "mode" from the first selected campaign's status
  // If mode === 'active'  → show Pause button, disable paused checkboxes
  // If mode === 'paused'  → show Resume button, disable active checkboxes
  const selectionMode: 'active' | 'paused' | null = (() => {
    if (selectedCampaignIds.length === 0) return null;
    const first = campaigns.find(c => selectedCampaignIds.includes(c.id || c._id!));
    if (!first) return null;
    return String(first.status) === 'paused' ? 'paused' : 'active';
  })();

  const handleBulkStatus = async (next: "paused" | "active") => {
    const targets = campaigns.filter((c) => selectedCampaignIds.includes(c.id || c._id!));
    const toUpdate = targets.filter((c) => String(c.status) !== next);
    if (toUpdate.length === 0) {
      toast.info(next === "paused" ? "Selected campaigns are already paused" : "Selected campaigns are already running");
      return;
    }
    setIsBulkUpdating(true);
    const results = await Promise.allSettled(
      toUpdate.map((c) => CampaignService.updateStatus(c.id || c._id!, { status: next as CampaignStatus }))
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (ok) toast.success(`${ok} campaign${ok !== 1 ? "s" : ""} ${next === "paused" ? "paused" : "resumed"}`);
    if (failed) toast.error(`${failed} campaign${failed !== 1 ? "s" : ""} failed to update`);
    setIsBulkUpdating(false);
    fetchCampaigns();
    refreshStats();
  };

  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        onBack={() => {
          setSelectedCampaign(null);
          refreshStats();
          void fetchCampaigns();
        }}
        onStatusChange={(newStatus) => {
          setSelectedCampaign((c) => (c ? { ...c, status: newStatus as CampaignStatus } : c));
          setCampaigns((list) =>
            list.map((c) =>
              (c.id || c._id) === (selectedCampaign.id || selectedCampaign._id)
                ? { ...c, status: newStatus as CampaignStatus }
                : c
            )
          );
        }}
      />
    );
  }

  if (selectedPipelineFilter) {
    return (
      <PipelineLeadTable
        filter={selectedPipelineFilter.filter}
        title={selectedPipelineFilter.title}
        onBack={() => setSelectedPipelineFilter(null)}
      />
    );
  }

  const totalLeads = engagementStats?.totalLeads ?? 0;
  const totalInProgress = engagementStats?.totalInProgress ?? 0;
  
  // Convert engagement stats to pie chart data
  const pieData = (engagementStats?.stats ?? []).map(({ status, count }) => ({
    name: PIE_LABELS[status] || status.replaceAll("_", " "),
    value: count,
    color: PIE_COLORS[status] || "#64748b"
  }));
  
  const hasStats = pieData.some(d => d.value > 0);
  const displayPieData = hasStats ? pieData.filter(d => d.value > 0) : [{ name: "No Data", value: 1, color: "#e5e7eb" }];

  const displayTotalLeads = totalLeads;

  const pipelineCards: {
    label: string;
    value: number;
    filter: PipelineLeadFilter;
    icon: React.ElementType;
    color: string;
  }[] = [
    { label: "Total Leads", value: displayTotalLeads, filter: "all", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/50" },
    { label: "In Progress", value: totalInProgress, filter: "in_progress", icon: Clock3, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50" },
    { label: "Meetings Scheduled", value: engagementStats?.highlights.meetingsScheduled ?? 0, filter: "meetings_scheduled", icon: CalendarCheck, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" },
    { label: "Meetings Done", value: engagementStats?.highlights.meetingsCompleted ?? 0, filter: "meetings_done", icon: CalendarCheck2, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 border-teal-100 dark:border-teal-900/50" },
    { label: "Follow-ups", value: engagementStats?.highlights.followUps ?? 0, filter: "follow_ups", icon: MessageCircle, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 border-violet-100 dark:border-violet-900/50" },
    { label: "Fresh Enquiry", value: engagementStats?.stats.find(s => s.status === "not_reached")?.count ?? 0, filter: "fresh_enquiry", icon: Flame, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 border-orange-100 dark:border-orange-900/50" },
  ];

  const renderKpiValue = (value: number | string) => statsLoading || statsError ? "—" : typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline overview</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All company campaigns · Unique leads · All time</p>
        </div>
        <button type="button" onClick={refreshStats} disabled={statsLoading} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <RefreshCw size={15} className={statsLoading ? "animate-spin" : ""} /> Refresh stats
        </button>
      </div>
      {statsError && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">Unable to load pipeline statistics. Please refresh to try again.</div>}

      {/* 1. TOP KPI CARDS (User preferences) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {pipelineCards.map(({ label, value, filter, icon: Icon, color }) => {
          const bgColors = color.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('dark:bg-') || c.startsWith('text-') || c.startsWith('dark:text-')).join(' ');
          const borderClass = color.split(' ').find(c => c.startsWith('border-')) || 'border-gray-100';
          const darkBorderClass = color.split(' ').find(c => c.startsWith('dark:border-')) || 'dark:border-gray-700';

          return (
            <button
              key={label}
              type="button"
              disabled={statsLoading || statsError}
              onClick={() => setSelectedPipelineFilter({ filter, title: label })}
              className={`bg-white dark:bg-gray-800 rounded-2xl border ${borderClass} ${darkBorderClass} p-5 shadow-sm flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label={`View ${label} leads`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${bgColors}`}>
                <Icon size={24} />
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">{renderKpiValue(value)}</div>
              <div className="mt-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
            </button>
          );
        })}
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 items-stretch">

        {/* COL 1 - Lead Engagement Status */}
        <div className="w-full min-w-0 xl:col-span-2">
          
          {/* Lead Engagement Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Megaphone size={18} className="text-gray-500" /> Lead Engagement Status
              </h3>
            </div>
            
            <div className="flex flex-col   gap-4">
              <div className="relative  h-36 shrink-0  w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsLoading || statsError ? [{ name: "Unavailable", value: 1, color: "#e5e7eb" }] : displayPieData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                        {(statsLoading || statsError ? [{ color: "#e5e7eb" }] : displayPieData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white leading-none">{renderKpiValue(displayTotalLeads)}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-wider">Total Leads</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                {pieData.map((item) => {
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium capitalize">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-800 dark:text-white">{renderKpiValue(item.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COL 2 - Sales Funnel */}
        <div className="w-full min-w-0 xl:col-span-2">
          {/* Sales Funnel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-5">
              <Filter size={18} className="text-[#18A1C4]" /> Sales Funnel
            </h3>
            
            {statsLoading ? (
               <div className="flex flex-col gap-2 animate-pulse items-center w-full">
                 <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                 <div className="h-10 w-[80%] bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                 <div className="h-10 w-[60%] bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                 <div className="h-10 w-[40%] bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
               </div>
            ) : (
              <div className="flex flex-col gap-[2px] items-center justify-center w-full pb-2">
                {(() => {
                  const totalLeads = engagementStats?.totalLeads ?? 0;
                  const contacted = engagementStats?.funnel?.contacted ?? totalLeads - (engagementStats?.stats.find(s => s.status === 'not_reached')?.count ?? 0) - (engagementStats?.stats.find(s => s.status === 'not_connected')?.count ?? 0);
                  const engagedFromHighlights = (engagementStats?.highlights.interested ?? 0) + (engagementStats?.highlights.followUps ?? 0) + (engagementStats?.highlights.callBack ?? 0) + (engagementStats?.highlights.meetingsScheduled ?? 0) + (engagementStats?.highlights.meetingsCompleted ?? 0);
                  const meetingsFromHighlights = (engagementStats?.highlights.meetingsScheduled ?? 0) + (engagementStats?.highlights.meetingsCompleted ?? 0);
                  const engagedRaw = engagementStats?.funnel?.engaged ?? engagedFromHighlights;
                  const meetingsRaw = engagementStats?.funnel?.meetings ?? meetingsFromHighlights;
                  const wonRaw = engagementStats?.funnel?.closed_won ?? engagementStats?.closedBreakdown.won ?? 0;

                  const funnelData = [
                    { name: 'Total Leads', value: totalLeads, filter: 'all' as PipelineLeadFilter, fill: 'from-[#18A1C4] to-cyan-400' },
                    { name: 'Contacted', value: contacted, filter: 'contacted' as PipelineLeadFilter, fill: 'from-blue-500 to-[#18A1C4]' },
                    { name: 'Engaged', value: engagedRaw, filter: 'engaged' as PipelineLeadFilter, fill: 'from-indigo-500 to-blue-500' },
                    { name: 'Meetings', value: meetingsRaw, filter: 'meetings' as PipelineLeadFilter, fill: 'from-purple-500 to-indigo-500' },
                    { name: 'Closed Won', value: wonRaw, filter: 'closed_won' as PipelineLeadFilter, fill: 'from-emerald-500 to-teal-400' }
                   ];

                  const maxValue = Math.max(funnelData[0]?.value || 1, 1);
                  const minWidth = 38; // Keep narrow stages readable while preserving the funnel shape.

                  return funnelData.map((step, idx) => {
                    const w_bottom = Math.max((step.value / maxValue) * 100, minWidth);
                    let w_top = 100;
                    if (idx > 0) {
                       w_top = Math.max((funnelData[idx - 1].value / maxValue) * 100, minWidth);
                     }

                    const pTopLeft = `${(100 - w_top) / 2}% 0%`;
                    const pTopRight = `${(100 + w_top) / 2}% 0%`;
                    const pBottomRight = `${(100 + w_bottom) / 2}% 100%`;
                     const pBottomLeft = `${(100 - w_bottom) / 2}% 100%`;

                     const clipPath = `polygon(${pTopLeft}, ${pTopRight}, ${pBottomRight}, ${pBottomLeft})`;
                    const count = String(renderKpiValue(step.value));
                    const textWidth = step.name.length * 8 + count.length * 10 + 20;
                    const textAreaWidth = Math.min((w_top + w_bottom) / 2, 100) * 0.9;

                    return (
                      <button
                        key={step.name}
                        type="button"
                        disabled={statsError}
                        onClick={() => setSelectedPipelineFilter({ filter: step.filter, title: step.name })}
                        className="group relative flex h-12 w-full items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`View ${step.name} leads`}
                        title={`${step.name}: ${count}`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${step.fill} transition-all duration-300 opacity-95 group-hover:opacity-100`}
                          style={{ clipPath }}
                        />
                        <svg
                          aria-hidden="true"
                          className="relative z-10 h-full pointer-events-none text-white"
                          style={{ width: `min(${textAreaWidth}%, ${textWidth}px)` }}
                          viewBox={`0 0 ${textWidth} 44`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <text x="50%" y="22" textAnchor="middle" dominantBaseline="central" fill="currentColor">
                            <tspan fontSize="13" fontWeight="700">{step.name}</tspan>
                            <tspan dx="12" fontSize="15" fontWeight="900" className="tabular-nums">{count}</tspan>
                          </text>
                        </svg>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

        {/* COL 3 - Pie Charts */}
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
              {[
                { title: "Fresh Inquiry", data: engagementStats?.pieBreakdown?.fresh ?? [] },
                { title: "IN-PROGRESS", data: engagementStats?.pieBreakdown?.inProgress ?? [] },
                { title: "LOST", data: engagementStats?.pieBreakdown?.lost ?? [] }
              ].map((chart, idx) => {
                const CHART_COLORS = ["#ef4444", "#06b6d4", "#fcd34d", "#ca8a04", "#4338ca", "#0f172a", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="h-[130px] w-full max-w-[150px] relative">
                      {statsLoading ? (
                        <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chart.data.length > 0 ? chart.data : [{ label: 'No Data', count: 1 }]}
                              innerRadius={38}
                              outerRadius={55}
                              paddingAngle={0}
                              dataKey="count"
                              stroke="none"
                            >
                              {chart.data.length > 0 ? chart.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              )) : (
                                <Cell fill="#e5e7eb" />
                              )}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      {!statsLoading && chart.data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">No Data</div>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mt-2 mb-2 uppercase text-xs tracking-wide">{chart.title}</h4>
                    <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 flex-1">
                      {statsLoading ? (
                        <div className="flex flex-col gap-1.5">{[1,2,3].map(i => <div key={i} className="h-3 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />)}</div>
                      ) : chart.data.length > 0 ? (
                        <ul className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-0.5">
                          {chart.data.map((item, i) => (
                            <li key={i} className="flex items-center text-[11px] text-gray-600 dark:text-gray-400">
                              <span className="w-2.5 h-2.5 rounded-sm mr-1.5 shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="truncate">{item.label}</span>
                              <span className="ml-1 shrink-0">({item.count})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">No data</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* FULL WIDTH - CAMPAIGNS TABLE */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">

          {/* Header & Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18A1C4]/10 dark:bg-[#18A1C4]/30 text-[#18A1C4] flex items-center justify-center">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Campaigns</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and track your active campaigns</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group z-20">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#18A1C4] hover:bg-[#158ca8] text-white flex items-center justify-center shadow-sm shadow-[#18A1C4]/30 transition-all focus:outline-none"
                  aria-label="Create Campaign"
                >
                  <Plus size={20} />
                </button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-lg">
                  Create Campaign
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-gray-800 dark:border-b-gray-700"></div>
                </div>
              </div>

              {selectedCampaignIds.length > 0 && (
                <div className="flex items-center gap-2 pl-3 pr-2 py-1 rounded-xl bg-[#18A1C4]/10 border border-[#18A1C4]/30">
                  <span className="text-xs font-bold text-[#18A1C4] whitespace-nowrap">
                    {selectedCampaignIds.length} selected
                  </span>
                  {selectionMode === 'active' && (
                    <button
                      onClick={() => handleBulkStatus("paused")}
                      disabled={isBulkUpdating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {selectionMode === 'paused' && (
                    <button
                      onClick={() => handleBulkStatus("active")}
                      disabled={isBulkUpdating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <Play size={13} /> Resume
                    </button>
                  )}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search campaigns..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#18A1C4]/30 w-full md:w-64 transition-shadow text-gray-800 dark:text-gray-200" 
                />
              </div>
              
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${isFilterOpen || statusFilter ? 'border-[#18A1C4] text-[#18A1C4] bg-[#18A1C4]/5 dark:bg-[#18A1C4]/10' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <Filter size={16} /> <span className="hidden sm:inline">Filter {statusFilter && <span className="ml-1 px-1.5 py-0.5 bg-[#18A1C4] text-white rounded-md text-[10px]">1</span>}</span>
                </button>
                
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-2 z-50">
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider">Status</div>
                    {["", "draft", "active", "paused", "completed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setCurrentPage(1);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${statusFilter === status ? 'bg-[#18A1C4]/10 text-[#18A1C4] font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <span className="capitalize">{status === "active" ? "Running" : (status || "All")}</span>
                        {statusFilter === status && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={sortRef}>
                <button 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${isSortOpen ? 'border-[#18A1C4] text-[#18A1C4] bg-[#18A1C4]/5 dark:bg-[#18A1C4]/10' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <ArrowDownUp size={16} /> <span className="hidden sm:inline">Sort</span>
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-2 z-50">
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider">Sort by</div>
                    {[
                      { field: "createdAt", label: "Date Created" },
                      { field: "name", label: "Campaign Name" }
                    ].map((opt) => (
                      <button
                        key={opt.field}
                        onClick={() => {
                          if (sortField === opt.field) {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField(opt.field);
                            setSortOrder("desc");
                          }
                          setCurrentPage(1);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${sortField === opt.field ? 'bg-[#18A1C4]/10 text-[#18A1C4] font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <span>{opt.label}</span>
                        {sortField === opt.field && (
                          <span className="text-[10px] bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded border border-[#18A1C4]/20 uppercase">
                            {sortOrder}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg shadow-sm transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-[#18A1C4] dark:text-[#18A1C4]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <List size={16}/>
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-[#18A1C4] dark:text-[#18A1C4] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <Grid size={16}/>
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                    <Skeleton circle width={40} height={40} />
                    <div className="flex-1">
                      <Skeleton width="30%" height={20} className="mb-2" />
                      <Skeleton width="20%" height={12} />
                    </div>
                  </div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Megaphone className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No campaigns found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4 text-center max-w-sm">
          You haven&apos;t created any campaigns yet. Click the &quot;Create Campaign&quot; button to get started.
                </p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-[#18A1C4] hover:bg-[#158ca8] text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-[#18A1C4]/30 flex items-center gap-2"
                >
                  <Plus size={16} /> Create Campaign
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {campaigns.map((camp, idx) => {
                  const style = getCampaignIconAndBg(idx);
                  return (
                    <div
                      key={camp.id || camp._id}
                      onClick={() => setSelectedCampaign(camp)}
                      className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/80 dark:border-gray-700 hover:border-[#18A1C4] dark:hover:border-[#18A1C4] transition-colors duration-200 cursor-pointer group flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center pr-2">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${style.bg}`}>
                              {style.icon}
                           </div>
                           <div>
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-[#18A1C4] dark:group-hover:text-[#18A1C4] transition-colors line-clamp-1" title={camp.name}>
                                {camp.name}
                              </h3>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 font-medium uppercase tracking-wider">
                                {camp.distributionMode.replace("_", " ")}
                              </div>
                           </div>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={camp.status} />
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Managers</span>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                            <Users size={14} className="text-gray-400" />
                            {camp.managers?.length || 0}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Agents</span>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                            <Users size={14} className="text-gray-400" />
                            {camp.agents?.length || 0}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Leads</span>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                            <Package size={14} className="text-gray-400" />
                            {camp.totalLeads || 0}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <span><CreatedAt timestamp={camp.createdAt} /></span>
                        <span className="text-gray-300 dark:text-gray-600 group-hover:text-[#18A1C4] dark:group-hover:text-[#18A1C4] transition-colors font-medium flex items-center gap-1">
                          View <span className="text-lg leading-none">&rarr;</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-12 border-b border-gray-100 dark:border-gray-700">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#18A1C4] focus:ring-[#18A1C4] cursor-pointer w-4 h-4"
                        checked={campaigns.length > 0 && selectedCampaignIds.length === campaigns.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCampaignIds(campaigns.map(c => c.id || c._id!));
                          else setSelectedCampaignIds([]);
                        }}
                        title="Select all"
                      />
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Campaign Name</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Mode</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Managers</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-center">Agents</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-center">Leads</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">Created Date</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {campaigns.map((camp, idx) => {
                    const style = getCampaignIconAndBg(idx);
                    const isSelected = selectedCampaignIds.includes(camp.id || camp._id!);
                    return (
                      <tr 
                        key={camp.id || camp._id} 
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group ${isSelected ? 'bg-[#18A1C4]/10 dark:bg-[#18A1C4]/20' : ''}`}
                      >
                        <td className="py-4 px-4 w-12">
                          {(() => {
                            const campStatus = String(camp.status) === 'paused' ? 'paused' : 'active';
                            const isDisabled = !isSelected && selectionMode !== null && campStatus !== selectionMode;
                            return (
                              <input 
                                type="checkbox" 
                                className={`rounded border-gray-300 text-[#18A1C4] focus:ring-[#18A1C4] w-4 h-4 ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                checked={isSelected}
                                disabled={isDisabled}
                                title={isDisabled ? (selectionMode === 'active' ? 'Deselect active campaigns first to select paused ones' : 'Deselect paused campaigns first to select active ones') : undefined}
                                onChange={(e) => {
                                  const id = camp.id || camp._id!;
                                  if (e.target.checked) setSelectedCampaignIds(p => [...p, id]);
                                  else setSelectedCampaignIds(p => p.filter(i => i !== id));
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${style.bg}`}>
                              {style.icon}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-gray-900 dark:text-white cursor-pointer group-hover:text-[#18A1C4] transition-colors" onClick={() => setSelectedCampaign(camp)}>
                                {camp.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 max-w-[150px] truncate">
                                {camp.description || "Campaign Outreach"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                            {camp.distributionMode.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden z-10">
                              <img src="https://i.pravatar.cc/150?u=1" alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 -ml-2 z-0">
                              +{camp.managers?.length || 0}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{camp.agents?.length || 0}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{camp.totalLeads || 0}</span>
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={camp.status} />
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-300"><CreatedAt timestamp={camp.createdAt} /></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setSelectedCampaign(camp)}
                              className="px-4 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                              View
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!isLoading && campaigns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>

      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchCampaigns();
            refreshStats();
          }}
        />
      )}
    </div>
  );
};

export default PipelineContent;
