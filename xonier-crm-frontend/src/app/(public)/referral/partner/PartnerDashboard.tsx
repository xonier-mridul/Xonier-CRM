"use client";

import { commissionRules, dashboardClients, dashForecastChart, partnerDashboardMetrics } from "@/src/constants/referral";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, GhostButton, MetricCard, MetricsGrid, RowBetween } from "../shared/Primitives";
import Segmented from "../shared/Segmented";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import AvatarSm from "../shared/AvatarSm";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import Badge from "../shared/Badge";
import LineChart from "../shared/LineChart";
import { Panel } from "@/src/types/referral/referral.type";

// Commission structure is per deal type (PRD Table 2.1), not per client
// user-count tier. Bar heights are scaled to each rule's percentage.
const barColors = ["#3B564C", "#4C7364", "#5DCAA5", "#DEEFE8", "#0F6E56"];

export default function PartnerDashboard({ onNavigate }: { onNavigate: (panel: Panel) => void }) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <div className="mb-6 flex flex-col items-start gap-6 overflow-hidden rounded-2xl bg-ink px-6 py-6 text-[#EFEDE3] sm:flex-row sm:items-center sm:justify-between bg-cyan-600">
        <div >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
            {t("partner.dashboard.hero.eyebrow")}
          </p>
          <h1 className="max-w-[360px] font-display text-[28px] leading-tight text-[#F7F5EC]">
            {t("partner.dashboard.hero.title")}
          </h1>
          <p className="mt-2.5 max-w-[340px] text-[13px] leading-relaxed text-cyan-200">
            {t("partner.dashboard.hero.subtitle")}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-end gap-2.5">
        {commissionRules.map((rule, i) => (
          <div key={rule.id} className="flex flex-col items-center gap-2">
            <span className="font-mono text-xs text-[#DEEFE8]">
              {rule.percentage}%
            </span>

            <div
              className="w-11 rounded-t-md"
              style={{
                height: rule.percentage * 3,
                background: barColors[i % barColors.length],
              }}
            />

            <span className="flex h-8 max-w-[70px] items-start justify-center text-center text-[10px] leading-tight text-white/60">
              {t(`${rule.dealType}`)}
            </span>
          </div>
        ))}
         

        </div>
      </div>

      <RowBetween>
        <div>
          <Eyebrow>{t("common.overview")}</Eyebrow>
          <h2 className="text-base text-slate-600">{t("partner.dashboard.thisMonth")}</h2>
        </div>
        {/* <Segmented options={[t("common.thisMonth"), t("common.ytd"), t("common.lifetime")]} /> */}
      </RowBetween>

      <MetricsGrid>
        <MetricCard label={t("partner.dashboard.metric.activeClients")} value={String(partnerDashboardMetrics.activeClients)} delta={t("partner.dashboard.metric.activeClientsDelta", { count: partnerDashboardMetrics.activeClientsDelta })} />
        <MetricCard label={t("partner.dashboard.metric.referredMrr")} value={partnerDashboardMetrics.referredMrr} delta={partnerDashboardMetrics.referredMrrDelta} />
        <MetricCard label={t("partner.dashboard.metric.commissionMonth")} value={partnerDashboardMetrics.commissionMonth} delta={partnerDashboardMetrics.commissionMonthDelta} />
        <MetricCard label={t("partner.dashboard.metric.lifetimeEarned")} value={partnerDashboardMetrics.lifetimeEarned} delta={t("partner.dashboard.metric.since2023")} />
      </MetricsGrid>

      <Card>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-base ">{t("partner.dashboard.referredClients")}</h2>
          {/* <GhostButton onClick={() => onNavigate("p-clients")}>{t("common.viewAll")} </GhostButton> */}
        </div>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.client")}</Th>
              <Th num>{t("table.activeUsers")}</Th>
              <Th num>{t("table.mrr")}</Th>
              <Th>{t("table.lastDealType")}</Th>
              <Th>{t("table.status")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {dashboardClients.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <AvatarSm initials={c.initials} />
                  {c.name}
                </Td>
                <Td num>{c.activeUsers}</Td>
                <Td num>{formatCurrency(c.mrr ?? 0)}</Td>
                <Td>{c.lastDealType ? t(`${c.lastDealType}`) : "—"}</Td>
                <Td>
                  <Badge tone={c.status}>{t(`badge.${c.status}`)}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-base">{t("partner.dashboard.revenueForecast")}</h2>
          <button 
          className="text-xs py-1.5 px-3 border border-slate-300 rounded-xl text-slate-500 hover:text-white hover:bg-cyan-500"
          onClick={() => onNavigate("p-forecast") }>{t("partner.dashboard.openForecast")} </button>
        </div>
        <LineChart
          height={170}
          labels={dashForecastChart.labels}
          series={[{ data: dashForecastChart.data, color: "#0F6E56", fillArea: true }]}
        />
      </Card>
    </div>
  );
}
