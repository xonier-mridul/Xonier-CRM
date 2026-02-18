"use client";

import SideBar from "@/src/components/layouts/SideBar";
import Monitor from "@/src/components/pages/dashboard/Monitor";
import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { BsActivity } from "react-icons/bs";
import { HiOutlineArrowNarrowUp, HiOutlineArrowNarrowDown } from "react-icons/hi";
import { MdOutlineLeaderboard } from "react-icons/md";



const revenueData = [
  { month: "Aug", revenue: 32000, leads: 40, deals: 18 },
  { month: "Sep", revenue: 41000, leads: 55, deals: 24 },
  { month: "Oct", revenue: 38000, leads: 48, deals: 20 },
  { month: "Nov", revenue: 52000, leads: 70, deals: 31 },
  { month: "Dec", revenue: 47000, leads: 62, deals: 27 },
  { month: "Jan", revenue: 61000, leads: 83, deals: 38 },
  { month: "Feb", revenue: 58000, leads: 76, deals: 34 },
];

const leadSourceData = [
  { name: "Website", value: 38 },
  { name: "Referral", value: 24 },
  { name: "LinkedIn", value: 18 },
  { name: "Email", value: 12 },
  { name: "Other", value: 8 },
];

const dealPipelineData = [
  { stage: "New", count: 84 },
  { stage: "Contacted", count: 61 },
  { stage: "Qualified", count: 43 },
  { stage: "Proposal", count: 28 },
  { stage: "Won", count: 17 },
  { stage: "Lost", count: 9 },
];

const recentLeads = [
  { name: "Sushil Kumar",  company: "Infosys",   source: "Website",  status: "new",       priority: "high",   time: "2m ago"  },
  { name: "Priya Sharma",  company: "TCS",        source: "LinkedIn", status: "contacted", priority: "medium", time: "18m ago" },
  { name: "Rahul Mehta",   company: "Wipro",      source: "Referral", status: "qualified", priority: "high",   time: "1h ago"  },
  { name: "Anjali Singh",  company: "HCL Tech",   source: "Email",    status: "proposal",  priority: "low",    time: "3h ago"  },
  { name: "Vikram Nair",   company: "Cognizant",  source: "Website",  status: "new",       priority: "medium", time: "5h ago"  },
];

const topPerformers = [
  { name: "Arjun Verma",  deals: 14, revenue: 128000, avatar: "AV" },
  { name: "Neha Kapoor",  deals: 11, revenue: 104000, avatar: "NK" },
  { name: "Rohan Das",    deals: 9,  revenue: 87000,  avatar: "RD" },
  { name: "Meera Pillai", deals: 8,  revenue: 76000,  avatar: "MP" },
];

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    new:       "bg-blue-50   text-blue-600   dark:bg-blue-950   dark:text-blue-400",
    contacted: "bg-amber-50  text-amber-600  dark:bg-amber-950  dark:text-amber-400",
    qualified: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    proposal:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    won:       "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    lost:      "bg-rose-50   text-rose-600   dark:bg-rose-950   dark:text-rose-400",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? map.new}`}>
      {status}
    </span>
  );
};

const PriorityDot = ({ priority }: { priority: string }) => {
  const map: Record<string, string> = {
    high:   "bg-rose-500",
    medium: "bg-amber-400",
    low:    "bg-emerald-400",
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${map[priority] ?? "bg-slate-400"}`} />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="capitalize">{p.name}:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {p.name === "revenue" ? `$${p.value.toLocaleString()}` : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const page = () => {
  const [activeTab, setActiveTab] = useState<"revenue" | "leads">("revenue");

  return (
    <div className="mt-10 ml-72 flex flex-col gap-6 backdrop-blur-md p-6">

      {/* Existing Monitor cards */}
      <Monitor />

      {/* ── Row 1: Area Chart + Pie Chart ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Performance Area Chart */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Performance Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Aug 2025 – Feb 2026</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-gray-700 rounded-lg p-1">
              {(["revenue", "leads"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => activeTab === "revenue" ? `$${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              {activeTab === "revenue" ? (
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#gradRevenue)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
              ) : (
                <>
                  <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2.5}
                    fill="url(#gradLeads)" dot={false} activeDot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="deals" stroke="#6366f1" strokeWidth={2}
                    fill="url(#gradDeals)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources Donut */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-0.5">Lead Sources</h2>
          <p className="text-xs text-slate-400 mb-3">Distribution by channel</p>
          <ResponsiveContainer width="100%" height={165}>
            <PieChart>
              <Pie
                data={leadSourceData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                dataKey="value"
                strokeWidth={0}
                paddingAngle={3}
              >
                {leadSourceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`${v}%`, ""]}
                contentStyle={{
                  background: "white", border: "1px solid #f1f5f9",
                  borderRadius: "12px", fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {leadSourceData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Pipeline Bar + Recent Leads Table ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Deal Pipeline */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-0.5">Deal Pipeline</h2>
          <p className="text-xs text-slate-400 mb-4">Leads count by stage</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dealPipelineData} layout="vertical" margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={65} />
              <Tooltip
                contentStyle={{
                  background: "white", border: "1px solid #f1f5f9",
                  borderRadius: "12px", fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {dealPipelineData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${248 - i * 16}, 75%, ${58 + i * 4}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Leads */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Recent Leads</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest activity in your pipeline</p>
            </div>
            <button className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              View all →
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-700">
                {["Name", "Company", "Source", "Priority", "Status", "Time"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 dark:text-slate-500 pb-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
              {recentLeads.map((lead, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {lead.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {lead.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{lead.company}</td>
                  <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{lead.source}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <PriorityDot priority={lead.priority} />
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{lead.priority}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 text-xs text-slate-400 whitespace-nowrap">{lead.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 3: Top Performers ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">Top Performers</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sales team leaderboard this month</p>
          </div>
          <MdOutlineLeaderboard className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {topPerformers.map((p, i) => (
            <div
              key={p.name}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <div className="relative mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {p.avatar}
                </div>
                {i === 0 && <span className="absolute -top-1.5 -right-1.5 text-base">🥇</span>}
                {i === 1 && <span className="absolute -top-1.5 -right-1.5 text-base">🥈</span>}
                {i === 2 && <span className="absolute -top-1.5 -right-1.5 text-base">🥉</span>}
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{p.name}</p>
              <p className="text-xs text-slate-400 mb-2">{p.deals} deals closed</p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                ${p.revenue.toLocaleString()}
              </p>
              <div className="w-full mt-3 bg-slate-200 dark:bg-gray-600 rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${(p.revenue / topPerformers[0].revenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default page;
