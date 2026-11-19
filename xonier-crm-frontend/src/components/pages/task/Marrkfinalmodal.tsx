"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarkFinalPayload {
  remark: string;
  feedbackStars: number;
  actualHours?: number;
  actualDays?: number;
}

interface MarkFinalModalProps {
  taskTitle: string;
  statusName: string;
  statusColor?: string;
  onConfirm: (payload: MarkFinalPayload) => Promise<void>;
  onCancel: () => void;
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span
            className={
              star <= (hovered || value)
                ? "text-amber-400"
                : "text-gray-200 dark:text-gray-700"
            }
          >
            ★
          </span>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-xs font-semibold text-amber-500">
          {["", "Poor", "Fair", "Good", "Great", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function MarkFinalModal({
  taskTitle,
  statusName,
  statusColor = "#22c55e",
  onConfirm,
  onCancel,
}: MarkFinalModalProps) {
  const { t } = useTranslation();
  const [remark, setRemark] = useState("");
  const [feedbackStars, setFeedback] = useState(0);
  const [actualHours, setActualHours] = useState<string>("");
  const [actualDays, setActualDays] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ mount check (Next.js safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const validate = () => {
    if (!remark.trim()) {
      setErr("Remark is required before marking final.");
      return false;
    }
    if (feedbackStars === 0) {
      setErr("Please select a feedback rating.");
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    setErr(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onConfirm({
        remark: remark.trim(),
        feedbackStars,
        actualHours: Number(actualHours),
        actualDays: Number(actualDays)
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/30 dark:bg-slate-950/55 backdrop-blur-[2px] p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/[0.06]"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25">
            <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[15.5px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-slate-50">
              {t("mark_as")} <span>{statusName}</span>
            </p>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 truncate">
              {taskTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("cancel")}
            className="-mr-1.5 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Info banner */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/[0.07] border border-amber-200/80 dark:border-amber-500/25">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={1.9} />
            <p className="text-[12.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
              {t("marking_this_task_as")} <strong>{statusName}</strong> {t("is_a_final_action_please_fill_in_the_completion_details")}
            </p>
          </div>

          {/* Remark */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("completion_remark")}
              <span className="text-rose-500 text-xs">*</span>
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder={t("describe_what_was_done_any_blockers")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition resize-none"
            />
          </div>

          {/* Feedback stars */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("task_quality_rating")}
              <span className="text-rose-500 text-xs">*</span>
            </label>
            <StarRating value={feedbackStars} onChange={setFeedback} />
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {t("rate_the_overall_quality_of_this")}
            </p>
          </div>

          {/* Actual hours */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("actual_hours_spent")}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.5}
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder={t("e_g_3_5")}
                className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-semibold pointer-events-none">
                {t("hrs")}
              </span>
            </div>
             <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("actual_days_spent")}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.5}
                value={actualDays}
                onChange={(e) => setActualDays(e.target.value)}
                placeholder={t("e_g_0_5")}
                className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 font-semibold pointer-events-none">
                {t("days")}
              </span>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-500/[0.08] border border-rose-200/80 dark:border-rose-500/25">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" strokeWidth={2} />
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {err}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Confirm & Mark Final"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MarkFinalModal;