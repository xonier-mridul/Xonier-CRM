"use client"
import React, { useRef, useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";

export type ModalVariant = "info" | "success" | "danger" | "warning";

const variantStyles: Record<
  ModalVariant,
  { button: string; checkbox: string; warning: string }
> = {
  info: {
    button: "bg-cyan-500 hover:bg-cyan-600",
    checkbox: "accent-white",
    warning: "text-cyan-500",
  },
  success: {
    button: "bg-green-500 hover:bg-green-600",
    checkbox: "accent-green-500",
    warning: "text-green-500",
  },
  danger: {
    button: "bg-red-500 hover:bg-red-600",
    checkbox: "accent-red-500",
    warning: "text-red-500",
  },
  warning: {
    button: "bg-amber-500 hover:bg-amber-600",
    checkbox: "accent-amber-500",
    warning: "text-amber-500",
  },
};

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

  // Reset state whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
      setHasScrolledToEnd(!requireScroll);
    }
  }, [isOpen, requireScroll]);

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-900/10 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300">
                {icon}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3">
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}

          {children ? (
            <div
              ref={scrollRef}
              onScroll={requireScroll ? handleScroll : undefined}
              className="max-h-48 overflow-y-auto text-xs leading-relaxed text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-900/40 border border-slate-900/10 dark:border-gray-700 rounded-lg p-4"
            >
              {children}
            </div>
          ) : terms && terms.length > 0 ? (
            <div
              ref={scrollRef}
              onScroll={requireScroll ? handleScroll : undefined}
              className="h-48 overflow-y-auto text-xs leading-relaxed text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-900/40 border border-slate-900/10 dark:border-gray-700 rounded-lg p-4 space-y-3"
            >
              {terms.map((term, i) => (
                <p key={i}>
                  {i + 1}. {term}
                </p>
              ))}
            </div>
          ) : null}

          {requireScroll && !hasScrolledToEnd && (terms?.length || children) && (
            <p className={`text-[11px] flex items-center gap-1 ${styles.warning}`}>
              {t("scroll_to_continue") ||
                "Scroll to the bottom to enable agreement checkbox"}
            </p>
          )}

          <label
            className={`flex items-center gap-2 text-sm select-none ${
              hasScrolledToEnd
                ? "text-slate-700 dark:text-slate-200 cursor-pointer"
                : "text-gray-400 cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              disabled={!hasScrolledToEnd}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={`h-4 w-4  disabled:cursor-not-allowed ${styles.checkbox}`}
            />
            {checkboxLabel ||
              t("agree_terms") ||
              "I have read and agree to the terms & conditions."}
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-900/10 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-900/10 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel || t("cancel") || "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!agreed || isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${styles.button}`}
          >
            {isLoading
              ? t("processing") || "Processing..."
              : confirmLabel || t("confirm") || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsConfirmModal;