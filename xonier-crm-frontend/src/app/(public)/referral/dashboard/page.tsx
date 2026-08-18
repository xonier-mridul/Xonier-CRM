"use client";

import { useTranslation } from "react-i18next";
import { Panel } from "@/src/types/referral/referral.type";
import BarChart from "@/src/components/referral/barChart/page";
import { adminOverviewMetrics, liabilityChart, pendingApproval } from "@/src/constants/referral";
import { Card, Eyebrow, GhostButton, MetricCard, MetricsGrid } from "../shared/Primitives";

export default function AdminDashboard({ onNavigate }: { onNavigate: (panel: Panel) => void }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto mt-10">
      <Eyebrow>{t("common.overview")}</Eyebrow>
      <h2 className="mb-4.5 text-base text-slate-600">{t("admin.dashboard.title")}</h2>

      <MetricsGrid>
        <MetricCard label={t("admin.dashboard.metric.activePartners")} value={String(adminOverviewMetrics.activePartners)} />
        <MetricCard label={t("admin.dashboard.metric.referredClients")} value={String(adminOverviewMetrics.referredClients)} />
        <MetricCard label={t("admin.dashboard.metric.mrrUnderReferral")} value={adminOverviewMetrics.mrrUnderReferral} />
        <MetricCard label={t("admin.dashboard.metric.accruedLiability")} value={adminOverviewMetrics.accruedLiability} />
      </MetricsGrid>

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
          {t("admin.dashboard.pendingApprovalSummary", { count: pendingApproval.count, total: pendingApproval.total })}
        </p>
      </Card>
    </div>
  );
}
