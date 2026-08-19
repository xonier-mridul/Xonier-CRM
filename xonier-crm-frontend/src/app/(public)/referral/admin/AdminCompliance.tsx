"use client";

import { useMemo, useState } from "react";
import { Agreement } from "@/src/types/referral/referral.type";
import {
  AlertTriangle,
  FileWarning,
  Download,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Bell,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Local extension — KYC status tracking per doc §5.1 & §5.10         */
/* ------------------------------------------------------------------ */

type ComplianceStatus = "active" | "expiring_soon" | "expired" | "termination_notice" | "kyc_pending";

type AgreementExt = Agreement & {
  partnerName?: string;
  kycStatus?: "verified" | "pending" | "expired";
  lastKycUpdate?: string;
};

/* ------------------------------------------------------------------ */
/* Mock data — replace with API data once wired                        */
/* ------------------------------------------------------------------ */
const MOCK_AGREEMENTS: AgreementExt[] = [
  {
    id: "1",
    partnerId: "1",
    partnerName: "Jeevant Global Solutions",
    startDate: "2024-01-10",
    endDate: "2027-01-09",
    noticePeriodDays: 90,
    terminationTriggered: false,
    kycStatus: "verified",
    lastKycUpdate: "2024-01-10",
    documentUrl: "/documents/jeevant-global-solutions.pdf",
  },
  {
    id: "2",
    partnerId: "2",
    partnerName: "NorthStar Consulting",
    startDate: "2025-03-15",
    endDate: "2026-09-14",
    noticePeriodDays: 60,
    terminationTriggered: false,
    kycStatus: "verified",
    lastKycUpdate: "2025-03-15",
    documentUrl: "/documents/northstar-consulting.pdf",
  },
  {
    id: "3",
    partnerId: "3",
    partnerName: "Vertex Channel Partners",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    noticePeriodDays: 30,
    terminationTriggered: false,
    kycStatus: "pending",
    lastKycUpdate: "2025-06-01",
    documentUrl: "/documents/vertex-channel-partners.pdf",
  },
  {
    id: "4",
    partnerId: "4",
    partnerName: "BluePeak Advisors",
    startDate: "2024-11-20",
    endDate: "2025-11-19",
    noticePeriodDays: 60,
    terminationTriggered: true,
    kycStatus: "verified",
    lastKycUpdate: "2024-11-20",
    documentUrl: "/documents/bluepeak-advisors.pdf",
  },
  {
    id: "5",
    partnerId: "5",
    partnerName: "Orbit HR Consultants",
    startDate: "2023-08-10",
    endDate: "2025-08-09",
    noticePeriodDays: 90,
    terminationTriggered: false,
    kycStatus: "expired",
    lastKycUpdate: "2023-08-10",
    documentUrl: "/documents/orbit-hr-consultants.pdf",
  },
];

function getDaysLeft(endDateStr: string) {
  const today = new Date();
  const end = new Date(endDateStr);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function getComplianceStatus(a: AgreementExt): ComplianceStatus {
  if (a.terminationTriggered) return "termination_notice";
  if (a.kycStatus === "expired" || a.kycStatus === "pending") return "kyc_pending";
  const daysLeft = getDaysLeft(a.endDate);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 60) return "expiring_soon";
  return "active";
}

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle2 size={12} />,
  },
  expiring_soon: {
    label: "Expiring Soon",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock size={12} />,
  },
  expired: { label: "Expired", badge: "bg-red-100 text-red-700", icon: <XCircle size={12} /> },
  termination_notice: {
    label: "Termination Notice Active",
    badge: "bg-red-100 text-red-700",
    icon: <AlertTriangle size={12} />,
  },
  kyc_pending: {
    label: "KYC Issue",
    badge: "bg-orange-100 text-orange-700",
    icon: <FileWarning size={12} />,
  },
};

const STATUS_TABS: (ComplianceStatus | "All")[] = [
  "All",
  "active",
  "expiring_soon",
  "expired",
  "termination_notice",
  "kyc_pending",
];

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function AdminCompliance() {
  const [agreements] = useState<AgreementExt[]>(MOCK_AGREEMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "All">("All");

  /* ---------------------------- Derived ---------------------------- */

  const today = new Date();

  const summary = useMemo(() => {
    const expiringSoon = agreements.filter((a) => {
      const daysLeft = getDaysLeft(a.endDate);
      return daysLeft <= 60 && daysLeft > 0;
    }).length;
    const terminationActive = agreements.filter((a) => a.terminationTriggered).length;
    const kycIssues = agreements.filter(
      (a) => a.kycStatus === "pending" || a.kycStatus === "expired"
    ).length;
    const expired = agreements.filter((a) => getDaysLeft(a.endDate) < 0).length;
    return { expiringSoon, terminationActive, kycIssues, expired };
  }, [agreements]);

  const filteredAgreements = useMemo(() => {
    return agreements.filter((a) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (a.partnerName ?? a.partnerId).toLowerCase().includes(q);
      const status = getComplianceStatus(a);
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agreements, search, statusFilter]);

  const upcomingRenewals = useMemo(() => {
    return agreements
      .filter((a) => {
        const daysLeft = getDaysLeft(a.endDate);
        return daysLeft > 0 && daysLeft <= 90 && !a.terminationTriggered;
      })
      .sort((a, b) => getDaysLeft(a.endDate) - getDaysLeft(b.endDate))
      .slice(0, 5);
  }, [agreements]);

  /* ---------------------------- Handlers ---------------------------- */

  function handleExportCsv() {
    const header = [
      "Partner",
      "Start Date",
      "End Date",
      "Days Left",
      "Notice Period",
      "KYC Status",
      "Status",
    ];
    const rows = filteredAgreements.map((a) => [
      a.partnerName ?? a.partnerId,
      a.startDate,
      a.endDate,
      getDaysLeft(a.endDate),
      `${a.noticePeriodDays} days`,
      a.kycStatus ?? "—",
      STATUS_CONFIG[getComplianceStatus(a)].label,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Contract & Compliance</h1>
          <p className="text-sm text-text-2">
            MOU tracking, renewal reminders, and termination flags
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm hover:bg-surface-hover"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* Summary strip — doc §5.10 compliance health */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Expiring Soon (60d)"
          value={summary.expiringSoon}
          tone={summary.expiringSoon > 0 ? "amber" : undefined}
          icon={<Clock size={16} />}
        />
        <SummaryTile
          label="Termination Notices"
          value={summary.terminationActive}
          tone={summary.terminationActive > 0 ? "red" : undefined}
          icon={<AlertTriangle size={16} />}
        />
        <SummaryTile
          label="KYC Issues"
          value={summary.kycIssues}
          tone={summary.kycIssues > 0 ? "orange" : undefined}
          icon={<FileWarning size={16} />}
        />
        <SummaryTile
          label="Expired"
          value={summary.expired}
          tone={summary.expired > 0 ? "red" : undefined}
          icon={<XCircle size={16} />}
        />
      </div>

      {/* Alert banner for critical items */}
      {(summary.expiringSoon > 0 ||
        summary.terminationActive > 0 ||
        summary.kycIssues > 0 ||
        summary.expired > 0) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <p className="font-medium">Action Required</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              {summary.expiringSoon > 0 && (
                <li>{summary.expiringSoon} agreement(s) expiring within 60 days</li>
              )}
              {summary.terminationActive > 0 && (
                <li>{summary.terminationActive} termination notice(s) in effect</li>
              )}
              {summary.kycIssues > 0 && <li>{summary.kycIssues} partner(s) with KYC issues</li>}
              {summary.expired > 0 && <li>{summary.expired} expired agreement(s)</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Upcoming renewals widget — doc §5.10 renewal reminders */}
      {upcomingRenewals.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Bell size={16} className="text-amber-500" />
            Upcoming Renewals (Next 90 Days)
          </h3>
          <div className="space-y-2">
            {upcomingRenewals.map((a) => {
              const daysLeft = getDaysLeft(a.endDate);
              const urgent = daysLeft <= 30;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    urgent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className={urgent ? "text-amber-600" : "text-text-2"} />
                    <div>
                      <p className="font-medium">{a.partnerName ?? a.partnerId}</p>
                      <p className="text-xs text-text-2">Expires {a.endDate}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      urgent
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {daysLeft} days left
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? "border-slate-700 bg-slate-700 text-white"
                  : "border-slate-200 bg-white/70 text-text-2 hover:bg-surface-hover"
              }`}
            >
              {tab === "All" ? "All" : STATUS_CONFIG[tab]?.label ?? tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partner..."
            className="w-full rounded-lg border border-slate-200 bg-white/70 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-brand-600 sm:w-56"
          />
        </div>
      </div>

      {/* Agreements table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/70">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-left text-text-2">
            <tr>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">End Date</th>
              <th className="px-4 py-3">Days Left</th>
              <th className="px-4 py-3">Notice Period</th>
              <th className="px-4 py-3">KYC Status</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgreements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-2">
                  No agreements match your filters.
                </td>
              </tr>
            )}
            {filteredAgreements.map((a) => {
              const daysLeft = getDaysLeft(a.endDate);
              const status = getComplianceStatus(a);
              const config = STATUS_CONFIG[status];
              return (
                <tr key={a.id} className="border-t border-slate-200 bg-white/70">
                  <td className="px-4 py-3 font-medium">{a.partnerName ?? a.partnerId}</td>
                  <td className="px-4 py-3">{a.startDate}</td>
                  <td className="px-4 py-3">{a.endDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`${
                        daysLeft < 0
                          ? "text-red-600"
                          : daysLeft <= 30
                          ? "text-amber-600"
                          : "text-text-1"
                      }`}
                    >
                      {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft} days`}
                    </span>
                  </td>
                  <td className="px-4 py-3">{a.noticePeriodDays} days</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        a.kycStatus === "verified"
                          ? "bg-green-100 text-green-700"
                          : a.kycStatus === "expired"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {a.kycStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${config.badge}`}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "amber" | "red" | "orange";
  icon: React.ReactNode;
}) {
  const styles = {
    amber: { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-700", iconBg: "bg-red-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", iconBg: "bg-orange-100" },
  };
  const s = tone ? styles[tone] : { bg: "bg-slate-50", text: "text-slate-700", iconBg: "bg-slate-100" };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white/70 p-3.5 ${s.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-2">{label}</p>
        <span className={`rounded-full p-1.5 ${s.iconBg} ${s.text}`}>{icon}</span>
      </div>
      <p className={`mt-1.5 text-xl font-semibold ${s.text}`}>{value}</p>
    </div>
  );
}