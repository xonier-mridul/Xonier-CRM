"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";

export type ModalVariant = "info" | "success" | "danger" | "warning";

const variantStyles: Record<
  ModalVariant,
  {
    iconBox: string;
    button: string;
    checkboxChecked: string;
    scrollHint: string;
  }
> = {
  info: {
    iconBox:
      "bg-indigo-50 text-indigo-600 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/25",
    button:
      "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-[0_1px_2px_rgba(79,70,229,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-indigo-500/50",
    checkboxChecked:
      "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500",
    scrollHint: "text-indigo-600 dark:text-indigo-400",
  },
  success: {
    iconBox:
      "bg-emerald-50 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25",
    button:
      "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-[0_1px_2px_rgba(5,150,105,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-emerald-500/50",
    checkboxChecked:
      "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500",
    scrollHint: "text-emerald-600 dark:text-emerald-400",
  },
  danger: {
    iconBox:
      "bg-rose-50 text-rose-600 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25",
    button:
      "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-[0_1px_2px_rgba(225,29,72,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-rose-500/50",
    checkboxChecked:
      "border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500",
    scrollHint: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    iconBox:
      "bg-amber-50 text-amber-600 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25",
    button:
      "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] dark:bg-indigo-600 dark:hover:bg-indigo-500 focus-visible:ring-slate-500/50",
    checkboxChecked:
      "border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500",
    scrollHint: "text-amber-600 dark:text-amber-400",
  },
};

function DefaultVariantIcon({ variant }: { variant: ModalVariant }) {
  if (variant === "danger")
    return <ShieldAlert className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  if (variant === "warning")
    return <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  if (variant === "success")
    return <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  return <Info className="h-[18px] w-[18px]" strokeWidth={1.9} />;
}

export interface TermsConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;

  title: string;
  subtitle?: string;
  description?: string;

  /** Array of term paragraphs OR pass children for full custom content */
  terms?: string[];
  children?: React.ReactNode;

  confirmLabel?: string;
  cancelLabel?: string;
  checkboxLabel?: string;

  icon?: React.ReactNode;
  variant?: ModalVariant;

  /** If false, checkbox is enabled immediately without requiring scroll */
  requireScroll?: boolean;

  isLoading?: boolean;
}

const TermsConfirmModal: React.FC<TermsConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  terms,
  children,
  confirmLabel,
  cancelLabel,
  checkboxLabel,
  icon,
  variant = "info",
  requireScroll = true,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(!requireScroll);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const styles = variantStyles[variant];

  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
      setHasScrolledToEnd(!requireScroll);
    }
  }, [isOpen, requireScroll]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        setAgreed(false);
        setHasScrolledToEnd(!requireScroll);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, onClose, requireScroll]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottomReached =
      target.scrollHeight - target.scrollTop - target.clientHeight < 10;
    if (bottomReached) {
      setHasScrolledToEnd(true);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setAgreed(false);
    setHasScrolledToEnd(!requireScroll);
    onClose();
  };

  const handleConfirm = () => {
    if (!agreed || isLoading) return;
    onConfirm();
  };

  return (
    <div
      onClick={handleClose}
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 dark:bg-slate-950/55 backdrop-blur-[2px] p-4 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22),0_4px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_28px_72px_-16px_rgba(0,0,0,0.85)] dark:ring-white/[0.06]"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${styles.iconBox}`}
            >
              {icon ?? <DefaultVariantIcon variant={variant} />}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15.5px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-slate-50">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={cancelLabel || t("cancel") || "Cancel"}
                  className="-mr-1.5 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {description && (
                <p className="mt-2 text-[13.5px] leading-[1.55] text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 flex flex-col gap-3.5">
          {children ? (
            <div
              ref={scrollRef}
              onScroll={requireScroll ? handleScroll : undefined}
              className="max-h-48 overflow-y-auto text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4"
            >
              {children}
            </div>
          ) : terms && terms.length > 0 ? (
            <div
              ref={scrollRef}
              onScroll={requireScroll ? handleScroll : undefined}
              className="h-48 overflow-y-auto text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-2.5"
            >
              {terms.map((term, i) => (
                <p key={i}>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {i + 1}.
                  </span>{" "}
                  {term}
                </p>
              ))}
            </div>
          ) : null}

          {requireScroll && !hasScrolledToEnd && (terms?.length || children) && (
            <p className={`text-[11.5px] font-medium flex items-center gap-1.5 ${styles.scrollHint}`}>
              {t("scroll_to_continue") ||
                "Scroll to the bottom to enable agreement checkbox"}
            </p>
          )}

          <label
            className={`flex items-start gap-3 rounded-xl border p-3.5 select-none transition-all duration-150 ${
              hasScrolledToEnd
                ? agreed
                  ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 cursor-pointer"
                  : "border-slate-200/90 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700 cursor-pointer"
                : "border-slate-200/60 bg-slate-50/40 text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/40 cursor-not-allowed opacity-70"
            }`}
          >
            <input
              type="checkbox"
              disabled={!hasScrolledToEnd}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ${
                agreed
                  ? styles.checkboxChecked
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
              }`}
            >
              {agreed && <Check className="h-3 w-3" strokeWidth={2.75} />}
            </span>
            <span className="text-[12.5px] font-medium leading-[1.45] text-slate-700 dark:text-slate-300">
              {checkboxLabel ||
                t("agree_terms") ||
                "I have read and agree to the terms & conditions."}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <kbd className="inline-flex h-5 items-center rounded border border-slate-200/90 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Esc
            </kbd>
            <span>to dismiss</span>
          </div>

          <div className="flex flex-1 sm:flex-initial items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {cancelLabel || t("cancel") || "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!agreed || isLoading}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${styles.button}`}
            >
              {isLoading
                ? t("processing") || "Processing..."
                : confirmLabel || t("confirm") || "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConfirmModal;
