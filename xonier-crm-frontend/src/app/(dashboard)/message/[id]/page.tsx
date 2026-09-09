"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Message } from "@/src/types/communication/message.types";
import { MessageService } from "@/src/services/communication/message.servicie";
import {
  Phone,
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Hash,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Building2,
} from "lucide-react";
import { MessageSquareX } from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  sent:      { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  delivered: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  queued:    { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  failed:    { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  read:      { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
};

const getStatus = (status: string) =>
  STATUS_STYLE[status] ?? {
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-300",
    dot: "bg-gray-400",
  };

const fmt = (val: string | null | undefined) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString();
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Page() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const res = await MessageService.getById(id);
        if (res?.data) setData(res.data.data);
      } catch (e) {
        console.error("Failed to fetch message:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-700" />
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!isLoading && !data) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquareX size={26} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {t("message_not_found")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("this_sms_log_doesn't_exist_or")}
          </p>
          <a
            href="/emailManagement/sms"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            {t("go_back")}
          </a>
        </div>
      </div>
    );
  }

  const statusCfg = getStatus(data!.status);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("sms_details")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("full_information_about_this_message")}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold w-fit ${statusCfg.bg} ${statusCfg.text}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
            {data!.status.charAt(0).toUpperCase() + data!.status.slice(1)}
          </span>
        </div>

        {/* Quick stat strip */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatPill
            icon={data!.direction === "outbound" ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            label={t("direction")}
            value={data!.direction ?? "—"}
          />
          <StatPill icon={<RefreshCw size={14} />} label={t("channel")} value={data!.channel ?? "—"} />
          <StatPill
            icon={<DollarSign size={14} />}
            label={t("cost")}
            value={data!.cost ? `${data!.cost} ${data!.cost_currency}` : `— ${data!.cost_currency ?? ""}`}
          />
          <StatPill
            icon={<Hash size={14} />}
            label={t("conversation")}
            value={data!.conversation_id ?? "—"}
          />
        </div>
      </div>

      {/* ── Delivery Info ── */}
      <Section title={t("delivery_information")} icon={<Send size={16} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard icon={<Phone size={16} />} label={t("to_number")} value={data!.sent_to_number} />
          <InfoCard icon={<Phone size={16} />} label={t("from_number")} value={data!.sent_from_number} />
          <InfoCard icon={<MessageSquare size={16} />} label={t("direction")} value={data!.direction} />
          <InfoCard icon={<CheckCircle size={16} />} label={t("channel")} value={data!.channel} />
          <InfoCard icon={<Hash size={16} />} label={t("provider_sid")} value={data!.provider_message_sid} />
          {data!.conversation_id && (
            <InfoCard icon={<Hash size={16} />} label={t("conversation_id")} value={data!.conversation_id} />
          )}
        </div>
      </Section>

      {/* ── Timeline ── */}
      <Section title={t("timeline")} icon={<Clock size={16} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard icon={<Clock size={16} />} label={t("created_at")} value={fmt(data!.createdAt)} />
          <InfoCard icon={<Send size={16} />} label={t("sent_at")} value={fmt(data!.sent_at)} />
          <InfoCard icon={<CheckCircle size={16} />} label={t("delivered_at")} value={fmt(data!.delivered_at)} />
          <InfoCard icon={<MessageSquare size={16} />} label={t("read_at")} value={fmt(data!.read_at)} />
          {data!.status === "failed" && (
            <InfoCard icon={<AlertCircle size={16} />} label={t("failed_at")} value={fmt(data!.failed_at)} />
          )}
          <InfoCard icon={<Clock size={16} />} label={t("last_updated")} value={fmt(data!.updatedAt)} />
        </div>
      </Section>

      {/* ── Sent By ── */}
      {data!.sent_by && (
        <Section title={t("sent_by")} icon={<User size={16} />}>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard
              icon={<User size={16} />}
              label={t("name_2")}
              value={`${data!.sent_by.firstName} ${data!.sent_by.lastName}`}
            />
            
          </div>
        </Section>
      )}

      {/* ── Message Bubble ── */}
      <Section title={t("message")} icon={<MessageSquare size={16} />}>
        <div className="flex">
          <div
            className={`text-sm p-4 rounded-2xl max-w-xl leading-relaxed whitespace-pre-line shadow-sm ${
              data!.direction === "outbound"
                ? "bg-blue-500 text-white rounded-bl-sm ml-auto"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-br-sm"
            }`}
          >
            {data!.message || "— No message content —"}
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
          {data!.direction === "outbound" ? "Outbound" : "Inbound"} · {fmt(data!.sent_at)}
        </p>
      </Section>

      {/* ── Error ── */}
      {(data!.error_message || data!.error_code) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">{t("error_details")}</h3>
          </div>
          {data!.error_code && (
            <p className="text-xs text-red-500 dark:text-red-400 mb-1">
              {t("code")} <code className="font-mono">{data!.error_code}</code>
            </p>
          )}
          {data!.error_message && (
            <p className="text-sm text-red-600 dark:text-red-300">{data!.error_message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

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
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-800 dark:text-white break-all">
          {value || "—"}
        </p>
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