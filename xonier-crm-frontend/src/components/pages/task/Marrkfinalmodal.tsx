"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
       <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center  bg-green-500 text-white text-sm font-bold flex-shrink-0"
            
          >
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {t("mark_as")} <span>{statusName}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {taskTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition text-lg leading-none ml-2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Info banner */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
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
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
              <span className="text-rose-500 flex-shrink-0">⚠️</span>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {err}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 cursor-pointer px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            
          >
            {submitting ? "Saving…" : "✓ Confirm & Mark Final"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MarkFinalModal;