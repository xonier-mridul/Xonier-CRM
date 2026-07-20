"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskReportService } from "@/src/services/taskReport.service";
import {
  TaskItemStatus,
  TaskPriority,
  TaskReport,
  TaskReportItem,
  WorkMood,
} from "@/src/types/task/taskReport";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const STATUS_META: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  morning_pending: {
    label: ("morning_ending"),
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  morning_submitted: {
    label: "Morning Submitted",
    dot: "bg-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-400",
  },
  evening_pending: {
    label: "Evening Pending",
    dot: "bg-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
  },
  evening_submitted: {
    label: "Evening Submitted",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-400",
  },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
  medium:
    "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
};

const ITEM_STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; icon: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: "⏳",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600 dark:text-cyan-400",
    icon: "🔄",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: "✅",
  },
  carried_forward: {
    label: "Carried Forward",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600 dark:text-cyan-400",
    icon: "➡️",
  },
  blocked: {
    label: "Blocked",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-600 dark:text-red-400",
    icon: "🚫",
  },
};

const MOOD_MAP: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  excellent: {
    emoji: "🚀",
    label: "Excellent",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  good: {
    emoji: "😊",
    label: "Good",
    color: "text-cyan-600 dark:text-cyan-400",
  },
  neutral: {
    emoji: "😐",
    label: "Neutral",
    color: "text-gray-600 dark:text-gray-400",
  },
  tired: {
    emoji: "😴",
    label: "Tired",
    color: "text-orange-600 dark:text-orange-400",
  },
  stressed: {
    emoji: "😰",
    label: "Stressed",
    color: "text-red-600 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? {
    label: status,
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${m.bg} ${m.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function CompletionBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 40
      ? "bg-cyan-500"
      : pct > 0
      ? "bg-amber-400"
      : "bg-gray-200 dark:bg-gray-600";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

function TaskItemCard({
  item,
  index,
}: {
  item: TaskReportItem;
  index: number;
}) {
  const { t } = useTranslation();
  const statusMeta =
    ITEM_STATUS_META[item.status] ?? ITEM_STATUS_META["pending"];
  const priorityClass =
    PRIORITY_BADGE[item.priority ?? "low"] ?? PRIORITY_BADGE["low"];

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center group-hover:bg-cyan-100 group-hover:text-cyan-600 dark:group-hover:bg-cyan-900/30 dark:group-hover:text-cyan-400 transition-colors duration-200">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1 truncate">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {item.description.trim()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${priorityClass}`}
          >
            {item.priority ?? "—"}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.bg} ${statusMeta.text}`}
          >
            {statusMeta.icon} {statusMeta.label}
          </span>
        </div>
      </div>

      <CompletionBar value={item.completionPercentage} />

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t("est_2")}{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {item.estimatedHours ?? "—"}h
          </span>
        </span>
        {item.actualHours != null && (
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("actual_2")}{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {item.actualHours}h
            </span>
          </span>
        )}
        {item.blockerReason && (
          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
            🚫 {item.blockerReason}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  accentClass,
  submittedAt,
  isSubmitted,
  children,
}: {
  title: string;
  icon: string;
  accentClass: string;
  submittedAt?: string;
  isSubmitted: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div
        className={`px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between ${accentClass}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {t("submitted_2")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {t("not_submitted")}
            </span>
          )}
          {submittedAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(submittedAt).toLocaleString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0 group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 rounded-lg px-1 transition-colors duration-150">
      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-32 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-200 font-medium flex-1">
        {value ?? (
          <span className="text-gray-300 dark:text-gray-600 italic">—</span>
        )}
      </span>
    </div>
  );
}

function SkeletonBlock({
  h = "h-6",
  w = "w-full",
}: {
  h?: string;
  w?: string;
}) {
  return (
    <div
      className={`${h} ${w} rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse`}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <SkeletonBlock h="h-8" w="w-8" />
        <SkeletonBlock h="h-8" w="w-64" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} h="h-20" />
        ))}
      </div>
      <SkeletonBlock h="h-64" />
      <SkeletonBlock h="h-64" />
    </div>
  );
}

function ReviewPanel({
  report,
  onReviewed,
}: {
  report: TaskReport;
  onReviewed: () => void;
}) {
  const { t } = useTranslation();
  const [comment, setComment] = useState(report.managerComment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | string[]>("");
  const [charCount, setCharCount] = useState(
    (report.managerComment ?? "").length
  );
  const MAX_CHARS = 500;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {hasPermission} = usePermissions()

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setComment(val);
    setCharCount(val.length);
    setErr("");
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setErr("Please write a comment before submitting the review");
      textareaRef.current?.focus();
      return;
    }
    setIsSubmitting(true);
    setErr("");
    try {
      await TaskReportService.reviewReport(report.id, comment.trim());
      onReviewed();
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        setErr(extractErrorMessages(error));
      } else {
        setErr("Failed to submit review. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyReviewed = report.isReviewed;

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
        isAlreadyReviewed
          ? "bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800"
          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
      }`}
    >
      <div
        className={`px-5 py-4 border-b flex items-center justify-between ${
          isAlreadyReviewed
            ? "border-cyan-200 dark:border-cyan-800 bg-cyan-100/50 dark:bg-cyan-900/20"
            : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">
            {isAlreadyReviewed ? "✅" : "📝"}
          </span>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
              {isAlreadyReviewed ? t("review_submitted") : t("manager_review")}
            </h2>
            {isAlreadyReviewed && report.managerReviewedAt && (
              <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
                {t("reviewed_on")}{" "}
                {new Date(report.managerReviewedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        {isAlreadyReviewed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {t("reviewed")}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {isAlreadyReviewed && report.reviewedBy && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-cyan-100 dark:border-cyan-800/50">
            <div className="h-8 w-8 rounded-full bg-cyan-200 dark:bg-cyan-800 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                {report.reviewedBy.firstName.charAt(0)}
                {report.reviewedBy.lastName?.charAt(0) ?? ""}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reviewed_by")}
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {report.reviewedBy.firstName} {report.reviewedBy.lastName}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {isAlreadyReviewed ? t("review_comment") : t("write_your_review_comment")}
            </label>
            {!isAlreadyReviewed && (
              <span
                className={`text-xs font-medium tabular-nums ${
                  charCount >= MAX_CHARS * 0.9
                    ? "text-red-500"
                    : charCount >= MAX_CHARS * 0.7
                    ? "text-amber-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {charCount}/{MAX_CHARS}
              </span>
            )}
          </div>

          {isAlreadyReviewed ? (
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-cyan-100 dark:border-cyan-800/50 min-h-[80px]">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {report.managerComment ?? (
                  <span className="text-gray-400 italic">{t("no_comment_provided")}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="relative group">
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={handleCommentChange}
                placeholder={t("write_a_detailed_review_for_this")}
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
                  err
                    ? "border-red-300 dark:border-red-700 focus:ring-red-400"
                    : "border-gray-200 dark:border-gray-600 focus:ring-cyan-400 dark:focus:ring-cyan-500 group-hover:border-gray-300 dark:group-hover:border-gray-500"
                }`}
              />
              <div
                className={`absolute bottom-3 right-3 h-1 rounded-full transition-all duration-300 ${
                  charCount === 0
                    ? "w-0 opacity-0"
                    : charCount >= MAX_CHARS * 0.9
                    ? "w-6 bg-red-400"
                    : charCount >= MAX_CHARS * 0.7
                    ? "w-4 bg-amber-400"
                    : "w-3 bg-emerald-400"
                }`}
              />
            </div>
          )}

          {err && (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
    <span className="text-red-500 text-sm">⚠️</span>
    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
      {Array.isArray(err) ? err.join(", ") : err}
    </p>
  </div>
)}
        </div>

        {!isAlreadyReviewed && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !comment.trim() ||!hasPermission("taskReport:review")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-cyan-200 dark:hover:shadow-cyan-900/30"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  {t("submitting")}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t("submit_review")}
                </>
              )}
            </button>
            {comment.trim() && !isSubmitting && (
              <button
                type="button"
                onClick={() => {
                  setComment(report.managerComment ?? "");
                  setCharCount((report.managerComment ?? "").length);
                  setErr("");
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {t("reset")}
              </button>
            )}
          </div>
        )}

        {!isAlreadyReviewed && (
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("once_submitted_the_review_will_be_visible_to_the_team")}
          </p>
        )}
      </div>
    </div>
  );
}

const TaskReportDetailPage = (): JSX.Element => {
  const { t } = useTranslation();
  const [report, setReport] = useState<TaskReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | string[]>("");
  const { id } = useParams();
  const router = useRouter();

  const { i18n } = useTranslation();

const localeMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pt: "pt-PT",
};

const language = (i18n.resolvedLanguage ?? "en").split("-")[0];



  const getTaskReport = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErr("");
    try {
      const result = await TaskReportService.getReportById(
        Array.isArray(id) ? id[0] : id
      );
      if (result.status === 200) {
        setReport(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getTaskReport();
  }, [getTaskReport]);

  const morning = report?.morningAgenda;
  const evening = report?.eveningReport;
  const mood = evening?.overallMood
    ? MOOD_MAP[evening.overallMood] ?? null
    : null;

  const totalEstimated =
    morning?.items.reduce((s, i) => s + (i.estimatedHours ?? 0), 0) ?? 0;
  const totalActual =
    evening?.completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0) ?? 0;
  const avgCompletion =
    evening?.completedItems.length
      ? Math.round(
          evening.completedItems.reduce(
            (s, i) => s + i.completionPercentage,
            0
          ) / evening.completedItems.length
        )
      : 0;

  if (err) {
    const messages = Array.isArray(err) ? err : [err];
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-2">
            {t("failed_to_load_report")}
          </h3>
          {messages.map((m, i) => (
            <p key={i} className="text-sm text-red-600 dark:text-red-400">
              {m}
            </p>
          ))}
          <button
            type="button"
            onClick={getTaskReport}
            className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition active:scale-95"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="ml-72 mt-14">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full mb-10">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {t("task_report_detail")}
                </h1>
              </div>
              {!isLoading && report && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-9">
  {new Date(report.reportDate).toLocaleDateString(
    localeMap[language] || "en-IN",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  )}

  {report.user && (
    <span className="ml-2 text-cyan-600 dark:text-cyan-400 font-semibold">
      · {report.user.firstName} {report.user.lastName}
    </span>
  )}
</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && report && (
              <StatusBadge status={report.status} />
            )}
            <button
              type="button"
              onClick={getTaskReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-bold transition-all active:scale-95 hover:shadow-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className={isLoading ? "animate-spin" : ""}
              >
                <path
                  d="M13 7A6 6 0 1 1 7 1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M10 1h3v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("refresh")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <DetailSkeleton />
        ) : report ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: t("morning_tasks"),
                  value: morning?.items.length ?? 0,
                  icon: "🌅",
                  bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800",
                  hover: "hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-amber-100 dark:hover:shadow-amber-900/20",
                },
                {
                  label: t("evening_tasks"),
                  value: evening?.completedItems.length ?? 0,
                  icon: "🌆",
                  bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800",
                  hover: "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20",
                },
                {
                  label: t("total_hours"),
                  value: `${totalActual || totalEstimated}h`,
                  icon: "⏱️",
                  bg: "bg-cyan-50 border-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800",
                  hover: "hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-cyan-100 dark:hover:shadow-cyan-900/20",
                },
                {
                  label: t("avg_completion"),
                  value: `${avgCompletion}%`,
                  icon: "📊",
                  bg: "bg-cyan-50 border-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800",
                  hover: "hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-cyan-100 dark:hover:shadow-cyan-900/20",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${s.bg} ${s.hover}`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {s.value}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SectionCard
              title={t("morning_agenda")}
              icon="🌅"
              accentClass="bg-amber-50/50 dark:bg-amber-900/10"
              submittedAt={morning?.submittedAt}
              isSubmitted={morning?.isSubmitted ?? false}
            >
              {morning?.goals && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                    {t("daily_goals")}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {morning.goals}
                  </p>
                </div>
              )}
              {morning?.items.length ? (
                <div className="space-y-3">
                  {morning.items.map((item, idx) => (
                    <TaskItemCard key={idx} item={item} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    {t("no_morning_agenda_items")}
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title={t("evening_report")}
              icon="🌆"
              accentClass="bg-indigo-50/50 dark:bg-indigo-900/10"
              submittedAt={evening?.submittedAt}
              isSubmitted={evening?.isSubmitted ?? false}
            >
              {mood && (
                <div className="mb-4 flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                  <span className="text-2xl">{mood.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      {t("overall_mood")}
                    </p>
                    <p className={`text-sm font-semibold ${mood.color}`}>
                      {mood.label}
                    </p>
                  </div>
                </div>
              )}

              {evening?.completedItems.length ? (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t("completed_tasks_2")}{evening.completedItems.length})
                  </p>
                  <div className="space-y-3">
                    {evening.completedItems.map((item, idx) => (
                      <TaskItemCard key={idx} item={item} index={idx} />
                    ))}
                  </div>
                </div>
              ) : null}

              {evening?.pendingItems.length ? (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t("pending_tasks")}{evening.pendingItems.length})
                  </p>
                  <div className="space-y-3">
                    {evening.pendingItems.map((item, idx) => (
                      <TaskItemCard key={idx} item={item} index={idx} />
                    ))}
                  </div>
                </div>
              ) : null}

              {!evening?.completedItems.length &&
                !evening?.pendingItems.length && (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                      {t("no_evening_report_items")}
                    </p>
                  </div>
                )}

              <div className="mt-5 grid grid-cols-1 gap-3">
                {evening?.achievements && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:shadow-sm transition-shadow duration-200">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                      {t("achievements")}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {evening.achievements}
                    </p>
                  </div>
                )}
                {evening?.blockers && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 hover:shadow-sm transition-shadow duration-200">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
                      {t("blockers")}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {evening.blockers}
                    </p>
                  </div>
                )}
                {evening?.tomorrowPlan && (
                  <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 hover:shadow-sm transition-shadow duration-200">
                    <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide mb-1">
                      {t("tomorrow_s_plan")}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {evening.tomorrowPlan}
                    </p>
                  </div>
                )}
              </div>

              {(evening?.totalCompletedHours != null ||
                evening?.totalPendingHours != null) && (
                <div className="mt-4 flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  {evening.totalCompletedHours != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        {t("completed_hours")}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {evening.totalCompletedHours}h
                      </span>
                    </div>
                  )}
                  {evening.totalPendingHours != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        {t("pending_hours")}
                      </span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {evening.totalPendingHours}h
                      </span>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            <ReviewPanel report={report} onReviewed={getTaskReport} />

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
                <span className="text-xl">ℹ️</span>
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {t("report_info")}
                </h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-10">
                <div>
                  <InfoRow
                    label={t("status")}
                    value={<StatusBadge status={report.status} />}
                  />
                  <InfoRow
                    label={t("report_date")}
                    value={new Date(report.reportDate).toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  />
                  <InfoRow
                    label={t("reviewed")}
                    value={
                      report.isReviewed ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {t("yes_2")}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          {t("not_yet")}
                        </span>
                      )
                    }
                  />
                  {report.managerComment && (
                    <InfoRow
                      label={t("manager_comment")}
                      value={report.managerComment}
                    />
                  )}
                </div>
                <div>
                  <InfoRow
                    label={t("created_at")}
                    value={new Date(report.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                  <InfoRow
                    label={t("updated_at")}
                    value={new Date(report.updatedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                  {report.managerReviewedAt && (
                    <InfoRow
                      label={t("reviewed_at")}
                      value={new Date(
                        report.managerReviewedAt
                      ).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TaskReportDetailPage;