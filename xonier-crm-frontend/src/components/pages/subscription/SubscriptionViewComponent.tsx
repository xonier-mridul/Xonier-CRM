"use client";

import { subScriptionView, Subscription } from "@/src/types/subscription/subscription.types";
import { Plan } from "@/src/types/plan/plan.types";
import { Company } from "@/src/types/company/company.types";
import React from "react";
import DataNotFound from "../../common/DataNotFound";
import Link from "next/link";
import {
  LuCrown,
  LuCalendarDays,
  LuZap,
  LuBuilding2,
  LuUser,
  LuClock,
  LuBadgeCheck,
  LuCircleDollarSign,
  LuArrowUpRight,
  LuFlag,
  LuPlay,

  LuGlobe,
  LuRefreshCw,
} from "react-icons/lu";
import { GoDotFill } from "react-icons/go";
import Skeleton from "react-loading-skeleton";
import { LucideXCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtFull = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const STATUS_MAP: Record<
  string,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
  trial: {
    label: "Trial",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  paused: {
    label: "Paused",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-200 dark:ring-red-800",
  },
  expired: {
    label: "Expired",
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    ring: "ring-gray-200 dark:ring-gray-600",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    ring: "ring-gray-200 dark:ring-gray-600",
  },
};

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 dark:border-gray-700/50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-gray-700/20 px-1 rounded-lg transition-colors">
      <span className="text-xs text-gray-400 dark:text-gray-500 min-w-32 shrink-0 mt-0.5 font-medium">
        {label}
      </span>
      <span
        className={`text-sm font-semibold text-right text-gray-800 dark:text-gray-100 break-all ${mono ? "font-mono text-xs text-gray-400" : ""}`}
      >
        {value ?? <span className="text-gray-300 dark:text-gray-600 italic font-normal">—</span>}
      </span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-gray-700 ${accent}`}>
      <div className="w-8 h-8 rounded-xl bg-white/70 dark:bg-gray-800/70 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="space-y-5 p-1">
      <Skeleton height={120} borderRadius={16} />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={80} borderRadius={12} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Skeleton height={260} borderRadius={16} />
        <Skeleton height={260} borderRadius={16} />
      </div>
      <Skeleton height={200} borderRadius={16} />
      <Skeleton height={80} borderRadius={16} />
    </div>
  );
}

const SubscriptionViewComponent = ({
  subScriptionData,
  isLoading,
}: subScriptionView) => {
  const { t } = useTranslation();
  if (isLoading) return <ViewSkeleton />;
  if (!subScriptionData) return <DataNotFound title={t("subscription_data_not_found")} />;

  const s = subScriptionData;
  const plan = typeof s.planId === "object" ? (s.planId as Plan) : null;
  const company = typeof s.companyId === "object" ? (s.companyId as Company) : null;

  const status = STATUS_MAP[s.status] ?? STATUS_MAP["inactive"];

  const companyId =
    company ? (company.id ?? (company as any).id ?? s.companyId) : s.companyId;
  const companyName = company?.companyName ?? null;

  const createdById =
    typeof (s as any).createdBy === "object"
      ? (s as any).createdBy?.id ?? (s as any).createdBy?._id
      : (s as any).createdBy;

  const timelineEvents = [
    {
      icon: <LuPlay className="w-3.5 h-3.5" />,
      label: "Trial Start",
      date: s.trialStartDate,
      color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
      line: "bg-violet-200 dark:bg-violet-800",
      active: !!s.trialStartDate,
    },
    {
      icon: <LuFlag className="w-3.5 h-3.5" />,
      label: "Trial End",
      date: s.trialEndDate,
      color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
      line: "bg-blue-200 dark:bg-blue-800",
      active: !!s.trialEndDate,
    },
    {
      icon: <LuBadgeCheck className="w-3.5 h-3.5" />,
      label: "Subscription Start",
      date: s.startSubscriptionDate,
      color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
      line: "bg-emerald-200 dark:bg-emerald-800",
      active: !!s.startSubscriptionDate,
    },
    {
      icon: <LuFlag className="w-3.5 h-3.5" />,
      label: "Subscription End",
      date: s.endSubscriptionDate,
      color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
      line: "bg-amber-200 dark:bg-amber-800",
      active: !!s.endSubscriptionDate,
    },
    {
      icon: <LucideXCircle className="w-3.5 h-3.5" />,
      label: "Cancelled At",
      date: s.cancelledAt,
      color: s.cancelledAt
        ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
        : "bg-slate-100 dark:bg-gray-700 text-gray-400",
      line: "bg-gray-200 dark:bg-gray-700",
      active: !!s.cancelledAt,
      sub: s.cancelReason,
    },
  ];

  const daysRemaining = s.endSubscriptionDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(s.endSubscriptionDate).getTime() - Date.now()) / 86400000
        )
      )
    : null;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Hero banner ───────────────────────────────────────────── */}
      <div className="relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div
          className="h-24 relative bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] "
          // 
        >
          <div
            className="absolute inset-0 "
            // style={{
            //   backgroundImage:
            //     "radial-gradient(ellipse at 15% 50%, rgba(167,139,250,0.25) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(99,102,241,0.3) 0%, transparent 50%)",
            // }}
          />
          <div className="absolute inset-0 opacity-10 " 
          // style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)" }} 
          />
        </div>

        <div className="px-6 pb-5 relative">
          <div className="flex items-end justify-between -mt-7 mb-4 flex-wrap gap-3">
            <div className="w-14 h-14 rounded-2xl border-4 border-white dark:border-gray-800 bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] flex items-center justify-center shadow-xl">
              <LuCrown className="w-7 h-7 text-white" />
            </div>
            <div className={`mb-1 flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 text-xs font-bold ${status.bg} ${status.text} ${status.ring}`}>
              <GoDotFill className={`text-sm ${status.dot.replace("bg-", "text-")}`} />
              {status.label}
              {daysRemaining !== null && s.status === "active" && (
                <span className="opacity-70 font-normal">· {daysRemaining}{t("d_left")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {plan ? (typeof plan === "object" && (plan as any).name ? (plan as any).name : "Subscription") : "Subscription"}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 capitalize border border-cyan-100 dark:border-cyan-800">
                {s.billingCycle}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
              <span className="font-mono">{s.subscriptionId}</span>
              <span className="text-slate-300 dark:text-gray-600">·</span>
              <span>{t("id_2")} {s.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Final Price",
            value: `$${s.finalPrice.toFixed(2)}`,
            sub: `/${s.billingCycle}`,
            icon: <LuCircleDollarSign className="w-5 h-5" />,
            accent: "bg-cyan-500",
            text: "text-cyan-600 dark:text-cyan-400",
            bg: "bg-cyan-50 dark:bg-cyan-900/20",
          },
          {
            label: "Base Price",
            value: `$${s.basePrice.toFixed(2)}`,
            sub: "before discount",
            icon: <LuZap className="w-5 h-5" />,
            accent: "bg-violet-500",
            text: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-900/20",
          },
          {
            label: "Discount",
            value: `$${s.discountAmount.toFixed(2)}`,
            sub: s.discountAmount > 0 ? "saved" : "no discount",
            icon: <LuBadgeCheck className="w-5 h-5" />,
            accent: "bg-emerald-500",
            text: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: daysRemaining !== null ? "Days Left" : "Start Date",
            value:
              daysRemaining !== null
                ? `${daysRemaining}d`
                : fmt(s.startSubscriptionDate),
            sub:
              daysRemaining !== null
                ? `ends ${fmt(s.endSubscriptionDate)}`
                : "subscription start",
            icon: <LuCalendarDays className="w-5 h-5" />,
            accent: "bg-amber-500",
            text: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
          >
            <div className={`w-10 h-10 rounded-xl ${c.accent} flex items-center justify-center text-white shrink-0`}>
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{c.label}</p>
              <p className={`text-lg font-black ${c.text} leading-tight`}>{c.value}</p>
              <p className="text-[10px] text-gray-400 truncate">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Billing + Timeline ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Billing */}
        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <SectionHeader
            icon={<LuCircleDollarSign className="w-4 h-4 text-blue-500" />}
            title={t("billing_pricing")}
            accent="bg-blue-50/60 dark:bg-blue-900/10"
          />
          <div className="p-5 space-y-0">
            <InfoRow label={t("billing_cycle")} value={<span className="capitalize">{s.billingCycle}</span>} />
            <InfoRow label={t("base_price")} value={`$${s.basePrice.toFixed(2)}`} />
            <InfoRow
              label={t("discount")}
              value={
                <span className={s.discountAmount > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                  ${s.discountAmount.toFixed(2)}
                </span>
              }
            />
            <InfoRow
              label={t("final_price")}
              value={
                <span className="text-cyan-600 dark:text-cyan-400 font-black text-base">
                  ${s.finalPrice.toFixed(2)}
                </span>
              }
            />
            <InfoRow label={t("status")} value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                <GoDotFill />
                {status.label}
              </span>
            } />
            {plan && typeof plan === "object" && (
              <>
                {(plan as any).name && <InfoRow label={t("plan_name")} value={(plan as any).name} />}
                {(plan as any).id && (
                  <InfoRow
                    label={t("plan_id")}
                    value={
                      <Link href={`/plans/${(plan as any).id}`} className="text-cyan-500 hover:underline flex items-center gap-1 justify-end">
                        {String((plan as any).id).slice(0, 16)}…
                        <LuArrowUpRight className="w-3 h-3" />
                      </Link>
                    }
                  />
                )}
                {(plan as any).currency && <InfoRow label={t("currency")} value={(plan as any).currency?.toUpperCase()} />}
                {(plan as any).price?.monthlyPrice != null && (
                  <InfoRow label={t("monthly_rate")} value={`$${(plan as any).price.monthlyPrice}`} />
                )}
                {(plan as any).price?.yearlyPrice != null && (
                  <InfoRow label={t("yearly_rate")} value={`$${(plan as any).price.yearlyPrice}`} />
                )}
                {(plan as any).visibility && (
                  <InfoRow
                    label={t("plan_visibility")}
                    value={
                      <span className="flex items-center gap-1 capitalize">
                        <LuGlobe className="w-3 h-3" />
                        {(plan as any).visibility}
                      </span>
                    }
                  />
                )}
                {(plan as any).trial_days != null && (
                  <InfoRow label={t("trial_days")} value={`${(plan as any).trial_days} days`} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <SectionHeader
            icon={<LuCalendarDays className="w-4 h-4 text-emerald-500" />}
            title={t("subscription_timeline")}
            accent="bg-emerald-50/60 dark:bg-emerald-900/10"
          />
          <div className="p-5">
            <div className="relative">
              {timelineEvents.map((ev, idx) => (
                <div key={ev.label} className="relative flex gap-4 pb-5 last:pb-0">
                  {idx < timelineEvents.length - 1 && (
                    <div className="absolute left-[17px] top-8 bottom-0 w-0.5 border-l-2 border-dashed border-gray-200 dark:border-gray-700" />
                  )}
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ev.color} ${!ev.active ? "opacity-40" : ""}`}>
                    {ev.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <p className={`text-sm font-semibold ${ev.active ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
                      {ev.label}
                    </p>
                    <p className={`text-xs mt-0.5 font-mono ${ev.active ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600"}`}>
                      {ev.date ? fmt(ev.date) : "—"}
                    </p>
                    {ev.sub && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                        {t("reason")} {ev.sub}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company + Created By ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <SectionHeader
            icon={<LuBuilding2 className="w-4 h-4 text-cyan-500" />}
            title={t("company")}
            accent="bg-cyan-50/60 dark:bg-cyan-900/10"
          />
          <div className="p-5">
            {companyName ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center shrink-0">
                  <LuBuilding2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-800 dark:text-gray-100 capitalize truncate">
                    {companyName}
                  </p>
                  {company?.status && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                      company.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {company.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <Link
                  href={`/companies/${companyId}`}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  {t("view")} <LuArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : null}
            <div className="space-y-0">
              <InfoRow label={t("company_id")} value={String(companyId ?? "—")} mono />
              {company?.industry && <InfoRow label={t("industry_2")} value={company.industry} />}
              {company?.country && <InfoRow label={t("country")} value={company.country} />}
              {company?.companyId && <InfoRow label={t("ref_id")} value={company.companyId} mono />}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <SectionHeader
            icon={<LuUser className="w-4 h-4 text-amber-500" />}
            title={t("created_by")}
            accent="bg-amber-50/60 dark:bg-amber-900/10"
          />
          <div className="p-5 space-y-0">
            <InfoRow label={t("user_id")} value={String(createdById ?? "—")} mono />
            <InfoRow label={t("collection")} value="users" />
            {createdById && (
              <div className="pt-3">
                <Link
                  href={`/users/${createdById}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <LuUser className="w-4 h-4" />
                  {t("view_creator_profile")}
                  <LuArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Timestamps ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <SectionHeader
          icon={<LuClock className="w-4 h-4 text-gray-500" />}
          title={t("record_timestamps")}
          accent="bg-slate-50/60 dark:bg-gray-700/30"
        />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Created At",
              value: fmtFull(s.createdAt),
              icon: <LuCalendarDays className="w-4 h-4" />,
              color: "text-cyan-600 dark:text-cyan-400",
              bg: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800",
            },
            {
              label: "Updated At",
              value: s.updatedAt ? fmtFull(s.updatedAt) : "Never updated",
              icon: <LuRefreshCw className="w-4 h-4" />,
              color: s.updatedAt
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-400",
              bg: s.updatedAt
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
                : "bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-700",
            },
            {
              label: "Cancelled At",
              value: s.cancelledAt ? fmtFull(s.cancelledAt) : "Not cancelled",
              icon: <LucideXCircle className="w-4 h-4" />,
              color: s.cancelledAt
                ? "text-red-600 dark:text-red-400"
                : "text-gray-400",
              bg: s.cancelledAt
                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                : "bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-700",
            },
          ].map((t) => (
            <div
              key={t.label}
              className={`flex flex-col gap-2 p-4 rounded-xl border ${t.bg}`}
            >
              <div className={`flex items-center gap-2 ${t.color}`}>
                {t.icon}
                <span className="text-xs font-bold uppercase tracking-wide">
                  {t.label}
                </span>
              </div>
              <p className={`text-sm font-semibold ${t.color}`}>{t.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionViewComponent;