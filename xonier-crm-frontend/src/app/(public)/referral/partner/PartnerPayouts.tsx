"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, GhostButton } from "../shared/Primitives";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import { payoutRows } from "@/src/constants/referral";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import Badge from "../shared/Badge";
import {
  Download,
  Copy,
  Check,
  Search,
  Wallet,
  Clock,
  CheckCircle2,
  Send,
} from "lucide-react";
import { PayoutStatus } from "@/src/types/referral/referral.type";

type PayoutRow = {
  period: string;
  amount: number;
  reference: string;
  status: PayoutStatus; // don't over-constrain — mirror whatever the data actually contains
};

// Default icon fallback for any status we don't explicitly recognize
const STATUS_ICONS: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 size={12} />,
  processing: <Clock size={12} />,
  scheduled: <Clock size={12} />,
  pending: <Clock size={12} />,
  reviewing: <Clock size={12} />,
  failed: <Clock size={12} />,
};

function getStatusIcon(status: string) {
  return STATUS_ICONS[status] ?? <Clock size={12} />;
}

export default function PartnerPayouts() {
  const { t } = useTranslation();
const [rows] = useState<PayoutRow[]>(payoutRows);

  // Build status tabs dynamically from whatever's actually in the data
  const availableStatuses = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.status)));
    return ["all", ...unique];
  }, [rows]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  /* ---------------------------- Derived ---------------------------- */

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    rows.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + r.amount;
    });
    return byStatus;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || r.period.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, search]);

  /* ---------------------------- Handlers ---------------------------- */

  function handleCopy(reference: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(reference).then(() => {
      setCopiedRef(reference);
      setTimeout(() => setCopiedRef(null), 1500);
    });
  }

  function handleDownloadStatement(row: PayoutRow) {
    const header = ["Period", "Amount", "Reference", "Status"];
    const line = [row.period, row.amount, row.reference, row.status];
    const csv = [header, line].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-statement-${row.reference}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadAll() {
    const header = ["Period", "Amount", "Reference", "Status"];
    const lines = filteredRows.map((r) => [r.period, r.amount, r.reference, r.status]);
    const csv = [header, ...lines].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRequestPayout() {
    setRequesting(true);
    setTimeout(() => {
      setRequesting(false);
      setRequestSent(true);
      setTimeout(() => setRequestSent(false), 3500);
    }, 900);
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{t("partner.payouts.eyebrow")}</Eyebrow>
          <h2 className="text-base text-slate-600">{t("nav.payouts")}</h2>
        </div>

        <div className="flex items-center gap-2">
          {requestSent && (
            <span className="text-xs font-medium text-green-600">
              {t("partner.payouts.requestSent", { defaultValue: "Payout request sent to Finance" })}
            </span>
          )}
          <GhostButton onClick={handleRequestPayout} disabled={requesting}>
            <Send size={14} className="mr-1 inline" />
            {requesting
              ? t("partner.payouts.requesting", { defaultValue: "Requesting..." })
              : t("partner.payouts.request", { defaultValue: "Request Payout" })}
          </GhostButton>
        </div>
      </div>

      {/* Summary tiles — built dynamically from whatever statuses exist */}
      <div className="mb-4.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.entries(totals).map(([status, amount]) => (
          <SummaryTile
            key={status}
            label={t(`badge.${status}`, { defaultValue: status })}
            value={amount}
            icon={getStatusIcon(status)}
          />
        ))}
      </div>

      <Card>
        {/* Filters */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {availableStatuses.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                  statusFilter === tab
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {tab === "all"
                  ? t("table.all", { defaultValue: "All" })
                  : t(`badge.${tab}`, { defaultValue: tab })}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("partner.payouts.search", { defaultValue: "Search period or reference..." })}
                className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-600 outline-none focus:border-slate-400"
              />
            </div>
            <GhostButton onClick={handleDownloadAll}>
              <Download size={14} className="mr-1 inline" />
              {t("partner.payouts.exportAll", { defaultValue: "Export" })}
            </GhostButton>
          </div>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>{t("table.period")}</Th>
              <Th num>{t("table.amount")}</Th>
              <Th>{t("table.reference")}</Th>
              <Th>{t("table.status")}</Th>
              <Th>{t("table.action")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {filteredRows.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <div className="py-10 text-center text-sm text-slate-400">
                    {t("partner.payouts.empty", { defaultValue: "No payouts match your filters." })}
                  </div>
                </Td>
              </Tr>
            )}

            {filteredRows.map((row, i) => (
              <Tr key={`${row.reference}-${i}`}>
                <Td num>{row.period}</Td>
                <Td num>{formatCurrency(row.amount)}</Td>
             
                     <Td>
                 <button
  onClick={() => handleCopy(row.reference)}
  className="flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-700"
  title="Copy reference"
>
  {row.reference}

  {row.reference.length > 0 ?
    (copiedRef === row.reference ? (
      <Check size={12} className="text-green-600" />
    ) : (
      <Copy size={12} className="opacity-50" />
    )): <div>----</div>
  }
</button>
                </Td>

               
               
                <Td>
                  <Badge tone={row.status}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(row.status)}
                      {t(`badge.${row.status}`, { defaultValue: row.status })}
                    </span>
                  </Badge>
                </Td>
                <Td>
                  {row.status === "paid" ? (
                    <button
                      onClick={() => handleDownloadStatement(row)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      <Download size={12} />
                      {t("partner.payouts.statement")}
                    </button>
                  ) : row.status === "failed" ? (
                    <span className="text-xs font-medium text-red-500">
                      {t("partner.payouts.retry", { defaultValue: "Retry pending" })}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {t("partner.payouts.reviewing", { defaultValue: "Reviewing" })}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary Tile                                                        */
/* ------------------------------------------------------------------ */

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs capitalize text-slate-500">{label}</p>
        <span className="rounded-full bg-slate-100 p-1.5 text-slate-600">{icon}</span>
      </div>
      <p className="mt-1.5 text-lg font-semibold text-slate-700">{formatCurrency(value)}</p>
    </div>
  );
}