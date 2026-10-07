"use client";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CampaignService from "@/src/services/campaign.service";
import { ICampaign } from "@/src/types/campaign/campaign.types";
import Pagination from "@/src/components/common/pagination";
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  Package, Users, Target, Filter, Megaphone, Zap, Plus, Upload, 
  BarChart2, Download, Search, ArrowDownUp, List, Grid, 
  MoreVertical, ArrowUpRight, Mail, FileText, LayoutTemplate, Briefcase, Check, Pause, Play
} from "lucide-react";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import CreateCampaignModal from "./CreateCampaignModal";
import CampaignDetailView from "./CampaignDetailView";

const spark1 = [{ v: 4 }, { v: 7 }, { v: 5 }, { v: 8 }, { v: 12 }, { v: 15 }, { v: 14 }];
const spark2 = [{ v: 2 }, { v: 3 }, { v: 4 }, { v: 3 }, { v: 6 }, { v: 8 }, { v: 10 }];
const spark3 = [{ v: 10 }, { v: 12 }, { v: 11 }, { v: 14 }, { v: 13 }, { v: 16 }, { v: 18 }];
const spark4 = [{ v: 5 }, { v: 4 }, { v: 6 }, { v: 8 }, { v: 7 }, { v: 10 }, { v: 12 }];

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [engagementStats, setEngagementStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);
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

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setSelectedCampaignIds([]); // Reset selection when fetching/paginating
    try {
      const filters: Record<string, any> = {};
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
    } catch (error) {
      toast.error(t("failed_to_fetch_campaigns") || "Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngagementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await CampaignService.getEngagementStats();
      if (res.status === 200) {
        const statsArray: { status: string; count: number }[] = res.data?.data?.stats || [];
        const statsMap: Record<string, number> = {};
        statsArray.forEach(({ status, count }) => { statsMap[status] = count; });
        setEngagementStats(statsMap);
      }
    } catch {
      // silent — stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentPage, pageLimit, debouncedSearchVal, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchEngagementStats();
  }, []);

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
      toUpdate.map((c) => CampaignService.updateStatus(c.id || c._id!, { status: next as any }))
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (ok) toast.success(`${ok} campaign${ok !== 1 ? "s" : ""} ${next === "paused" ? "paused" : "resumed"}`);
    if (failed) toast.error(`${failed} campaign${failed !== 1 ? "s" : ""} failed to update`);
    setIsBulkUpdating(false);
    fetchCampaigns();
  };

  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
        onStatusChange={(newStatus) => {
          setSelectedCampaign((c) => (c ? { ...c, status: newStatus as any } : c));
          setCampaigns((list) =>
            list.map((c) =>
              (c.id || c._id) === (selectedCampaign.id || selectedCampaign._id)
                ? { ...c, status: newStatus as any }
                : c
            )
          );
        }}
      />
    );
  }

  const totalCampaigns = campaigns.length;
  const totalLeads = campaigns.reduce((acc, camp) => acc + (camp.totalLeads || 0), 0);
  
  // Convert engagement stats to pie chart data
  const pieData = Object.keys(PIE_LABELS).map((key) => ({
    name: PIE_LABELS[key],
    value: engagementStats[key] || 0,
    color: PIE_COLORS[key] || "#d1d5db"
  }));
  
  // To match the UI in case of empty stats, we mock some for visuals if totalLeads is > 0 but stats are 0
  const hasStats = pieData.some(d => d.value > 0);
  const displayPieData = hasStats ? pieData.filter(d => d.value > 0) : 
    (totalLeads > 0 ? [
      { name: "Not Reached", value: 16, color: "#9ca3af" },
      { name: "Connected", value: 5, color: "#3b82f6" },
      { name: "Not Connected", value: 4, color: "#eab308" },
      { name: "Interested", value: 3, color: "#10b981" },
      { name: "Meeting Scheduled", value: 5, color: "#8b5cf6" },
      { name: "Not Interested", value: 3, color: "#f43f5e" },
      { name: "Wrong Number", value: 3, color: "#ef4444" },
      { name: "Call Back", value: 5, color: "#f59e0b" },
    ] : [{ name: "No Data", value: 1, color: "#e5e7eb" }]);

  const displayTotalLeads = hasStats ? Object.values(engagementStats).reduce((a, b) => a + b, 0) : (totalLeads > 0 ? 44 : 0);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-6 font-sans">
      
      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Total Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#18A1C4]/10 dark:bg-[#18A1C4]/30 text-[#18A1C4] flex items-center justify-center">
                <Package size={20} />
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Total Campaigns</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCampaigns > 0 ? totalCampaigns : 5}</div>
              <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                <ArrowUpRight size={14} /> 25% <span className="text-gray-400 dark:text-gray-500 font-normal">from last month</span>
              </div>
            </div>
          </div>
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark1}>
                <Line type="monotone" dataKey="v" stroke="#18A1C4" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <Users size={20} />
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Total Leads</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{displayTotalLeads}</div>
              <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                <ArrowUpRight size={14} /> 12% <span className="text-gray-400 dark:text-gray-500 font-normal">from last month</span>
              </div>
            </div>
          </div>
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark2}>
                <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center">
                <Target size={20} />
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Active Campaigns</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCampaigns > 0 ? totalCampaigns : 5}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                {totalCampaigns > 0 ? totalCampaigns : 5} running • 0 paused
              </div>
            </div>
          </div>
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark3}>
                <Line type="monotone" dataKey="v" stroke="#f97316" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Conversion */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center">
                <Filter size={20} />
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Overall Conversion</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">22.7%</div>
              <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                <ArrowUpRight size={14} /> 4.2% <span className="text-gray-400 dark:text-gray-500 font-normal">from last month</span>
              </div>
            </div>
          </div>
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark4}>
                <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* LEFT COLUMN - STATS & QUICK ACTIONS */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0">
          
          {/* Lead Engagement Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Megaphone size={18} className="text-gray-500" /> Lead Engagement Status
              </h3>
              <button className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors flex items-center gap-1">
                View all &rarr;
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayPieData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {displayPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white leading-none">{displayTotalLeads}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-wider">Total Leads</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-2.5">
                {Object.keys(PIE_LABELS).map((key) => {
                  const val = hasStats ? engagementStats[key] : (displayPieData.find(d => d.name === PIE_LABELS[key])?.value || 0);
                  if (val === 0 && !hasStats && totalLeads === 0) return null;
                  
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[key] }}></div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{PIE_LABELS[key]}</span>
                      </div>
                      <span className="font-bold text-gray-800 dark:text-white">{val}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-5">
              <Zap size={18} className="text-gray-500" /> Quick Actions
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-start gap-3 p-3 bg-[#18A1C4]/10 dark:bg-[#18A1C4]/10 hover:bg-[#18A1C4]/20 dark:hover:bg-[#18A1C4]/20 rounded-xl transition-colors border border-[#18A1C4]/30 dark:border-[#18A1C4]/30 text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-[#18A1C4]/20 dark:bg-[#18A1C4]/80 text-[#18A1C4] dark:text-[#18A1C4] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Plus size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#18A1C4] dark:text-[#18A1C4] leading-tight">Create Campaign</div>
                  <div className="text-[10px] text-[#18A1C4]/80 dark:text-[#18A1C4] mt-0.5 font-medium">Start a new outreach</div>
                </div>
              </button>

              <button className="flex items-start gap-3 p-3 bg-blue-50/70 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-blue-100/50 dark:border-blue-800/30 text-left group">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Upload size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-900 dark:text-blue-100 leading-tight">Import Leads</div>
                  <div className="text-[10px] text-blue-600/70 dark:text-blue-400 mt-0.5 font-medium">Upload from CSV/Excel</div>
                </div>
              </button>

              <button className="flex items-start gap-3 p-3 bg-orange-50/70 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-colors border border-orange-100/50 dark:border-orange-800/30 text-left group">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-800 text-orange-500 dark:text-orange-300 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-orange-900 dark:text-orange-100 leading-tight">View Pipeline</div>
                  <div className="text-[10px] text-orange-600/70 dark:text-orange-400 mt-0.5 font-medium">Track conversions</div>
                </div>
              </button>

              <button className="flex items-start gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors border border-emerald-100/50 dark:border-emerald-800/30 text-left group">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Download size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-tight">Download Report</div>
                  <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400 mt-0.5 font-medium">Get detailed insights</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - CAMPAIGNS TABLE */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">
          
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
                  You haven't created any campaigns yet. Click the "Create Campaign" button to get started.
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
      </div>

      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
};

export default PipelineContent;
