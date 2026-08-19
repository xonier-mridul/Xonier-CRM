"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Eyebrow, GhostButton, PrimaryButton } from "../shared/Primitives";
import { Table, Td, Th, Thead, Tr } from "../shared/Table";
import Badge from "../shared/Badge";
import { batchRows } from "@/src/constants/referral";
import {
  Download,
  Eye,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Wallet,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types — extend the shared batchRows contract with detail entries    */
/* ------------------------------------------------------------------ */

type PayoutStatus = "pending" | "approved" | "paid" | "disputed";

type BatchRow = {
  batch: string;
  period: string;
  total: string;
  status: PayoutStatus;
};

type LineItem = {
  id: string;
  partner: string;
  dealType: string;
  amount: number;
  status: PayoutStatus;
  disputeReason?: string;
};

type BatchExt = BatchRow & {
  items?: LineItem[];
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
};

/* ------------------------------------------------------------------ */
/* Mock line-item data — in production, fetch via batch ID             */
/* ------------------------------------------------------------------ */

const MOCK_BATCH_DETAILS: Record<string, LineItem[]> = {
  "B-2026-06": [
    { id: "1", partner: "Jeevant Global Solutions", dealType: "New Subscription", amount: 100000, status: "approved" },
    { id: "2", partner: "NorthStar Consulting", dealType: "Renewal", amount: 20000, status: "approved" },
    { id: "3", partner: "Vertex Channel Partners", dealType: "Upsell", amount: 30000, status: "approved" },
  ],
  "B-2026-05": [
    { id: "4", partner: "BluePeak Advisors", dealType: "Additional Licenses", amount: 8000, status: "paid" },
    { id: "5", partner: "Orbit HR Consultants", dealType: "AI Add-ons", amount: 24000, status: "paid" },
  ],
  "B-2026-04": [
    { id: "6", partner: "Jeevant Global Solutions", dealType: "Renewal", amount: 18000, status: "disputed", disputeReason: "Deal value mismatch with signed contract" },
    { id: "7", partner: "NorthStar Consulting", dealType: "New Subscription", amount: 50000, status: "disputed", disputeReason: "Customer churned before first invoice" },
  ],
};

const STATUS_CONFIG: Record<PayoutStatus, { badge: string; icon: React.ReactNode }> = {
  pending: { badge: "bg-amber-100 text-amber-700", icon: <Clock size={12} /> },
  approved: { badge: "bg-blue-100 text-blue-700", icon: <CheckCircle2 size={12} /> },
  paid: { badge: "bg-green-100 text-green-700", icon: <Wallet size={12} /> },
  disputed: { badge: "bg-red-100 text-red-700", icon: <AlertTriangle size={12} /> },
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function AdminBatches() {
  const { t } = useTranslation();

  const [batches, setBatches] = useState<BatchExt[]>(
    (batchRows as BatchRow[]).map((b) => ({
      ...b,
      items: MOCK_BATCH_DETAILS[b.batch],
    }))
  );

  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [viewingBatch, setViewingBatch] = useState<BatchExt | null>(null);

  /* ---------------------------- Derived ---------------------------- */

  const summary = useMemo(() => {
    const pending = batches.filter((b) => b.status === "pending").length;
    const approved = batches.filter((b) => b.status === "approved").length;
    const paid = batches.filter((b) => b.status === "paid").length;
    const disputed = batches.filter((b) => b.status === "disputed").length;
    const totalValue = batches.reduce(
      (sum, b) => sum + parseFloat(b.total.replace(/[^0-9.-]+/g, "")),
      0
    );
    return { pending, approved, paid, disputed, totalValue };
  }, [batches]);

  /* ---------------------------- Handlers ---------------------------- */

  function toggleExpand(batchId: string) {
    setExpandedBatch((prev) => (prev === batchId ? null : batchId));
  }

  function approveBatch(batchId: string) {
    setBatches((prev) =>
      prev.map((b) =>
        b.batch === batchId
          ? {
              ...b,
              status: "approved" as PayoutStatus,
              approvedBy: "Finance Admin",
              approvedAt: new Date().toISOString().slice(0, 10),
            }
          : b
      )
    );
  }

  function markBatchPaid(batchId: string) {
    setBatches((prev) =>
      prev.map((b) =>
        b.batch === batchId
          ? {
              ...b,
              status: "paid" as PayoutStatus,
              paidAt: new Date().toISOString().slice(0, 10),
            }
          : b
      )
    );
  }

  function handleExportBatch(batch: BatchExt) {
    const header = ["Partner", "Deal Type", "Amount", "Status"];
    const rows = (batch.items ?? []).map((item) => [
      item.partner,
      item.dealType,
      item.amount,
      item.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-${batch.batch}-statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function viewBatchDetails(batch: BatchExt) {
    setViewingBatch(batch);
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div>
      <Eyebrow>{t("admin.batches.eyebrow")}</Eyebrow>
      <h2 className="mb-4.5 text-base text-slate-600">{t("nav.payoutBatches")}</h2>

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <SummaryTile
          label={t("admin.batches.pending", { defaultValue: "Pending" })}
          value={summary.pending}
          tone="amber"
          icon={<Clock size={16} />}
        />
        <SummaryTile
          label={t("admin.batches.approved", { defaultValue: "Approved" })}
          value={summary.approved}
          tone="blue"
          icon={<CheckCircle2 size={16} />}
        />
        <SummaryTile
          label={t("admin.batches.paid", { defaultValue: "Paid" })}
          value={summary.paid}
          tone="green"
          icon={<Wallet size={16} />}
        />
        <SummaryTile
          label={t("admin.batches.disputed", { defaultValue: "Disputed" })}
          value={summary.disputed}
          tone="red"
          icon={<AlertTriangle size={16} />}
        />
        <SummaryTile
          label={t("admin.batches.totalValue", { defaultValue: "Total Value" })}
          value={`₹${summary.totalValue.toLocaleString()}`}
          icon={<FileText size={16} />}
        />
      </div>

      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th></Th>
              <Th>{t("table.batch")}</Th>
              <Th>{t("table.period")}</Th>
              <Th num>{t("table.total")}</Th>
              <Th>{t("table.status")}</Th>
              <Th>{t("table.action")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {batches.map((row) => {
              const isExpanded = expandedBatch === row.batch;
              const config = STATUS_CONFIG[row.status];
              return (
                <>
                  <Tr key={row.batch}>
                    <Td>
                      <button
                        onClick={() => toggleExpand(row.batch)}
                        className="flex items-center justify-center rounded p-1 hover:bg-surface-hover"
                        title="Expand line items"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </Td>
                    <Td num>{row.batch}</Td>
                    <Td num>{row.period}</Td>
                    <Td num>{row.total}</Td>
                    <Td>
                      <Badge tone={row.status}>
                        <span className="flex items-center gap-1">
                          {config.icon}
                          {t(`${row.status}`)}
                        </span>
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {row.status === "pending" && (
                          <button
                            onClick={() => approveBatch(row.batch)}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            title="Approve for payout"
                          >
                            <Check size={14} />
                            {t("admin.batches.approve", { defaultValue: "Approve" })}
                          </button>
                        )}
                        {row.status === "approved" && (
                          <button
                            onClick={() => markBatchPaid(row.batch)}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                            title="Mark as paid"
                          >
                            <Wallet size={14} />
                            {t("admin.batches.markPaid")}
                          </button>
                        )}
                        {(row.status === "paid" || row.status === "disputed") && (
                          <button
                            onClick={() => viewBatchDetails(row)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            title="View details"
                          >
                            <Eye size={14} />
                            {t("common.view")}
                          </button>
                        )}
                        <button
                          onClick={() => handleExportBatch(row)}
                          className="flex items-center gap-1 text-xs text-text-2 hover:text-slate-900"
                          title="Export statement"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </Td>
                  </Tr>

                  {/* Expanded line items — doc §5.6 "per-lead breakdown" */}
                  {isExpanded && row.items && (
                    <Tr>
                      <Td colSpan={6} className="bg-surface-hover/30 px-8 py-3">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-text-2">
                            {t("admin.batches.lineItems", {
                              defaultValue: "Line Items",
                              count: row.items.length,
                            })}
                          </p>
                          {row.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-4">
                                <span className="font-medium">{item.partner}</span>
                                <span className="text-text-2">{item.dealType}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-semibold">₹{item.amount.toLocaleString()}</span>
                                <Badge tone={item.status}>
                                  <span className="flex items-center gap-1">
                                    {STATUS_CONFIG[item.status].icon}
                                    {t(`badge.${item.status}`)}
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Td>
                    </Tr>
                  )}
                </>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Batch detail modal — for paid/disputed batches */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewingBatch(null)} />
          <div className="relative z-10 w-[600px] max-w-[95%] rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold">Batch {viewingBatch.batch}</h3>
                <p className="text-sm text-text-2">{viewingBatch.period}</p>
              </div>
              <button
                onClick={() => setViewingBatch(null)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-2 hover:bg-surface-hover"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 space-y-2 text-sm">
              <DetailRow label="Total Amount" value={viewingBatch.total} />
              <DetailRow
                label="Status"
                value={
                  <Badge tone={viewingBatch.status}>
                    {t(`badge.${viewingBatch.status}`)}
                  </Badge>
                }
              />
              {viewingBatch.approvedBy && (
                <DetailRow
                  label="Approved By"
                  value={`${viewingBatch.approvedBy} on ${viewingBatch.approvedAt}`}
                />
              )}
              {viewingBatch.paidAt && <DetailRow label="Paid On" value={viewingBatch.paidAt} />}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-2">Line Items</p>
              {(viewingBatch.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-line bg-surface-hover/20 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.partner}</span>
                    <span className="font-semibold">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-text-2">
                    <span>{item.dealType}</span>
                    <Badge tone={item.status}>
                      {t(`badge.${item.status}`)}
                    </Badge>
                  </div>
                  {item.disputeReason && (
                    <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                      <AlertTriangle size={11} className="mr-1 inline" />
                      {item.disputeReason}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <GhostButton onClick={() => setViewingBatch(null)}>
                {t("common.close", { defaultValue: "Close" })}
              </GhostButton>
              <PrimaryButton onClick={() => handleExportBatch(viewingBatch)}>
                <Download size={14} className="mr-1 inline" />
                {t("admin.batches.downloadStatement", { defaultValue: "Download Statement" })}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
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
  value: number | string;
  tone?: "amber" | "blue" | "green" | "red";
  icon: React.ReactNode;
}) {
  const styles = {
    amber: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", iconBg: "bg-amber-100" },
    blue: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", iconBg: "bg-blue-100" },
    green: { bg: "bg-green-50 border-green-200", text: "text-green-700", iconBg: "bg-green-100" },
    red: { bg: "bg-red-50 border-red-200", text: "text-red-700", iconBg: "bg-red-100" },
  };
  const s = tone ? styles[tone] : { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", iconBg: "bg-slate-100" };

  return (
    <div className={`rounded-xl border p-3.5 ${s.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-2">{label}</p>
        <span className={`rounded-full p-1.5 ${s.iconBg} ${s.text}`}>{icon}</span>
      </div>
      <p className={`mt-1.5 text-lg font-semibold ${s.text}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-xs text-text-2">{label}</span>
      <span className="text-sm font-medium text-text-1">{value}</span>
    </div>
  );
}