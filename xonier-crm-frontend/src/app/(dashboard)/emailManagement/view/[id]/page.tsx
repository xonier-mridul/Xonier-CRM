"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmailLog } from "@/src/types/communication/mail.types";
import EmailService from "@/src/services/communication/mail.service";
import {Mail, User, Clock, CheckCircle, AlertCircle, FileText, Send, RefreshCw, Eye, MousePointer, Tag, Layers, LayoutTemplate, AtSign, Hash, Info} from "lucide-react";
import { MailX } from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  sent:      { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  delivered: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  opened:    { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  queued:    { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  failed:    { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

const getStatus = (status: string) =>
  STATUS_STYLE[status] ?? { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300", dot: "bg-gray-400" };

const fmt = (val: string | null | undefined) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString();
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<EmailLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await EmailService.getLogById(id);
        if (res?.data) setData(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-700" />
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!data) {
    return (
      <div className="ml-72 mt-14 p-6 flex justify-center items-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailX size={26} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Email Log Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This email log doesn't exist or may have been removed.
          </p>
          <a
            href="/emailManagement/outbox"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Go Back to Outbox
          </a>
        </div>
      </div>
    );
  }

  const statusCfg = getStatus(data.status);

  return (
    <div className="ml-72 mt-14 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Log Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {data.subject}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${statusCfg.bg} ${statusCfg.text}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
          </span>
        </div>

        {/* Quick stats row */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatPill icon={<Eye size={14} />} label="Opens" value={data.opened_count ?? 0} />
          <StatPill icon={<MousePointer size={14} />} label="Clicks" value={data.clicked_count ?? 0} />
          <StatPill icon={<RefreshCw size={14} />} label="Retries" value={data.retry_count ?? 0} />
          <StatPill icon={<Send size={14} />} label="Provider" value={data.provider ?? "—"} />
        </div>
      </div>

      {/* ── Delivery Info ── */}
      <Section title="Delivery Information" icon={<Send size={16} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard icon={<Mail size={16} />} label="To" value={data.to_emails?.join(", ")} />
          <InfoCard icon={<AtSign size={16} />} label="From" value={`${data.from_name ?? ""} <${data.from_email}>`} />
          {data.cc_emails?.length > 0 && (
            <InfoCard icon={<Mail size={16} />} label="CC" value={data.cc_emails.join(", ")} />
          )}
          {data.bcc_emails?.length > 0 && (
            <InfoCard icon={<Mail size={16} />} label="BCC" value={data.bcc_emails.join(", ")} />
          )}
          {data.reply_to && (
            <InfoCard icon={<Mail size={16} />} label="Reply To" value={data.reply_to} />
          )}
          <InfoCard icon={<FileText size={16} />} label="Subject" value={data.subject} />
          <InfoCard icon={<Hash size={16} />} label="Provider Message ID" value={data.provider_message_id} />
        </div>
      </Section>

      {/* ── Timeline ── */}
      <Section title="Timeline" icon={<Clock size={16} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard icon={<Clock size={16} />} label="Created At" value={fmt(data.created_at)} />
          <InfoCard icon={<Send size={16} />} label="Sent At" value={fmt(data.sent_at)} />
          <InfoCard icon={<CheckCircle size={16} />} label="Delivered At" value={fmt(data.delivered_at)} />
          <InfoCard icon={<Eye size={16} />} label="Opened At" value={fmt(data.opened_at)} />
          <InfoCard icon={<MousePointer size={16} />} label="Clicked At" value={fmt(data.clicked_at)} />
          <InfoCard icon={<AlertCircle size={16} />} label="Failed At" value={fmt(data.failed_at)} />
        </div>
      </Section>

      {/* ── Sent By ── */}
      {data.sent_by && (
        <Section title="Sent By" icon={<User size={16} />}>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard
              icon={<User size={16} />}
              label="Name"
              value={`${data.sent_by.firstName} ${data.sent_by.lastName}`}
            />
           
          </div>
        </Section>
      )}

      {/* ── Template ── */}
      {data.template && (
        <Section title="Template Used" icon={<LayoutTemplate size={16} />}>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard icon={<LayoutTemplate size={16} />} label="Template Name" value={data.template.name} />
            <InfoCard icon={<Tag size={16} />} label="Category" value={data.template.category} />
            <InfoCard icon={<Info size={16} />} label="Status" value={data.template.status} />
            <InfoCard icon={<Hash size={16} />} label="Usage Count" value={String(data.template.usage_count ?? 0)} />
            {data.template.tags?.length > 0 && (
              <div className="md:col-span-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Tag size={12} /> Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.template.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800/40 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.template.description && (
              <div className="md:col-span-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <FileText size={12} /> Description
                </p>
                <p className="text-sm text-gray-800 dark:text-white">{data.template.description}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Variables Used ── */}
      {data.variables_used && Object.keys(data.variables_used).length > 0 && (
        <Section title="Variables Used" icon={<Layers size={16} />}>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(data.variables_used).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3"
              >
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                  {`{{${key}}}`}
                </code>
                <span className="text-sm font-medium text-gray-800 dark:text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Email Body ── */}
      <Section title="Email Body" icon={<FileText size={16} />}>
        <div
          className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 text-sm text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: data.html_body  || "<em>No body content</em>" }}
        />
      </Section>

      {/* ── Error ── */}
      {data.error_message && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Error Message</h3>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300">{data.error_message}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-700/60">
        <span className="text-blue-500 dark:text-blue-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-500 dark:text-blue-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-white break-all">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize">{value}</p>
      </div>
    </div>
  );
}