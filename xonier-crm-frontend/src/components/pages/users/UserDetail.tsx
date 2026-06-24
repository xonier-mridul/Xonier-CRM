"use client";

import React, { JSX, useState, useMemo } from "react";
import { USER_STATUS } from "@/src/types";
import { User } from "@/src/types";
import { Activity, ActivitySummary } from "@/src/types/action/action.types";
import Image from "next/image";
import ComponentLoader from "../../common/ComponentLoader";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  MdOutlineEdit,
  MdEmail,
  MdPhone,
  MdBusiness,
  MdVerified,
  MdOutlineContentCopy,
} from "react-icons/md";
import {
  IoPersonCircle,
  IoShieldCheckmark,
  IoTimeOutline,
  IoCheckmarkDoneCircle,
  IoTrendingUp,
  IoBarChart,
  IoEyeOutline,
} from "react-icons/io5";
import {
  FiActivity,
  FiCalendar,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";
import {
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
} from "react-icons/hi2";
import { RiLoginCircleLine } from "react-icons/ri";
import { BsCircleFill } from "react-icons/bs";
import { GoDotFill } from "react-icons/go";
import { LuCalendarRange } from "react-icons/lu";
import PrimaryButton from "../../ui/PrimeryButton";
import { ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE } from "@/src/constants/enum";
import Link from "next/link";
import ActivityDetailPopup from "./UserActivityPopup";
import { Company } from "@/src/types/company/company.types";

export interface DateRangeFilter {
  from: string; // "2026-01-01"
  to: string; // "2026-02-17"
}

export interface SummaryFilter {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

export interface ExtendedUserDetailProps {
  userData: User | null;
  isLoading: boolean;
  activityData?: Activity[];
  activityLoading?: boolean;
  activitySummary?: ActivitySummary | null;
  summaryLoading?: boolean;
  summaryFilter?: SummaryFilter;
  currentPage?: number;
  totalPages?: number;
  pageLimit?: number;
  dateRange?: DateRangeFilter | null;
  onPageChange?: (page: number) => void;
  onDateFilter?: (range: DateRangeFilter | null) => void;
  onSummaryFilter?: (filter: SummaryFilter) => void;
  companyData?: Company | null;
  companyLoading: boolean;
}

const ENTITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: JSX.Element }
> = {
  [ACTIVITY_ENTITY_TYPE.LEAD]: {
    label: "Lead",
    color: "#6366f1",
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
    icon: <HiOutlineUserGroup className="w-4 h-4" />,
  },
  [ACTIVITY_ENTITY_TYPE.DEAL]: {
    label: "Deal",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    icon: <HiOutlineBriefcase className="w-4 h-4" />,
  },
  [ACTIVITY_ENTITY_TYPE.QUOTATION]: {
    label: "Quotation",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    icon: <HiOutlineDocumentText className="w-4 h-4" />,
  },
  [ACTIVITY_ENTITY_TYPE.INVOICE]: {
    label: "Invoice",
    color: "#3b82f6",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
  },
};

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  [ACTIVITY_ACTION.CREATED]: {
    label: "Created",
    color: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  [ACTIVITY_ACTION.UPDATED]: {
    label: "Updated",
    color: "text-blue-600",
    dot: "bg-blue-500",
  },
  [ACTIVITY_ACTION.SENT]: {
    label: "Sent",
    color: "text-violet-600",
    dot: "bg-violet-500",
  },
  [ACTIVITY_ACTION.RESEND]: {
    label: "Resent",
    color: "text-purple-600",
    dot: "bg-purple-500",
  },
  [ACTIVITY_ACTION.CONVERTED]: {
    label: "Converted",
    color: "text-teal-600",
    dot: "bg-teal-500",
  },
  [ACTIVITY_ACTION.CLOSED_WON]: {
    label: "Closed Won",
    color: "text-green-600",
    dot: "bg-green-500",
  },
  [ACTIVITY_ACTION.CLOSED_LOST]: {
    label: "Closed Lost",
    color: "text-rose-600",
    dot: "bg-rose-500",
  },
  [ACTIVITY_ACTION.DELETE]: {
    label: "Deleted",
    color: "text-red-600",
    dot: "bg-red-500",
  },
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6"];
const BAR_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
];

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const PRESETS = [
  {
    label: "Today",
    range: () => {
      const t = new Date();
      return { from: toIso(t), to: toIso(t) };
    },
  },
  {
    label: "Last 7 days",
    range: () => {
      const t = new Date(),
        f = new Date(t);
      f.setDate(t.getDate() - 6);
      return { from: toIso(f), to: toIso(t) };
    },
  },
  {
    label: "This month",
    range: () => {
      const t = new Date();
      return {
        from: toIso(new Date(t.getFullYear(), t.getMonth(), 1)),
        to: toIso(t),
      };
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const t = new Date(),
        f = new Date(t);
      f.setDate(t.getDate() - 29);
      return { from: toIso(f), to: toIso(t) };
    },
  },
  {
    label: "Last 3 months",
    range: () => {
      const t = new Date(),
        f = new Date(t);
      f.setMonth(t.getMonth() - 3);
      return { from: toIso(f), to: toIso(t) };
    },
  },
];

const formatDate = (date?: Date | string | null) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
};

const displayDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

interface TooltipPayloadItem {
  color?: string;
  value?: number | string;
  name?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 shadow-2xl">
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: p.color ?? "#fff" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color ?? "#fff" }}
          />
          {p.value}
          <span className="text-gray-400 font-normal text-xs">{p.name}</span>
        </p>
      ))}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  icon,
  accent,
  link,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: JSX.Element;
  accent: string;
  link: string;
}) => (
  <Link
    href={link}
    className="relative overflow-hidden hover:scale-105 hover:shadow-sm border-gray-200 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 flex items-start gap-4"
  >
    <div
      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg ${accent}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
    <div
      className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07] ${accent}`}
    />
  </Link>
);

const ActivityRow = ({ activity }: { activity: Activity }) => {
  const entity = ENTITY_CONFIG[activity.entityType] ?? {
    label: activity.entityType,
    color: "#94a3b8",
    bg: "bg-slate-50 dark:bg-slate-800",
    icon: <FiActivity className="w-4 h-4" />,
  };
  const action = ACTION_CONFIG[activity.action] ?? {
    label: activity.action,
    color: "text-gray-500",
    dot: "bg-gray-400",
  };
  const metaEntries = Object.entries(activity.metadata ?? {}).filter(
    ([k]) => !["leadId", "quoteId"].includes(k),
  );

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  return (
    <>
      <ActivityDetailPopup
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full mt-1.5 ring-2 ring-white dark:ring-gray-800 ${action.dot} shrink-0`}
          />
          <div className="w-px flex-1 bg-gray-100 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-5 flex-1 min-w-0">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 p-4 hover:shadow-[0_0_8px_12px_#00000012] transition-shadow duration-200"
            onClick={() => setSelectedActivity(activity)}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${entity.bg}`}
                  style={{ color: entity.color }}
                >
                  {entity.icon}
                  {entity.label}
                </span>
                <span
                  className={`text-xs font-semibold capitalize ${action.color}`}
                >
                  {action.label}
                </span>
              </div>
              <time className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                <IoTimeOutline className="w-3 h-3" />
                {formatDate(activity.createdAt)}
              </time>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">
              {activity.title}
            </p>
            {metaEntries.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {metaEntries.map(([key, val]) => (
                  <span
                    key={key}
                    className="text-xs bg-slate-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md font-mono"
                  >
                    <span className="text-gray-400">{key}: </span>
                    {typeof val === "object" ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {JSON.stringify(val)}
                      </span>
                    ) : (
                      String(val)
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const DateFilterPanel = ({
  value,
  onApply,
  onClear,
}: {
  value: DateRangeFilter | null;
  onApply: (r: DateRangeFilter) => void;
  onClear: () => void;
}) => {
  const [from, setFrom] = useState(value?.from ?? "");
  const [to, setTo] = useState(value?.to ?? "");
  const [err, setErr] = useState("");

  const apply = () => {
    if (!from || !to) {
      setErr("Both dates are required.");
      return;
    }
    if (from > to) {
      setErr('"From" must be before "To".');
      return;
    }
    setErr("");
    onApply({ from, to });
  };

  const pickPreset = (range: DateRangeFilter) => {
    setFrom(range.from);
    setTo(range.to);
    setErr("");
    onApply(range);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl shadow-2xl p-5 w-80">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Quick ranges
      </p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {PRESETS.map((p) => {
          const r = p.range();
          const active = value?.from === r.from && value?.to === r.to;
          return (
            <button
              key={p.label}
              onClick={() => pickPreset(r)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "border-slate-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-slate-100 dark:bg-gray-700 mb-4" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Custom range
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            From date
          </label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setErr("");
            }}
            className="w-full text-sm rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            To date
          </label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setErr("");
            }}
            className="w-full text-sm rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>
      </div>

      {err && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <FiX className="w-3 h-3" />
          {err}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={apply}
          className="flex-1 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          Apply filter
        </button>
        {value && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setErr("");
              onClear();
            }}
            className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400 border border-slate-200 dark:border-gray-600 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

const UserDetail = ({
  userData,
  isLoading,
  activityData = [],
  activityLoading = false,
  activitySummary = null,
  summaryLoading = false,
  summaryFilter = {},
  currentPage = 1,
  totalPages = 1,
  pageLimit = 20,
  dateRange = null,
  onPageChange,
  onDateFilter,
  onSummaryFilter,
  companyData = null,
  companyLoading = false,
}: ExtendedUserDetailProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "activity" | "summary" | "roles" | "company"
  >("overview");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [showSummaryDatePanel, setShowSummaryDatePanel] = useState(false);

  const { entityPieData, actionBarData, dailyAreaData, entityCounts } =
    useMemo(() => {
      if (!activityData.length)
        return {
          entityPieData: [],
          actionBarData: [],
          dailyAreaData: [],
          entityCounts: {},
        };

      const em: Record<string, number> = {};
      const am: Record<string, number> = {};
      const dm: Record<string, number> = {};

      activityData.forEach((a) => {
        em[a.entityType] = (em[a.entityType] || 0) + 1;
        am[a.action] = (am[a.action] || 0) + 1;
        const d = formatShortDate(a.createdAt);
        dm[d] = (dm[d] || 0) + 1;
      });

      return {
        entityPieData: Object.entries(em).map(([name, value]) => ({
          name: ENTITY_CONFIG[name]?.label ?? name,
          value,
        })),
        actionBarData: Object.entries(am).map(([name, count]) => ({
          name: ACTION_CONFIG[name]?.label ?? name,
          count,
        })),
        dailyAreaData: Object.entries(dm).map(([date, count]) => ({
          date,
          count,
        })),
        entityCounts: em,
      };
    }, [activityData]);

  const filteredActivities = useMemo(
    () =>
      activityData.filter((a) => {
        if (entityFilter !== "all" && a.entityType !== entityFilter)
          return false;
        if (actionFilter !== "all" && a.action !== actionFilter) return false;
        return true;
      }),
    [activityData, entityFilter, actionFilter],
  );

  const hasClientFilters = entityFilter !== "all" || actionFilter !== "all";

  if (isLoading) return <ComponentLoader />;

  if (!userData)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-slate-100 dark:border-gray-700">
        <IoPersonCircle className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-500">User not found</p>
      </div>
    );

  const statusConfig = (
    {
      [USER_STATUS.ACTIVE]: {
        bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
        dot: "text-emerald-500",
      },
      [USER_STATUS.INACTIVE]: {
        bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
        dot: "text-amber-500",
      },
      [USER_STATUS.SUSPENDED]: {
        bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
        dot: "text-orange-500",
      },
      [USER_STATUS.DELETED]: {
        bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
        dot: "text-red-500",
      },
    } as Record<string, { bg: string; dot: string }>
  )[userData.status] ?? {
    bg: "bg-gray-100 text-gray-700",
    dot: "text-gray-400",
  };

  const totalActivities = activityData.length;
  const uniqueEntities = Object.keys(entityCounts).length;

  const tabs = [
    {
      key: "overview" as const,
      label: "Overview",
      icon: <IoPersonCircle className="w-4 h-4" />,
    },
    {
      key: "activity" as const,
      label: "Activity",
      icon: <FiActivity className="w-4 h-4" />,
      badge: totalActivities,
    },
    {
      key: "summary" as const,
      label: "Summary",
      icon: <IoBarChart className="w-4 h-4" />,
    },
    {
      key: "roles" as const,
      label: "Roles",
      icon: <IoShieldCheckmark className="w-4 h-4" />,
      badge: userData.userRole?.length,
    },
    {
      key: "company" as const,
      label: "Company",
      icon: <MdBusiness className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="h-28 bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 50%, #059669 100%)",
            }}
          />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4 flex-wrap gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-800 overflow-hidden bg-slate-100 shadow-xl">
                <Image
                  src="/images/dummy-user.png"
                  width={80}
                  height={80}
                  alt="User"
                  className="object-cover"
                />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${userData.status ? "bg-emerald-500" : "bg-gray-400"}`}
              />
            </div>
            <div className="pb-1">
              <PrimaryButton
                text="Edit Profile"
                isLoading={isLoading}
                disabled={isLoading}
                link={`/users/update/${userData.id ?? userData._id}`}
                icon={<MdOutlineEdit className="text-base" />}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight capitalize">
                {userData.firstName} {userData.lastName}
              </h1>
              {userData.isEmailVerified && (
                <MdVerified
                  className="w-5 h-5 text-blue-500 shrink-0"
                  title="Email Verified"
                />
              )}
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${statusConfig.bg}`}
              >
                <GoDotFill className={statusConfig.dot} />
                {userData.status}
              </span>
              {userData.rating != null
                ? (() => {
                    const rating = userData.rating ?? 0;

                    const colorConfig =
                      rating >= 4.5
                        ? {
                            badge:
                              "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                            // glow: "shadow-emerald-200 dark:shadow-emerald-900/50",
                            star: "#10b981",
                            label: "Excellent",
                            pulse: "bg-emerald-400",
                          }
                        : rating >= 3.5
                          ? {
                              badge:
                                "bg-blue-50 text-green-600 border-green-200 dark:bg-green-800/30 dark:text-green-400 dark:border-green-700",
                              // glow: "shadow-green-200 dark:shadow-green-900/50",
                              star: "#39e118",
                              label: "Good",
                              pulse: "bg-green-400",
                            }
                          : rating >= 2.5
                            ? {
                                badge:
                                  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
                                // glow: "shadow-amber-200 dark:shadow-amber-900/50",
                                star: "#f59e0b",
                                label: "Average",
                                pulse: "bg-amber-400",
                              }
                            : rating >= 1.5
                              ? {
                                  badge:
                                    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
                                  // glow: "shadow-orange-200 dark:shadow-orange-900/50",
                                  star: "#f97316",
                                  label: "Poor",
                                  pulse: "bg-orange-400",
                                }
                              : {
                                  badge:
                                    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
                                  // glow: "shadow-red-200 dark:shadow-red-900/50",
                                  star: "#ef4444",
                                  label: "Very Poor",
                                  pulse: "bg-red-400",
                                };

                    return (
                      <Link
                        href={`/users/rating/${userData._id}`}
                        className={`
          inline-flex items-center gap-2 text-xs font-bold
          px-3 py-1.5 rounded-full border cursor-pointer
         
          transition-all duration-200 hover:scale-105 
          cursor-default select-none
          ${colorConfig.badge}
        `}
                      >
                        {/* Animated pulse dot */}
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${colorConfig.pulse}`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${colorConfig.pulse}`}
                          />
                        </span>

                        {/* Fractional stars */}
                        <span className="flex items-center gap-[2px]">
                          {[1, 2, 3, 4, 5].map((star) => {
                            // how much of this star is filled: 0 → 1
                            const fill = Math.min(
                              1,
                              Math.max(0, rating - (star - 1)),
                            );
                            const fillPct = Math.round(fill * 100);
                            const uid = `star-${star}-${Math.round(rating * 10)}`;

                            return (
                              <svg
                                key={star}
                                viewBox="0 0 20 20"
                                className="w-3.5 h-3.5 shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <defs>
                                  <linearGradient
                                    id={uid}
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%"
                                  >
                                    {/* filled portion */}
                                    <stop
                                      offset={`${fillPct}%`}
                                      stopColor={colorConfig.star}
                                      stopOpacity="1"
                                    />
                                    {/* empty portion */}
                                    <stop
                                      offset={`${fillPct}%`}
                                      stopColor={colorConfig.star}
                                      stopOpacity="0.2"
                                    />
                                  </linearGradient>
                                </defs>
                                <path
                                  fill={`url(#${uid})`}
                                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                />
                              </svg>
                            );
                          })}
                        </span>

                        {/* Numeric value */}
                        <span className="tabular-nums font-extrabold tracking-tight">
                          {rating.toFixed(1)}
                        </span>

                        {/* Divider */}
                        <span className="opacity-30 font-normal">|</span>

                        {/* Label */}
                        <span className="font-semibold opacity-80 tracking-wide">
                          {colorConfig.label}
                        </span>
                      </Link>
                    );
                  })()
                : null}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <button
                onClick={() => handleCopy(userData.email)}
                className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors group"
              >
                <MdEmail className="w-4 h-4" />
                {userData.email}
                <MdOutlineContentCopy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <Link
                href={`tel:${userData.phone}`}
                className="flex items-center cursor-pointer hover:text-blue-600 gap-1.5"
              >
                <MdPhone className="w-4 h-4" />
                {userData.phone}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Activities"
          value={totalActivities}
          sub={`${uniqueEntities} entity types`}
          icon={<FiActivity />}
          accent="bg-indigo-500"
          link={`/leads?userid=${userData._id}`}
        />
        <StatCard
          label="Last Login"
          link={``}
          value={
            userData.lastLogin
              ? new Date(userData.lastLogin).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
          sub={
            userData.lastLogin
              ? new Date(userData.lastLogin).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "Never"
          }
          icon={<RiLoginCircleLine />}
          accent="bg-blue-500"
        />
        <StatCard
          link={`/roles`}
          label="Assigned Roles"
          value={userData.userRole?.length ?? 0}
          sub="access roles"
          icon={<IoShieldCheckmark />}
          accent="bg-violet-500"
        />
        <StatCard
          label="Member Since"
          link={``}
          value={new Date(userData.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
          sub={new Date(userData.createdAt).getFullYear().toString()}
          icon={<IoCheckmarkDoneCircle />}
          accent="bg-emerald-500"
        />
      </div>

      <div className="bg-white  dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="border-b border-slate-100 dark:border-gray-700 px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-4 cursor-pointer text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Basic Information
              </h3>
              <div className="space-y-4">
                {[
                  { label: "First Name", value: userData.firstName },
                  { label: "Last Name", value: userData.lastName || "—" },
                  { label: "Email", value: userData.email },
                  { label: "Phone", value: userData.phone },
                  {
                    label: "Email Verified",
                    value: userData.isEmailVerified
                      ? "Verified ✓"
                      : "Not Verified",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 dark:border-gray-700/50"
                  >
                    <span className="text-sm text-gray-400 min-w-28">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Account Information
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Status", value: userData.status },
                  { label: "Active", value: userData.isActive ? "Yes" : "No" },
                  {
                    label: "Created At",
                    value: formatDate(userData.createdAt),
                  },
                  {
                    label: "Last Login",
                    value: userData.lastLogin
                      ? formatDate(userData.lastLogin)
                      : "Never",
                  },
                  {
                    label: "Updated At",
                    value: formatDate(userData.updatedAt),
                  },
                  {
                    label: "User ID",
                    value: userData.id ?? userData._id ?? "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 dark:border-gray-700/50"
                  >
                    <span className="text-sm text-gray-400 min-w-28">
                      {label}
                    </span>
                    <span
                      className={`text-sm font-medium text-right max-w-48 break-all ${label === "User ID" ? "font-mono text-xs text-gray-400" : "text-gray-800 dark:text-gray-200"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {userData.createdBy && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Created By
                </h3>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm">
                    {userData.createdBy.firstName?.[0]}
                    {userData.createdBy.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {userData.createdBy.firstName}{" "}
                      {userData.createdBy.lastName}
                    </p>
                    {/* <p className="text-xs text-gray-500">
                      {userData.createdBy.email}
                    </p> */}
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {formatDate(userData.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="p-6 space-y-6">
            {activityLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading activity…</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePanel((v) => !v)}
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all ${
                        dateRange
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      }`}
                    >
                      <LuCalendarRange className="w-4 h-4" />
                      {dateRange
                        ? `${displayDate(dateRange.from)} – ${displayDate(dateRange.to)}`
                        : "Date Range"}
                      {dateRange && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateFilter?.(null);
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.stopPropagation(), onDateFilter?.(null))
                          }
                          className="ml-1 hover:opacity-70"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>

                    {showDatePanel && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowDatePanel(false)}
                        />
                        <div className="absolute left-0 top-full mt-2 z-50">
                          <DateFilterPanel
                            value={dateRange}
                            onApply={(range) => {
                              onDateFilter?.(range);
                              setShowDatePanel(false);
                            }}
                            onClear={() => {
                              onDateFilter?.(null);
                              setShowDatePanel(false);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {dateRange && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      <FiCalendar className="w-3 h-3" />
                      {displayDate(dateRange.from)} —{" "}
                      {displayDate(dateRange.to)}
                    </div>
                  )}

                  <div className="flex-1" />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                      <FiFilter className="w-3.5 h-3.5" />
                    </span>
                    <select
                      value={entityFilter}
                      onChange={(e) => setEntityFilter(e.target.value)}
                      className="text-xs rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="all">All Entities</option>
                      {Object.values(ACTIVITY_ENTITY_TYPE).map((v) => (
                        <option key={v} value={v}>
                          {ENTITY_CONFIG[v]?.label ?? v}
                        </option>
                      ))}
                    </select>
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="text-xs rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="all">All Actions</option>
                      {Object.values(ACTIVITY_ACTION).map((v) => (
                        <option key={v} value={v}>
                          {ACTION_CONFIG[v]?.label ?? v}
                        </option>
                      ))}
                    </select>
                    {hasClientFilters && (
                      <button
                        onClick={() => {
                          setEntityFilter("all");
                          setActionFilter("all");
                        }}
                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                      >
                        <FiX className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                    <span className="text-xs text-gray-400 tabular-nums">
                      {filteredActivities.length} results
                    </span>
                  </div>
                </div>

                {totalActivities === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <FiActivity className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto" />
                    <p className="text-gray-400 font-medium">
                      No activity recorded for this period
                    </p>
                    {dateRange && (
                      <button
                        onClick={() => onDateFilter?.(null)}
                        className="text-sm text-indigo-500 hover:text-indigo-600 font-medium"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                              <IoTrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Activity Over Time
                            </p>
                          </div>
                          <span className="text-xs font-medium text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-gray-600">
                            {totalActivities} total
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height={190}>
                          <AreaChart
                            data={dailyAreaData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="actGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#6366f1"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#6366f1"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                              strokeOpacity={0.4}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="count"
                              name="Activities"
                              stroke="#6366f1"
                              strokeWidth={2.5}
                              fill="url(#actGrad)"
                              dot={{
                                r: 4,
                                fill: "#6366f1",
                                strokeWidth: 2,
                                stroke: "#fff",
                              }}
                              activeDot={{
                                r: 6,
                                fill: "#6366f1",
                                stroke: "#fff",
                                strokeWidth: 2,
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                            <BsCircleFill className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            By Entity
                          </p>
                        </div>
                        <ResponsiveContainer width="100%" height={145}>
                          <PieChart>
                            <Pie
                              data={entityPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={64}
                              dataKey="value"
                              paddingAngle={4}
                              stroke="none"
                            >
                              {entityPieData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="mt-3 space-y-1.5">
                          {entityPieData.map((e, i) => (
                            <div
                              key={e.name}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{
                                  background: PIE_COLORS[i % PIE_COLORS.length],
                                }}
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                                {e.name}
                              </span>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                {e.value}
                              </span>
                              <span className="text-xs text-gray-400 tabular-nums">
                                ({Math.round((e.value / totalActivities) * 100)}
                                %)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                            <FiActivity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Actions Breakdown
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {actionBarData.length} action types
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart
                          data={actionBarData}
                          margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            strokeOpacity={0.4}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar
                            dataKey="count"
                            name="Count"
                            radius={[5, 5, 0, 0]}
                            maxBarSize={52}
                          >
                            {actionBarData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={BAR_COLORS[i % BAR_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Timeline */}
                    <div className="pt-2">
                      {filteredActivities.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">
                          No activities match the selected filters.
                        </p>
                      ) : (
                        filteredActivities.map((activity) => (
                          <ActivityRow key={activity.id} activity={activity} />
                        ))
                      )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && onPageChange && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="p-6 space-y-6">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading summary…</p>
              </div>
            ) : !activitySummary ? (
              <div className="text-center py-16">
                <IoBarChart className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">
                  No summary data available
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowSummaryDatePanel((v) => !v)}
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all ${
                        summaryFilter?.from || summaryFilter?.to
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      }`}
                    >
                      <LuCalendarRange className="w-4 h-4" />
                      {summaryFilter?.from && summaryFilter?.to
                        ? `${displayDate(summaryFilter.from)} – ${displayDate(summaryFilter.to)}`
                        : "Date Range"}
                      {(summaryFilter?.from || summaryFilter?.to) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSummaryFilter?.({
                              ...summaryFilter,
                              from: undefined,
                              to: undefined,
                            });
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.stopPropagation(),
                            onSummaryFilter?.({
                              groupBy: summaryFilter?.groupBy,
                            }))
                          }
                          className="ml-1 hover:opacity-70"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>

                    {showSummaryDatePanel && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSummaryDatePanel(false)}
                        />
                        <div className="absolute left-0 top-full mt-2 z-50">
                          <DateFilterPanel
                            value={
                              summaryFilter?.from && summaryFilter?.to
                                ? {
                                    from: summaryFilter.from,
                                    to: summaryFilter.to,
                                  }
                                : null
                            }
                            onApply={(range) => {
                              onSummaryFilter?.({ ...summaryFilter, ...range });
                              setShowSummaryDatePanel(false);
                            }}
                            onClear={() => {
                              onSummaryFilter?.({
                                groupBy: summaryFilter?.groupBy,
                              });
                              setShowSummaryDatePanel(false);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl p-1">
                    {(["day", "week", "month"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          onSummaryFilter?.({ ...summaryFilter, groupBy: g })
                        }
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${
                          (summaryFilter?.groupBy ?? "month") === g
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {summaryFilter?.from && summaryFilter?.to && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        <FiCalendar className="w-3 h-3" />
                        {displayDate(summaryFilter.from)} —{" "}
                        {displayDate(summaryFilter.to)}
                      </div>
                    )}

                    {(summaryFilter?.from ||
                      summaryFilter?.to ||
                      summaryFilter?.groupBy) && (
                      <button
                        onClick={() => onSummaryFilter?.({})}
                        className="text-xs text-red-500 hover:text-white bg-red-50 hover:bg-red-500 px-2.5 py-1 rounded-full cursor-pointer group font-medium flex items-center gap-1 ml-auto"
                      >
                        <FiX className="w-3 h-3 group-hover:rotate-90" /> Reset
                      </button>
                    )}
                  </div>

                  {activitySummary && (
                    <span className="ml-auto text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {displayDate(activitySummary.range.from)} —{" "}
                      {displayDate(activitySummary.range.to)}
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded capitalize font-medium">
                        {activitySummary.range.groupBy}
                      </span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link
                    href={`/leads?userid=${userData._id}`}
                    className="relative overflow-hidden hover:scale-105 cursor-point hover:shadow-[0_0_8px_10px_#00000014] bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                        <HiOutlineUserGroup className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Leads Created
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                          {activitySummary.leads.created.reduce(
                            (s, b) => s + b.count,
                            0,
                          )}
                        </p>
                        <p className="text-xs text-rose-500 mt-0.5">
                          {activitySummary.leads.lost} lost
                        </p>
                      </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-indigo-500 opacity-[0.07]" />
                  </Link>

                  <Link
                    href={`/deals?userid=${userData._id}`}
                    className="relative overflow-hidden hover:scale-105 cursor-point hover:shadow-[0_0_8px_10px_#00000014] bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <HiOutlineBriefcase className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Deals Created
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                          {activitySummary.deals.created.reduce(
                            (s, b) => s + b.count,
                            0,
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="text-emerald-500">
                            {activitySummary.deals.won} won
                          </span>
                          {" · "}
                          <span className="text-rose-500">
                            {activitySummary.deals.lost} lost
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-emerald-500 opacity-[0.07]" />
                  </Link>

                  {/* Quotations */}
                  <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                        <HiOutlineDocumentText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Quotations
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                          {activitySummary.quotations.sent +
                            activitySummary.quotations.accepted}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="text-violet-500">
                            {activitySummary.quotations.sent} sent
                          </span>
                          {" · "}
                          <span className="text-emerald-500">
                            {activitySummary.quotations.accepted} accepted
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-amber-500 opacity-[0.07]" />
                  </div>

                  <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                        <HiOutlineCurrencyDollar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Invoices
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                          {activitySummary.invoices.created}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">created</p>
                      </div>
                    </div>
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-blue-500 opacity-[0.07]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Leads over time */}
                  <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                        <HiOutlineUserGroup className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Leads Created
                      </p>
                      <span className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {activitySummary.leads.created.reduce(
                          (s, b) => s + b.count,
                          0,
                        )}{" "}
                        total
                      </span>
                    </div>
                    {activitySummary.leads.created.length > 0 ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart
                          data={activitySummary.leads.created.map((b) => ({
                            period: String(b._id),
                            count: b.count,
                          }))}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="leadsGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#6366f1"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#6366f1"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            strokeOpacity={0.4}
                          />
                          <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Leads"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            fill="url(#leadsGrad)"
                            dot={{
                              r: 4,
                              fill: "#6366f1",
                              strokeWidth: 2,
                              stroke: "#fff",
                            }}
                            activeDot={{
                              r: 6,
                              fill: "#6366f1",
                              stroke: "#fff",
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                        No data for this period
                      </div>
                    )}
                  </div>

                  {/* Deals over time */}
                  <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                        <HiOutlineBriefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Deals Created
                      </p>
                      <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {activitySummary.deals.created.reduce(
                          (s, b) => s + b.count,
                          0,
                        )}{" "}
                        total
                      </span>
                    </div>
                    {activitySummary.deals.created.length > 0 ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart
                          data={activitySummary.deals.created.map((b) => ({
                            period: String(b._id),
                            count: b.count,
                          }))}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="dealsGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            strokeOpacity={0.4}
                          />
                          <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Deals"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fill="url(#dealsGrad)"
                            dot={{
                              r: 4,
                              fill: "#10b981",
                              strokeWidth: 2,
                              stroke: "#fff",
                            }}
                            activeDot={{
                              r: 6,
                              fill: "#10b981",
                              stroke: "#fff",
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                        No data for this period
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Quotations + Deals win/loss bar charts ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Quotations breakdown bar */}
                  <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                        <HiOutlineDocumentText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Quotations Breakdown
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={[
                          {
                            name: "Sent",
                            value: activitySummary.quotations.sent,
                          },
                          {
                            name: "Accepted",
                            value: activitySummary.quotations.accepted,
                          },
                        ]}
                        margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          strokeOpacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="value"
                          name="Count"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={60}
                        >
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Deals win/loss breakdown bar */}
                  <div className="bg-slate-50 dark:bg-gray-700/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                        <HiOutlineBriefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Deals Outcome
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={[
                          {
                            name: "Created",
                            value: activitySummary.deals.created.reduce(
                              (s, b) => s + b.count,
                              0,
                            ),
                          },
                          { name: "Won", value: activitySummary.deals.won },
                          { name: "Lost", value: activitySummary.deals.lost },
                        ]}
                        margin={{ top: 0, right: 5, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          strokeOpacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="value"
                          name="Count"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={60}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Entity performance summary table ───────────────── */}
                <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Entity Performance
                    </p>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-gray-700">
                    {[
                      {
                        icon: <HiOutlineUserGroup className="w-4 h-4" />,
                        label: "Leads",
                        color: "text-indigo-600",
                        bg: "bg-indigo-50 dark:bg-indigo-900/30",
                        stats: [
                          {
                            label: "Created/Assigned",
                            value: activitySummary.leads.created.reduce(
                              (s, b) => s + b.count,
                              0,
                            ),
                            color: "text-gray-800 dark:text-gray-100",
                          },
                          {
                            label: "Lost",
                            value: activitySummary.leads.lost,
                            color: "text-rose-500",
                          },
                        ],
                      },
                      {
                        icon: <HiOutlineBriefcase className="w-4 h-4" />,
                        label: "Deals",
                        color: "text-emerald-600",
                        bg: "bg-emerald-50 dark:bg-emerald-900/30",
                        stats: [
                          {
                            label: "Created",
                            value: activitySummary.deals.created.reduce(
                              (s, b) => s + b.count,
                              0,
                            ),
                            color: "text-gray-800 dark:text-gray-100",
                          },
                          {
                            label: "Won",
                            value: activitySummary.deals.won,
                            color: "text-emerald-500",
                          },
                          {
                            label: "Lost",
                            value: activitySummary.deals.lost,
                            color: "text-rose-500",
                          },
                        ],
                      },
                      {
                        icon: <HiOutlineDocumentText className="w-4 h-4" />,
                        label: "Quotations",
                        color: "text-amber-600",
                        bg: "bg-amber-50 dark:bg-amber-900/30",
                        stats: [
                          {
                            label: "Sent",
                            value: activitySummary.quotations.sent,
                            color: "text-violet-500",
                          },
                          {
                            label: "Accepted",
                            value: activitySummary.quotations.accepted,
                            color: "text-emerald-500",
                          },
                        ],
                      },
                      {
                        icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
                        label: "Invoices",
                        color: "text-blue-600",
                        bg: "bg-blue-50 dark:bg-blue-900/30",
                        stats: [
                          {
                            label: "Created",
                            value: activitySummary.invoices.created,
                            color: "text-gray-800 dark:text-gray-100",
                          },
                        ],
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${row.bg} ${row.color} min-w-28`}
                        >
                          {row.icon}
                          {row.label}
                        </span>
                        <div className="flex items-center gap-6 flex-wrap">
                          {row.stats.map((s) => (
                            <div key={s.label} className="text-center">
                              <p
                                className={`text-base font-bold tabular-nums ${s.color}`}
                              >
                                {s.value}
                              </p>
                              <p className="text-xs text-gray-400">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Roles ──────────────────────────────────────────────────── */}
        {activeTab === "roles" && (
          <div className="p-6 space-y-4">
            {!userData.userRole?.length ? (
              <div className="text-center py-12">
                <IoShieldCheckmark className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No roles assigned</p>
              </div>
            ) : (
              userData.userRole.map((role) => (
                <div
                  key={role.id}
                  className="border border-slate-100 dark:border-gray-700 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <Link
                      href={`/roles`}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-8 h-8 bg-linear-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <IoShieldCheckmark className="w-4 h-4 text-white group-hover:scale-112" />
                      </div>
                      <div>
                        <h4 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-500 text-gray-800 dark:text-gray-100">
                          {role.name}
                        </h4>
                        <p className="text-xs font-mono text-gray-400">
                          {role.code}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {role.isSystemRole && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                          System Role
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.status ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}
                      >
                        {role.status ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FiCalendar className="w-3 h-3" />
                    <span>Created {formatDate(role.createdAt)}</span>
                    {role.permissions?.length > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-gray-600">
                          •
                        </span>
                        <IoShieldCheckmark className="w-3 h-3" />
                        <span>{role.permissions.length} permissions</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "company" && (
          <div className="p-6">
            {companyLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading company…</p>
              </div>
            ) : !companyData ? (
              <div className="text-center py-16 space-y-3">
                <MdBusiness className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto" />
                <p className="text-base font-semibold text-gray-400">
                  No company assigned
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  This user is not linked to any company yet.
                </p>
                <Link
                  href={`/users/update/${userData.id ?? userData._id}`}
                  className="inline-flex items-center gap-2 mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <MdOutlineEdit className="w-4 h-4" /> Assign a company
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                  <div
                    className="h-20 relative"
                    style={{
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a21caf 100%)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                      }}
                    />
                  </div>
                  <div className="px-6 pb-5 relative">
                    <div className="flex items-end justify-between -mt-6 mb-4 flex-wrap gap-3">
                      <div className="w-14 h-14 rounded-2xl border-4 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-xl">
                        <MdBusiness className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <Link
                        href={`/companies/${companyData.id ?? (companyData as any).id}`}
                        className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <IoEyeOutline className="w-4 h-4" /> View Full Profile
                      </Link>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                          {companyData.companyName}
                        </h2>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            companyData.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : companyData.status === "pending_verification"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : companyData.status === "suspended"
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {companyData.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                        <span className="font-mono">
                          {companyData.companyId}
                        </span>
                        {companyData.industry && (
                          <>
                            <span className="text-slate-300 dark:text-gray-600">
                              ·
                            </span>
                            <span>{companyData.industry}</span>
                          </>
                        )}
                        {companyData.slug && (
                          <>
                            <span className="text-slate-300 dark:text-gray-600">
                              ·
                            </span>
                            <span className="font-mono">
                              /{companyData.slug}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Quick stats ─────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Subscriptions",
                      value: companyData.subscriptionCount ?? 0,
                      icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
                      accent: "bg-blue-500",
                      bg: "bg-blue-50 dark:bg-blue-900/20",
                      text: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "User Limit",
                      value: companyData.userLimit ?? "Unlimited",
                      icon: <HiOutlineUserGroup className="w-4 h-4" />,
                      accent: "bg-violet-500",
                      bg: "bg-violet-50 dark:bg-violet-900/20",
                      text: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      label: "Member Since",
                      value: new Date(companyData.createdAt).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" },
                      ),
                      icon: <FiCalendar className="w-4 h-4" />,
                      accent: "bg-emerald-500",
                      bg: "bg-emerald-50 dark:bg-emerald-900/20",
                      text: "text-emerald-600 dark:text-emerald-400",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${s.accent} flex items-center justify-center text-white shrink-0`}
                      >
                        {s.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium">
                          {s.label}
                        </p>
                        <p className={`text-sm font-bold truncate ${s.text}`}>
                          {String(s.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Details + Contact ────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                      Company Details
                    </h3>
                    <div className="space-y-0">
                      {[
                        {
                          label: "Industry",
                          value: companyData.industry || "—",
                        },
                        { label: "Website", value: companyData.website || "—" },
                        {
                          label: "Timezone",
                          value: companyData.timezone || "—",
                        },
                        {
                          label: "Company Size",
                          value: companyData.companySize || "—",
                        },
                        { label: "Country", value: companyData.country || "—" },
                        {
                          label: "Sub Domain",
                          value: companyData.subDomain || "—",
                        },
                        {
                          label: "Reg. Number",
                          value: companyData.registrationNumber || "—",
                        },
                        {
                          label: "Trade Number",
                          value: companyData.tradeNumber || "—",
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 dark:border-gray-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-gray-700/20 rounded-lg px-1 transition-colors"
                        >
                          <span className="text-xs text-gray-400 min-w-28 shrink-0 mt-0.5">
                            {label}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right capitalize break-all">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                      Contact Info
                    </h3>
                    <div className="space-y-0">
                      {[
                        { label: "Email", value: companyData.email || "—" },
                        { label: "Phone", value: companyData.number || "—" },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 dark:border-gray-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-gray-700/20 rounded-lg px-1 transition-colors"
                        >
                          <span className="text-xs text-gray-400 min-w-28 shrink-0 mt-0.5">
                            {label}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right break-all">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Primary Admin */}
                    {(companyData as any).primary_admin &&
                      typeof (companyData as any).primary_admin === "object" &&
                      (companyData as any).primary_admin.firstName && (
                        <div className="mt-5">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                            Company Admin
                          </h3>
                          <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-700">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {
                                (companyData as any).primary_admin
                                  .firstName?.[0]
                              }
                              {(companyData as any).primary_admin
                                .lastName?.[0] ?? ""}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">
                                {(companyData as any).primary_admin.firstName}{" "}
                                {(companyData as any).primary_admin.lastName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    (companyData as any).primary_admin
                                      .isEmailVerified
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  }`}
                                >
                                  {(companyData as any).primary_admin
                                    .isEmailVerified
                                    ? "✓ Verified"
                                    : "Unverified"}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                                    (companyData as any).primary_admin
                                      .status === "active"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                  }`}
                                >
                                  {(companyData as any).primary_admin.status}
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/users/${(companyData as any).primary_admin.id ?? (companyData as any).primary_admin._id}`}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                            >
                              <IoEyeOutline className="w-3.5 h-3.5" /> View
                            </Link>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* ── Subscription ────────────────────────────────────────── */}
                {(companyData as any).subscription &&
                  typeof (companyData as any).subscription === "object" &&
                  (companyData as any).subscription.subscriptionId && (
                    <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Subscription
                        </h3>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                            (companyData as any).subscription.status ===
                            "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : (companyData as any).subscription.status ===
                                  "trial"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {(companyData as any).subscription.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {[
                          {
                            label: "Base Price",
                            value: `$${(companyData as any).subscription.basePrice}`,
                            sub: (companyData as any).subscription.billingCycle,
                            color: "text-gray-800 dark:text-gray-100",
                          },
                          {
                            label: "Discount",
                            value: `$${(companyData as any).subscription.discountAmount}`,
                            sub: "saved",
                            color:
                              (companyData as any).subscription.discountAmount >
                              0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-400",
                          },
                          {
                            label: "Final Price",
                            value: `$${(companyData as any).subscription.finalPrice}`,
                            sub: `/${(companyData as any).subscription.billingCycle}`,
                            color: "text-indigo-600 dark:text-indigo-400",
                          },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 text-center border border-slate-100 dark:border-gray-700"
                          >
                            <p className="text-xs text-gray-400 font-medium mb-1">
                              {s.label}
                            </p>
                            <p className={`text-lg font-black ${s.color}`}>
                              {s.value}
                            </p>
                            <p className="text-xs text-gray-400 capitalize mt-0.5">
                              {s.sub}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                          {
                            label: "Trial Start",
                            value: (companyData as any).subscription
                              .trialStartDate
                              ? new Date(
                                  (companyData as any).subscription
                                    .trialStartDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—",
                            icon: "🎯",
                          },
                          {
                            label: "Trial End",
                            value: (companyData as any).subscription
                              .trialEndDate
                              ? new Date(
                                  (companyData as any).subscription
                                    .trialEndDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—",
                            icon: "⏳",
                          },
                          {
                            label: "Start Date",
                            value: (companyData as any).subscription
                              .startSubscriptionDate
                              ? new Date(
                                  (companyData as any).subscription
                                    .startSubscriptionDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—",
                            icon: "📅",
                          },
                          {
                            label: "End Date",
                            value: (companyData as any).subscription
                              .endSubscriptionDate
                              ? new Date(
                                  (companyData as any).subscription
                                    .endSubscriptionDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—",
                            icon: "🏁",
                          },
                        ].map((d) => (
                          <div
                            key={d.label}
                            className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-700"
                          >
                            <span className="text-gray-400">
                              {d.icon} {d.label}
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {d.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-gray-700">
                        <span className="text-xs text-gray-400 font-mono truncate flex-1">
                          ID: {(companyData as any).subscription.subscriptionId}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(
                              (companyData as any).subscription.subscriptionId,
                            )
                          }
                          className="text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                          <MdOutlineContentCopy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                {/* ── Timestamps ──────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Timeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        label: "Created At",
                        value: companyData.createdAt
                          ? new Date(companyData.createdAt).toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "—",
                        icon: "📌",
                        color: "text-indigo-600 dark:text-indigo-400",
                        bg: "bg-indigo-50 dark:bg-indigo-900/20",
                      },
                      {
                        label: "Updated At",
                        value: companyData.updatedAt
                          ? new Date(companyData.updatedAt).toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "Not updated",
                        icon: "✏️",
                        color: "text-amber-600 dark:text-amber-400",
                        bg: "bg-amber-50 dark:bg-amber-900/20",
                      },
                      {
                        label: "Deleted At",
                        value: companyData.deletedAt
                          ? new Date(companyData.deletedAt).toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "Not deleted",
                        icon: "🗑️",
                        color: companyData.deletedAt
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400",
                        bg: companyData.deletedAt
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-slate-50 dark:bg-gray-700/50",
                      },
                    ].map((t) => (
                      <div
                        key={t.label}
                        className={`flex flex-col gap-1.5 p-4 rounded-xl border border-slate-100 dark:border-gray-700 ${t.bg}`}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                          <span>{t.icon}</span>
                          {t.label}
                        </div>
                        <p className={`text-sm font-semibold ${t.color}`}>
                          {t.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
