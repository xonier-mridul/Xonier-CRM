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
}

// ─── Constants ────────────────────────────────────────────────────────────────
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
  link
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: JSX.Element;
  accent: string;
  link: string
}) => (
  <Link href={link} className="relative overflow-hidden hover:scale-105 hover:shadow-[0_0_6px_10px_#00000015] border-gray-200 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 flex items-start gap-4">
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

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full mt-1.5 ring-2 ring-white dark:ring-gray-800 ${action.dot} shrink-0`}
        />
        <div className="w-px flex-1 bg-gray-100 dark:bg-gray-700 mt-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
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
  );
};

// ─── DateFilterPanel ──────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
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
}: ExtendedUserDetailProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "activity" | "summary" | "roles"
  >("overview");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [showSummaryDatePanel, setShowSummaryDatePanel] = useState(false);

  // ── Chart data ─────────────────────────────────────────────────────────
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

  // ── Guards ─────────────────────────────────────────────────────────────
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
  ];
  
  return (
    <div className="flex flex-col gap-6 font-sans">
      
      <div className="relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="h-28 bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{
  background: "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 50%, #059669 100%)"
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
              <Link href={`tel:${userData.phone}`} className="flex items-center cursor-pointer hover:text-blue-600 gap-1.5">
                <MdPhone className="w-4 h-4" />
                {userData.phone}
              </Link>
              {userData.company && (
                <span className="flex items-center gap-1.5">
                  <MdBusiness className="w-4 h-4" />
                  {userData.company}
                </span>
              )}
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
                  { label: "Company", value: userData.company || "—" },
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

                      {/* Donut chart */}
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
                        {/* Legend with counts */}
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

        {/* ── Summary ────────────────────────────────────────────────── */}
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
                {/* ── Summary filter bar ─────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date range trigger — reuses the same DateFilterPanel */}
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

                  {/* GroupBy selector */}
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
                  
                  <Link href={`/leads?userid=${userData._id}`} className="relative overflow-hidden hover:scale-105 cursor-point hover:shadow-[0_0_8px_10px_#00000014] bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
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

          
                  <Link href={`/deals?userid=${userData._id}`} className="relative overflow-hidden hover:scale-105 cursor-point hover:shadow-[0_0_8px_10px_#00000014] bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
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
                    <Link href={`/roles`}  className="flex items-center gap-2 group">
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
      </div>
    </div>
  );
};

export default UserDetail;
