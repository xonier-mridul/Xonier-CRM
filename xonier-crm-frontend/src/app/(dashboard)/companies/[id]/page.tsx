"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  IoArrowBack,
  IoGlobeOutline,
  IoLocationOutline,
  IoTimeOutline,
  IoBusinessOutline,
  IoPeopleOutline,
  IoDocumentTextOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoEllipsisVertical,
  IoRefreshOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoShieldCheckmarkOutline,
  IoCardOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoCallOutline,
  IoMailOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import { MdOutlineVerified } from "react-icons/md";
import CompanyService from "@/src/services/company.service";
import { Company } from "@/src/types/company/company.types";
import { COMPANY_STATUS } from "@/src/constants/enum";
import extractErrorMessages from "@/src/app/utils/error.utils";
import Skeleton from "react-loading-skeleton";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useTranslation } from "react-i18next";
import { FaBuildingUser } from "react-icons/fa6";

const statusConfig: Record<
  string,
  { label: string; color: string; dot: string; bg: string }
> = {
  [COMPANY_STATUS.ACTIVE]: {
    label: "Active",
    color: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  },
  [COMPANY_STATUS.PENDING_VERIFICATION]: {
    label: "Pending Verification",
    color: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  [COMPANY_STATUS.SUSPENDED]: {
    label: "Suspended",
    color: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  },
  [COMPANY_STATUS.INACTIVE]: {
    label: "Inactive",
    color: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  [COMPANY_STATUS.DELETED]: {
    label: "Deleted",
    color: "text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600",
  },
};

const sizeLabel: Record<string, string> = {
  "50": "< 50 employees",
  "50-100": "50 – 100 employees",
  "100-200": "100 – 200 employees",
  "200-300": "200 – 300 employees",
  "300-400": "300 – 400 employees",
  "400-500": "400 – 500 employees",
  "500-1000": "500 – 1,000 employees",
  "1000-2000": "1,000 – 2,000 employees",
  "2000-5000": "2,000 – 5,000 employees",
};

function formatDate(dateStr: string | null | undefined, withTime = false) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (withTime) {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-gray-700/60 last:border-0">
      <div className="mt-0.5 text-slate-400 dark:text-gray-500 flex-shrink-0 text-base">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-slate-400 dark:text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-sm text-slate-800 dark:text-gray-100 break-all ${mono ? "font-mono" : "font-medium"}`}
        >
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500 dark:text-gray-400 text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-5 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
        {label}
      </span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400 dark:text-gray-500">{sub}</span>}
    </div>
  );
}

export default function CompanyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);



  


  const fetchCompany = useCallback(async () => {
    setIsLoading(true);
    if(!id) return;
    try {
        const companyId = id as string;
        let res;

        try {
            res = await CompanyService.getById(companyId);
          } catch (error) {
            if (auth?.isAdmin) {
              res = await CompanyService.getDeletedCompanyById(companyId);
            } else {
              throw error;
            }
          }
      setCompany(res.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      } else {
        toast.error("Failed to load company");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);




  useEffect(() => { 
    fetchCompany();
  }, [fetchCompany]);

  const handleStatusChange = async (status: COMPANY_STATUS) => {
    if (!company) return;
    setActionLoading(true);
    setMenuOpen(false);
    try {
      await CompanyService.updateStatus(company.companyId, status);
      toast.success(`Status updated to ${statusConfig[status]?.label ?? status}`);
      fetchCompany();
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    setActionLoading(true);
    setMenuOpen(false);
    try {
      await CompanyService.softDelete(company.companyId);
      toast.success("Company deleted");
      router.push("/companies");
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!company) return;
    setActionLoading(true);
    setMenuOpen(false);
    try {
      await CompanyService.restore(company.companyId);
      toast.success("Company restored");
      fetchCompany();
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const status = company ? statusConfig[company.status] : null;
  const admin = company?.primary_admin as any;
  const sub = company?.subscription as any;
  const isDeleted = company?.status === COMPANY_STATUS.DELETED;

  return (
    <div className="mt-10 min-h-screen p-6 bg-slate-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500">
         <span className="text-xl"><FaBuildingUser /></span>
          <span>{t("company")}</span>
          <span>/</span>
          <span className="text-slate-500 dark:text-gray-300 font-medium truncate max-w-xs">
            {isLoading ? <Skeleton width={120} /> : company?.companyName}
          </span>
        </div>

        {/* Hero Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton height={32} width={240} borderRadius={8} />
              <Skeleton height={20} width={160} borderRadius={8} />
              <Skeleton height={28} width={140} borderRadius={8} />
            </div>
          ) : company ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {company.companyName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {company.companyName}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-700 px-2.5 py-1 rounded-md">
                      {company.companyId}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">·</span>
                    <span className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                      {company.industry}
                    </span>
                    {company.country && (
                      <>
                        <span className="text-xs text-slate-400 dark:text-gray-500">·</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase">
                          {company.country}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {status && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${status.bg} ${status.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot} animate-pulse`} />
                        {status.label}
                      </span>
                    )}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <IoGlobeOutline />
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 relative">
                <Link
                  href={`/companies/update/${company.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <IoCreateOutline className="text-base" />
                  {t("edit")}
                </Link>

                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  disabled={actionLoading}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <IoEllipsisVertical />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 z-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl py-1.5 min-w-[200px]">
                    {!isDeleted && company.status !== COMPANY_STATUS.ACTIVE && (
                      <button
                        onClick={() => handleStatusChange(COMPANY_STATUS.ACTIVE)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <IoCheckmarkCircle />
                        {t("set_active")}
                      </button>
                    )}
                    {!isDeleted && company.status !== COMPANY_STATUS.SUSPENDED && (
                      <button
                        onClick={() => handleStatusChange(COMPANY_STATUS.SUSPENDED)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <IoCloseCircle />
                        {t("suspend")}
                      </button>
                    )}
                    {!isDeleted && company.status !== COMPANY_STATUS.INACTIVE && (
                      <button
                        onClick={() => handleStatusChange(COMPANY_STATUS.INACTIVE)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-500 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <IoAlertCircleOutline />
                        {t("set_inactive")}
                      </button>
                    )}
                    <div className="my-1 border-t border-slate-100 dark:border-gray-700" />
                    {isDeleted ? (
                      <button
                        onClick={handleRestore}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-500 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <IoRefreshOutline />
                        {t("restore_company")}
                      </button>
                    ) : (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <IoTrashOutline />
                        {t("delete_company")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Stats Row */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-5">
                <Skeleton height={16} width={80} borderRadius={6} />
                <Skeleton height={32} width={60} borderRadius={6} className="mt-2" />
              </div>
            ))}
          </div>
        ) : company ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t("subscriptions")}
              value={company.subscriptionCount}
              sub="Total subscriptions"
              color="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label={t("user_limit")}
              value={company.userLimit ?? "∞"}
              sub="Max seats allowed"
              color="text-cyan-600 dark:text-cyan-400"
            />
            <StatCard
              label={t("plan_price")}
              value={sub ? `$${sub.finalPrice}` : "—"}
              sub={sub ? `Per ${sub.billingCycle} cycle` : "No subscription"}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label={t("registered")}
              value={formatDate(company.createdAt)}
              sub={company.timezone ?? "UTC"}
              color="text-slate-700 dark:text-gray-200"
            />
          </div>
        ) : null}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Company Info */}
            <Card title={t("company_details")} icon={<IoBusinessOutline />}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="py-3 border-b border-slate-100 dark:border-gray-700/60 last:border-0">
                    <Skeleton height={40} borderRadius={8} />
                  </div>
                ))
              ) : company ? (
                <>
                  <InfoRow
                    icon={<IoBusinessOutline />}
                    label={t("industry_2")}
                    value={<span className="capitalize">{company.industry}</span>}
                  />
                  <InfoRow
                    icon={<IoPeopleOutline />}
                    label={t("company_size")}
                    value={
                      company.companySize
                        ? sizeLabel[company.companySize] ?? company.companySize
                        : "—"
                    }
                  />
                  <InfoRow
                    icon={<IoLocationOutline />}
                    label={t("country")}
                    value={
                      company.country ? (
                        <span className="uppercase font-semibold">{company.country}</span>
                      ) : "—"
                    }
                  />
                  <InfoRow
                    icon={<IoTimeOutline />}
                    label={t("timezone")}
                    value={company.timezone}
                  />
                  <InfoRow
                    icon={<IoGlobeOutline />}
                    label={t("website")}
                    value={
                      company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {company.website}
                        </a>
                      ) : "—"
                    }
                  />
                  {company.subDomain && (
                    <InfoRow
                      icon={<IoGlobeOutline />}
                      label={t("subdomain")}
                      value={company.subDomain}
                      mono
                    />
                  )}
                </>
              ) : null}
            </Card>

            {/* Legal Info */}
            <Card title={t("legal_registration")} icon={<IoDocumentTextOutline />}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="py-3 border-b border-slate-100 dark:border-gray-700/60 last:border-0">
                    <Skeleton height={40} borderRadius={8} />
                  </div>
                ))
              ) : company ? (
                <>
                  <InfoRow
                    icon={<IoDocumentTextOutline />}
                    label={t("registration_number")}
                    value={company.registrationNumber}
                    mono
                  />
                  <InfoRow
                    icon={<IoDocumentTextOutline />}
                    label={t("trade_number")}
                    value={company.tradeNumber}
                    mono
                  />
                  <InfoRow
                    icon={<IoDocumentTextOutline />}
                    label={t("slug")}
                    value={company.slug}
                    mono
                  />
                </>
              ) : null}
            </Card>

            {/* Subscription */}
            <Card title={t("subscription")} icon={<IoCardOutline />}>
              {isLoading ? (
                <div className="py-4">
                  <Skeleton height={120} borderRadius={12} />
                </div>
              ) : sub ? (
                <div className="py-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <IoCardOutline className="text-blue-600 dark:text-blue-400 text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">
                          {sub.billingCycle} {t("plan")}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                          {sub.subscriptionId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        ${sub.finalPrice}
                        {sub.discountAmount > 0 && (
                          <span className="text-xs font-normal text-emerald-500 ml-1">
                            (-${sub.discountAmount} {t("off")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">
                        {t("base")}{sub.basePrice}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">
                        {t("trial_period")}
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                        {formatDate(sub.trialStartDate)}
                      </p>
                      <p className="text-xs text-slate-400">→ {formatDate(sub.trialEndDate)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wide font-medium mb-1">
                        {t("active_period")}
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                        {formatDate(sub.startSubscriptionDate)}
                      </p>
                      <p className="text-xs text-slate-400">→ {formatDate(sub.endSubscriptionDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
                        sub.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {sub.status}
                    </span>
                    {sub.cancelledAt && (
                      <span className="text-xs text-red-500">
                        {t("cancelled")} {formatDate(sub.cancelledAt)}
                        {sub.cancelReason && ` · ${sub.cancelReason}`}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <IoCardOutline className="text-3xl text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-gray-500">{t("no_subscription_found")}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">

            {/* Primary Admin */}
            <Card title={t("primary_admin")} icon={<IoPersonOutline />}>
              {isLoading ? (
                <div className="py-4">
                  <Skeleton height={100} borderRadius={12} />
                </div>
              ) : admin ? (
                <div className="py-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-lg font-bold text-white">
                        {admin.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/users/${admin.id}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {admin.firstName} {admin.lastName}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${admin.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`}
                        />
                        <span className="text-xs text-slate-400 dark:text-gray-500 capitalize">
                          {admin.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {admin.isEmailVerified ? (
                        <MdOutlineVerified className="text-emerald-500 text-base flex-shrink-0" />
                      ) : (
                        <IoAlertCircleOutline className="text-amber-500 text-base flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {admin.isEmailVerified ? "Email verified" : "Email not verified"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <IoShieldCheckmarkOutline className="text-slate-400 text-base flex-shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                        {admin.isActive ? "Account active" : "Account inactive"}
                      </span>
                    </div>

                    {admin.lastLogin && (
                      <div className="flex items-center gap-2">
                        <IoCalendarOutline className="text-slate-400 text-base flex-shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-gray-400">
                          {t("last_login_2")} {formatDate(admin.lastLogin, true)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/users/${admin.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t("view_profile")}
                  </Link>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <IoPersonOutline className="text-3xl text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-gray-500">{t("no_admin_assigned")}</p>
                </div>
              )}
            </Card>

            {/* Metadata */}
            <Card title={t("metadata")} icon={<IoCalendarOutline />}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="py-3 border-b border-slate-100 dark:border-gray-700/60 last:border-0">
                    <Skeleton height={36} borderRadius={8} />
                  </div>
                ))
              ) : company ? (
                <>
                  <InfoRow
                    icon={<IoCalendarOutline />}
                    label={t("created_at")}
                    value={formatDate(company.createdAt, true)}
                  />
                  <InfoRow
                    icon={<IoCalendarOutline />}
                    label={t("updated_at")}
                    value={formatDate(company.updatedAt, true)}
                  />
                  {company.deletedAt && (
                    <InfoRow
                      icon={<IoTrashOutline />}
                      label={t("deleted_at")}
                      value={
                        <span className="text-red-500">{formatDate(company.deletedAt, true)}</span>
                      }
                    />
                  )}
                </>
              ) : null}
            </Card>

            {/* Quick Actions */}
            {!isLoading && company && (
              <Card title={t("quick_actions")} icon={<IoShieldCheckmarkOutline />}>
                <div className="py-3 flex flex-col gap-2">
                  <Link
                    href={`/companies/${company.id}/users`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                      <IoPeopleOutline className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white">
                      {t("manage_users")}
                    </span>
                  </Link>

                  <Link
                    href={`/subscriptions?company=${company.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <IoCardOutline className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white">
                      {t("view_subscriptions")}
                    </span>
                  </Link>

                  <Link
                    href={`/companies/update/${company.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <IoCreateOutline className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white">
                      {t("edit_company")}
                    </span>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}