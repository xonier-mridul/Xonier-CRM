"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Eyebrow,
  GhostButton,
  MetricCard,
  MetricsGrid,
} from "../shared/Primitives";
import BarChart from "../shared/BarChart";
import { Panel } from "@/src/types/referral/referral.type";
import {
  adminOverviewMetrics,
  liabilityChart,
  pendingApproval,
} from "@/src/constants/referral";
import {
  Users,
  Building2,
  IndianRupee,
  Wallet,
  AlertTriangle,
  Clock,
  Trophy,
  ArrowRight,
  FileWarning,
  ShieldCheck,
  UserCheck,
  Settings2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Supplementary admin-goal data — move to @/src/constants/referral    */
/* once wired to real APIs.                                            */
/* ------------------------------------------------------------------ */

const slaCompliance = {
  percentage: 92,
  target: 90,
  breached: 4,
};

const disputeHealth = {
  open: 3,
  overdue30Days: 1,
};

const topPartners = [
  { name: "Jeevant Global Solutions", leads: 24, conversion: 42, revenue: "₹18.4L" },
  { name: "NorthStar Consulting", leads: 19, conversion: 37, revenue: "₹12.1L" },
  { name: "Vertex Channel Partners", leads: 15, conversion: 33, revenue: "₹8.6L" },
];

// Contract & Compliance — doc §5.10
const contractAlerts = [
  { partner: "Jeevant Global Solutions", type: "renewal", daysLeft: 21 },
  { partner: "NorthStar Consulting", type: "termination_notice", daysLeft: 5 },
  { partner: "Vertex Channel Partners", type: "expired_kyc", daysLeft: -3 },
];

// Cohort / churn snapshot — doc §5.8
const cohortSnapshot = {
  avgLtv: "₹9.8L",
  churnRate: 6.2,
  churnTrend: "down" as "up" | "down",
  bestCohortPartner: "Jeevant Global Solutions",
};

// Pending admin onboarding approvals — doc §5.1 + Table 4.1 (Partner Manager)
const pendingOnboarding = 2;

const TABS = ["overview", "compliance", "performance"] as const;
type Tab = (typeof TABS)[number];

export default function AdminDashboard({ onNavigate }: { onNavigate: (panel: Panel) => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");

  const slaOnTarget = slaCompliance.percentage >= slaCompliance.target;
  const disputesHealthy = disputeHealth.overdue30Days === 0;

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{t("common.overview")}</Eyebrow>
          <h2 className="text-base text-slate-600">{t("admin.dashboard.title")}</h2>
        </div>

        {/* Role-based quick actions — Table 4.1 */}
        <div className="flex flex-wrap gap-2">
          <QuickAction
            icon={<UserCheck size={13} />}
            label={t("admin.dashboard.approveOnboarding", { defaultValue: "Onboarding" })}
            badge={pendingOnboarding}
            onClick={() => onNavigate("a-queue")}
          />
          <QuickAction
            icon={<AlertTriangle size={13} />}
            label={t("admin.dashboard.resolveDisputes", { defaultValue: "Disputes" })}
            badge={disputeHealth.open}
            tone={disputesHealthy ? "neutral" : "warning"}
            onClick={() => onNavigate("a-queue")}
          />
          <QuickAction
            icon={<Settings2 size={13} />}
            label={t("admin.dashboard.commissionRules", { defaultValue: "Commission Rules" })}
            onClick={() => onNavigate("a-queue")}
          />
        </div>
      </div>

      <MetricsGrid>
        <MetricCard
          label={t("admin.dashboard.metric.activePartners")}
          value={String(adminOverviewMetrics.activePartners)}
          icon={<Users size={16} />}
        />
        <MetricCard
          label={t("admin.dashboard.metric.referredClients")}
          value={String(adminOverviewMetrics.referredClients)}
          icon={<Building2 size={16} />}
        />
        <MetricCard
          label={t("admin.dashboard.metric.mrrUnderReferral")}
          value={adminOverviewMetrics.mrrUnderReferral}
          icon={<IndianRupee size={16} />}
        />
        <MetricCard
          label={t("admin.dashboard.metric.accruedLiability")}
          value={adminOverviewMetrics.accruedLiability}
          icon={<Wallet size={16} />}
        />
      </MetricsGrid>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 border-b border-slate-200">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`relative px-3 py-2 text-[13px] font-medium capitalize transition ${
              tab === tb ? "text-slate-800" : "text-text-2 hover:text-slate-600"
            }`}
          >
            {t(`admin.dashboard.tab.${tb}`, { defaultValue: tb })}
            {tab === tb && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-teal" />}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          {/* Program health */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                    <Clock size={15} className={slaOnTarget ? "text-green-600" : "text-amber-600"} />
                    {t("admin.dashboard.slaTitle", { defaultValue: "Lead Response SLA" })}
                  </h3>
                  <p className="text-[12.5px] text-text-2">
                    {t("admin.dashboard.slaDesc", { defaultValue: "% of leads contacted within 48 hours" })}
                  </p>
                </div>
                <StatusPill ok={slaOnTarget} okLabel="On target" badLabel="Below target" t={t} />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[12px] text-text-2">
                  <span>{slaCompliance.percentage}%</span>
                  <span>
                    {t("admin.dashboard.target", { defaultValue: "Target" })}: {slaCompliance.target}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${slaOnTarget ? "bg-green-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(slaCompliance.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {slaCompliance.breached > 0 && (
                <p className="mt-2 flex items-center gap-1 text-[12px] text-amber-700">
                  <AlertTriangle size={12} />
                  {t("admin.dashboard.slaBreach", {
                    defaultValue: `${slaCompliance.breached} lead(s) past SLA — needs attention`,
                    count: slaCompliance.breached,
                  })}
                </p>
              )}
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                    <AlertTriangle size={15} className={disputesHealthy ? "text-green-600" : "text-red-600"} />
                    {t("admin.dashboard.disputesTitle", { defaultValue: "Commission Disputes" })}
                  </h3>
                  <p className="text-[12.5px] text-text-2">
                    {t("admin.dashboard.disputesDesc", {
                      defaultValue: "Zero unresolved disputes older than 30 days is the goal",
                    })}
                  </p>
                </div>
                <StatusPill ok={disputesHealthy} okLabel="Healthy" badLabel="Action needed" t={t} />
              </div>

              <div className="mt-3 flex items-center gap-6">
                <div>
                  <p className="text-xl font-semibold text-text-1">{disputeHealth.open}</p>
                  <p className="text-[11.5px] text-text-2">
                    {t("admin.dashboard.openDisputes", { defaultValue: "Open disputes" })}
                  </p>
                </div>
                <div>
                  <p className={`text-xl font-semibold ${disputesHealthy ? "text-text-1" : "text-red-600"}`}>
                    {disputeHealth.overdue30Days}
                  </p>
                  <p className="text-[11.5px] text-text-2">
                    {t("admin.dashboard.overdue", { defaultValue: "Overdue (30+ days)" })}
                  </p>
                </div>
              </div>

              {!disputesHealthy && (
                <GhostButton onClick={() => onNavigate("a-queue")}>
                  <span className="mt-3 inline-flex items-center">
                    {t("admin.dashboard.resolveNow", { defaultValue: "Resolve now" })}
                    <ArrowRight size={13} className="ml-1" />
                  </span>
                </GhostButton>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-3.5 text-base">{t("admin.dashboard.liabilityChartTitle")}</h2>
            <BarChart
              labels={liabilityChart.labels}
              series={[
                { label: t("badge.paid"), data: liabilityChart.paid, color: "#5DCAA5" },
                { label: t("badge.accrued"), data: liabilityChart.accrued, color: "#E9B673" },
              ]}
            />
          </Card>

          <Card>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-base">{t("admin.dashboard.pendingApproval")}</h2>
              <GhostButton onClick={() => onNavigate("a-queue")}>{t("common.review")} &rarr;</GhostButton>
            </div>
            <p className="m-0 text-[13px] text-text-2">
              {t("admin.dashboard.pendingApprovalSummary", {
                count: pendingApproval.count,
                total: pendingApproval.total,
              })}
            </p>
          </Card>
        </div>
      )}

      {tab === "compliance" && (
        <div className="space-y-5">
          {/* Contract & Compliance tracking — doc §5.10 */}
          <Card>
            <h2 className="mb-1 flex items-center gap-1.5 text-base">
              <ShieldCheck size={16} className="text-teal" />
              {t("admin.dashboard.contractsTitle", { defaultValue: "Contract & Compliance Alerts" })}
            </h2>
            <p className="mb-3.5 text-[12.5px] text-text-2">
              {t("admin.dashboard.contractsDesc", {
                defaultValue: "Renewals, termination notices, and expired KYC documents needing attention",
              })}
            </p>

            {contractAlerts.length === 0 ? (
              <p className="text-[13px] text-text-2">
                {t("admin.dashboard.noAlerts", { defaultValue: "No compliance items need attention." })}
              </p>
            ) : (
              <div className="space-y-2">
                {contractAlerts.map((alert, i) => {
                  const overdue = alert.daysLeft < 0;
                  const urgent = alert.daysLeft >= 0 && alert.daysLeft <= 7;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] ${
                        overdue
                          ? "border-red-200 bg-red-50"
                          : urgent
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileWarning
                          size={15}
                          className={overdue ? "text-red-600" : urgent ? "text-amber-600" : "text-slate-400"}
                        />
                        <div>
                          <p className="font-medium text-text-1">{alert.partner}</p>
                          <p className="text-[11.5px] capitalize text-text-2">
                            {t(`admin.dashboard.alertType.${alert.type}`, {
                              defaultValue: alert.type.replace(/_/g, " "),
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          overdue
                            ? "bg-red-100 text-red-700"
                            : urgent
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {overdue
                          ? t("admin.dashboard.overdueBy", {
                              defaultValue: `${Math.abs(alert.daysLeft)}d overdue`,
                            })
                          : t("admin.dashboard.dueIn", {
                              defaultValue: `Due in ${alert.daysLeft}d`,
                            })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "performance" && (
        <div className="space-y-5">
          {/* Partner leaderboard — doc §5.8 */}
          <Card>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base">
                <Trophy size={16} className="text-amber-500" />
                {t("admin.dashboard.leaderboardTitle", { defaultValue: "Top Performing Partners" })}
              </h2>
              <GhostButton onClick={() => onNavigate("a-queue")}>
                {t("admin.dashboard.viewAll", { defaultValue: "View all" })} &rarr;
              </GhostButton>
            </div>
            <div className="space-y-2">
              {topPartners.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-[13px]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {i + 1}
                    </span>
                    <span className="font-medium text-text-1">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-text-2">
                    <span>{p.leads} {t("admin.dashboard.leads", { defaultValue: "leads" })}</span>
                    <span>{p.conversion}% {t("admin.dashboard.conv", { defaultValue: "conv." })}</span>
                    <span className="font-semibold text-text-1">{p.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cohort / LTV / churn — doc §5.8 */}
          <Card>
            <h2 className="mb-3.5 text-base">
              {t("admin.dashboard.cohortTitle", { defaultValue: "Cohort Performance" })}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11.5px] text-text-2">
                  {t("admin.dashboard.avgLtv", { defaultValue: "Avg. Customer LTV" })}
                </p>
                <p className="mt-1 text-lg font-semibold text-text-1">{cohortSnapshot.avgLtv}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11.5px] text-text-2">
                  {t("admin.dashboard.churnRate", { defaultValue: "Churn Rate" })}
                </p>
                <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-text-1">
                  {cohortSnapshot.churnRate}%
                  {cohortSnapshot.churnTrend === "down" ? (
                    <TrendingDown size={15} className="text-green-600" />
                  ) : (
                    <TrendingUp size={15} className="text-red-600" />
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11.5px] text-text-2">
                  {t("admin.dashboard.bestCohort", { defaultValue: "Best Retaining Cohort" })}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-text-1">
                  {cohortSnapshot.bestCohortPartner}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                     */
/* ------------------------------------------------------------------ */

function StatusPill({
  ok,
  okLabel,
  badLabel,
  t,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
  t: (key: string, opts?: any) => string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {ok
        ? t(`admin.dashboard.${okLabel.toLowerCase().replace(/\s/g, "")}`, { defaultValue: okLabel })
        : t(`admin.dashboard.${badLabel.toLowerCase().replace(/\s/g, "")}`, { defaultValue: badLabel })}
    </span>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  tone = "neutral",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  tone?: "neutral" | "warning";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
    >
      {icon}
      {label}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
            tone === "warning" ? "bg-amber-500" : "bg-slate-500"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}