"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Deal, DealStageUpdatePayload } from "@/src/types/deals/deal.types";
import { FORECAST_CATEGORY } from "@/src/constants/enum";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import {
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiMessageSquare,
} from "react-icons/fi";

interface DealClosureModalProps {
  isOpen: boolean;
  deal: Deal | null;
  initialStage: "won" | "lost";
  onClose: () => void;
  onConfirm: (payload: DealStageUpdatePayload) => Promise<boolean>;
}

const WON_PRESETS = [
  "Strong product fit",
  "Competitive pricing",
  "Existing client relationship",
  "Fast implementation timeline",
  "Superior support & SLA",
];

const LOST_PRESETS = [
  "Price / Budget constraints",
  "Lost to competitor",
  "Project cancelled / No decision",
  "Missing feature / Product gap",
  "Timing / Postponed",
  "Unresponsive prospect",
];

const toDateInput = (value?: string | null, fallbackToday = true): string => {
  if (value) {
    const parsed = String(value).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed;
  }
  return fallbackToday ? new Date().toISOString().slice(0, 10) : "";
};

const DealClosureModal: React.FC<DealClosureModalProps> = ({
  isOpen,
  deal,
  initialStage,
  onClose,
  onConfirm,
}) => {
  const currency = useCompanyCurrency();
  const [mounted, setMounted] = useState(false);
  const [outcome, setOutcome] = useState<"won" | "lost">(initialStage);
  const [closeDate, setCloseDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [nextStep, setNextStep] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !deal) return;
    setOutcome(initialStage);
    const defaultClose = toDateInput(deal.closeDate, true);
    const createMin = toDateInput(deal.createDate, false);
    setCloseDate(createMin && defaultClose < createMin ? createMin : defaultClose);
    setReason(
      initialStage === "won"
        ? deal.closedWonReason || ""
        : deal.closedLostReason || ""
    );
    setAmount(deal.amount != null ? String(deal.amount) : "");
    setNextStep(deal.nextStep || "");
    setError("");
    setSubmitting(false);
  }, [isOpen, deal, initialStage]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!mounted || !isOpen || !deal) return null;

  const isWon = outcome === "won";
  const presets = isWon ? WON_PRESETS : LOST_PRESETS;
  const minDate = toDateInput(deal.createDate, false);
  const companyOrContact =
    deal.organization?.name ||
    deal.lead_id?.companyName ||
    deal.person?.fullName ||
    deal.lead_id?.fullName ||
    null;

  const handleOutcomeSwitch = (nextOutcome: "won" | "lost") => {
    if (nextOutcome === outcome || submitting) return;
    setOutcome(nextOutcome);
    setReason(
      nextOutcome === "won"
        ? deal.closedWonReason || ""
        : deal.closedLostReason || ""
    );
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!closeDate) {
      setError("Close date is required.");
      return;
    }
    if (minDate && closeDate < minDate) {
      setError(`Close date cannot be earlier than create date (${minDate}).`);
      return;
    }
    if (!reason.trim()) {
      setError(
        isWon
          ? "Please provide the Won reason before closing this deal."
          : "Please provide the Lost reason before closing this deal."
      );
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Deal amount must be greater than 0.");
      return;
    }

    const payload: DealStageUpdatePayload = {
      dealStage: outcome,
      closeDate,
      ...(isWon
        ? { closedWonReason: reason.trim() }
        : { closedLostReason: reason.trim() }),
      dealProbability: isWon ? 100 : 0,
      forecastProbability: isWon ? 100 : 0,
      forecastCategory: FORECAST_CATEGORY.CLOSED,
      nextStep: nextStep.trim() || null,
      amount: Math.round(parsedAmount),
    };

    setSubmitting(true);
    try {
      const ok = await onConfirm(payload);
      if (ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-closure-modal-title"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isWon
              ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40"
              : "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${
                isWon ? "bg-emerald-600" : "bg-rose-600"
              }`}
            >
              {isWon ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
            </div>
            <div>
              <h2
                id="deal-closure-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {isWon ? "Close Deal as Won" : "Close Deal as Lost"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record the mandatory closure date &amp; outcome reason
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Outcome Toggle + Deal Summary Card */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 capitalize dark:text-white">
                  {deal.dealName}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{deal.deal_id}</span>
                  {companyOrContact && (
                    <>
                      <span>·</span>
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                        {companyOrContact}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                {formatCurrency(Number(deal.amount) || 0, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleOutcomeSwitch("won")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  isWon
                    ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <FiCheckCircle size={14} /> Closed Won
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleOutcomeSwitch("lost")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  !isWon
                    ? "border-rose-500 bg-rose-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <FiXCircle size={14} /> Closed Lost
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Close Date & Confirmed Amount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="closure-close-date"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <FiCalendar size={13} className="text-slate-400" />
                Close Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="closure-close-date"
                type="date"
                required
                min={minDate || undefined}
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="closure-amount"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <FiDollarSign size={13} className="text-slate-400" />
                Confirmed Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                id="closure-amount"
                type="number"
                min={1}
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          {/* Quick Reason Presets */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const selected = reason.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setReason(preset);
                      setError("");
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? isWon
                          ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
                          : "border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-200"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcome Reason */}
          <div>
            <label
              htmlFor="closure-reason"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <FiMessageSquare size={13} className="text-slate-400" />
              {isWon ? "Won Reason" : "Lost Reason"} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="closure-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isWon
                  ? "Why did we win this deal? (e.g. Strong product fit, competitive pricing)"
                  : "Why was this deal lost? (e.g. Budget constraints, chose competitor)"
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Next Step / Handover Note */}
          <div>
            <label
              htmlFor="closure-next-step"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Next Step / Handover Note{" "}
              <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="closure-next-step"
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder={
                isWon
                  ? "e.g. Schedule onboarding kickoff & share contract"
                  : "e.g. Re-engage in Q2 with updated pricing"
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Auto-updated Probability & Forecast Notice */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <FiTrendingUp
              size={15}
              className={isWon ? "shrink-0 text-emerald-600" : "shrink-0 text-rose-600"}
            />
            <span>
              Automatically sets Deal &amp; Forecast Probability to{" "}
              <strong className="text-slate-900 dark:text-white">
                {isWon ? "100%" : "0%"}
              </strong>{" "}
              and Forecast Category to{" "}
              <strong className="text-slate-900 dark:text-white">Closed</strong>.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isWon
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {submitting
                ? "Saving..."
                : isWon
                  ? "Confirm Closed Won"
                  : "Confirm Closed Lost"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default DealClosureModal;
