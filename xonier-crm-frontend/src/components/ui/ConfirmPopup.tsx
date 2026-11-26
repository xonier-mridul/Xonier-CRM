"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import i18n from "i18next";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  LockKeyhole,
  LogOut,
  Search,
  Trash2,
  X,
} from "lucide-react";

export type ConfirmPopupVariant = "danger" | "warning" | "primary" | "info";

export interface ConfirmPopupInputConfig {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface ConfirmPopupInterface {
  title: string;
  text?: string;
  btnTxt?: string;
  cancelTxt?: string;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxDefaultChecked?: boolean;
  checkedBtnTxt?: string;
  checkedTitle?: string;
  checkedText?: string;
  variant?: ConfirmPopupVariant;
  input?: ConfirmPopupInputConfig;
}

export interface ConfirmPopupResult {
  isConfirmed: boolean;
  isChecked: boolean;
  inputValue?: string;
}

function inferVariant(
  explicitVariant: ConfirmPopupVariant | undefined,
  title: string,
  text: string,
  btnText: string
): ConfirmPopupVariant {
  if (explicitVariant) return explicitVariant;
  const combined = `${title} ${text} ${btnText}`.toLowerCase();
  if (
    /\b(delete|remove|destroy|purge|discard|revoke|terminate|drop)\b/.test(
      combined
    )
  ) {
    return "danger";
  }
  if (
    /\b(lock|logout|log out|sign out|irreversible|cannot be undone|won't be able to edit|not able to update|reverse)\b/.test(
      combined
    )
  ) {
    return "warning";
  }
  return "primary";
}

function VariantIcon({
  variant,
  title,
  text,
  btnText,
}: {
  variant: ConfirmPopupVariant;
  title: string;
  text: string;
  btnText: string;
}) {
  const combined = `${title} ${text} ${btnText}`.toLowerCase();

  if (variant === "danger") {
    if (/\b(delete|remove|purge|trash|discard)\b/.test(combined)) {
      return <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.9} />;
    }
    return <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  }

  if (variant === "warning") {
    if (/\b(logout|log out|sign out)\b/.test(combined)) {
      return <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />;
    }
    if (/\b(lock|submit|final)\b/.test(combined)) {
      return <LockKeyhole className="h-[18px] w-[18px]" strokeWidth={1.9} />;
    }
    return <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  }

  if (/\b(search|find|lookup|teammate|member)\b/.test(combined)) {
    return <Search className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  }

  if (/\b(draft|save|report)\b/.test(combined)) {
    return <FileText className="h-[18px] w-[18px]" strokeWidth={1.9} />;
  }

  return <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.9} />;
}

const VARIANT_STYLES: Record<
  ConfirmPopupVariant,
  {
    iconBox: string;
    confirmBtn: string;
    checkboxCardChecked: string;
    checkboxBoxChecked: string;
  }
> = {
  danger: {
    iconBox:
      "bg-rose-50 text-rose-600 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25",
    confirmBtn:
      "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-[0_1px_2px_rgba(225,29,72,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-rose-500/50",
    checkboxCardChecked:
      "border-rose-200/90 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/[0.07]",
    checkboxBoxChecked:
      "border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500",
  },
  warning: {
    iconBox:
      "bg-amber-50 text-amber-600 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25",
    confirmBtn:
      "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700 focus-visible:ring-slate-500/50 dark:focus-visible:ring-indigo-500/50",
    checkboxCardChecked:
      "border-amber-200/90 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/[0.07]",
    checkboxBoxChecked:
      "border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500",
  },
  primary: {
    iconBox:
      "bg-indigo-50 text-indigo-600 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/25",
    confirmBtn:
      "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-[0_1px_2px_rgba(79,70,229,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-indigo-500/50",
    checkboxCardChecked:
      "border-indigo-200/90 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/[0.07]",
    checkboxBoxChecked:
      "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500",
  },
  info: {
    iconBox:
      "bg-cyan-50 text-cyan-600 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/25",
    confirmBtn:
      "bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 shadow-[0_1px_2px_rgba(1,114,142,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:ring-cyan-500/50",
    checkboxCardChecked:
      "border-cyan-200/90 bg-cyan-50/50 dark:border-cyan-500/30 dark:bg-cyan-500/[0.07]",
    checkboxBoxChecked:
      "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500",
  },
};

interface DialogProps extends ConfirmPopupInterface {
  onResolve: (result: ConfirmPopupResult) => void;
}

function ConfirmDialog({
  title,
  text,
  btnTxt = "yes_continue",
  cancelTxt = "cancel",
  showCheckbox = false,
  checkboxLabel = "",
  checkboxDefaultChecked = false,
  checkedBtnTxt,
  checkedTitle,
  checkedText,
  variant: explicitVariant,
  input,
  onResolve,
}: DialogProps) {
  const [isChecked, setIsChecked] = useState<boolean>(checkboxDefaultChecked);
  const [inputValue, setInputValue] = useState<string>(input?.defaultValue ?? "");
  const [visible, setVisible] = useState<boolean>(false);

  const settledRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descId = useId();
  const checkboxId = useId();
  const inputId = useId();

  const btnText = i18n.t(btnTxt) || btnTxt;
  const cancelText = i18n.t(cancelTxt) || cancelTxt;
  const checkedBtnText = checkedBtnTxt ? i18n.t(checkedBtnTxt) || checkedBtnTxt : btnText;

  const activeTitle =
    showCheckbox && isChecked ? (checkedTitle ?? title) : title;
  const activeText =
    showCheckbox && isChecked ? (checkedText ?? text ?? "") : (text ?? "");
  const activeBtnText = showCheckbox && isChecked ? checkedBtnText : btnText;
  const isInputRequired = Boolean(input && input.required !== false);
  const isInputInvalid = isInputRequired && !inputValue.trim();

  const variant = inferVariant(
    explicitVariant,
    activeTitle,
    activeText,
    activeBtnText
  );
  const styles = VARIANT_STYLES[variant];

  const closeWith = (confirmed: boolean) => {
    if (confirmed && isInputInvalid) return;
    if (settledRef.current) return;
    settledRef.current = true;
    const finalChecked = confirmed ? isChecked : false;
    const finalInput = confirmed && input ? inputValue.trim() : undefined;
    setVisible(false);

    window.setTimeout(() => {
      previousFocusRef.current?.focus?.();
      onResolve({
        isConfirmed: confirmed,
        isChecked: finalChecked,
        inputValue: finalInput,
      });
    }, 170);
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      setVisible(true);
      if (input) {
        inputRef.current?.focus();
      } else {
        cancelBtnRef.current?.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeWith(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showLockButtonIcon =
    variant === "warning" &&
    /\b(lock|submit|final)\b/i.test(`${activeTitle} ${activeText}`);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="presentation"
    >
      {/* Frosted glass backdrop */}
      <div
        aria-hidden="true"
        onClick={() => closeWith(false)}
        className="fixed inset-0 bg-slate-950/30 dark:bg-slate-950/55 backdrop-blur-[2px]"
      />

      {/* Modal surface */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={activeText ? descId : undefined}
        className={`relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22),0_4px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_28px_72px_-16px_rgba(0,0,0,0.85)] dark:ring-white/[0.06] transition-all duration-200 ease-out ${
          visible
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-[0.96] translate-y-2 opacity-0"
        }`}
      >
        {/* Main content */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {/* Icon squircle */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${styles.iconBox}`}
            >
              <VariantIcon
                variant={variant}
                title={activeTitle}
                text={activeText}
                btnText={activeBtnText}
              />
            </div>

            {/* Copy */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-[15.5px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-slate-50"
                >
                  {activeTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => closeWith(false)}
                  aria-label={cancelText}
                  className="-mr-1.5 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {activeText ? (
                <p
                  id={descId}
                  className="mt-1.5 text-[13.5px] leading-[1.55] text-slate-500 dark:text-slate-400"
                >
                  {activeText}
                </p>
              ) : null}
            </div>
          </div>

          {/* Optional prompt input */}
          {input && (
            <div className="mt-4">
              {input.label && (
                <label
                  htmlFor={inputId}
                  className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300"
                >
                  {input.label}
                </label>
              )}
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isInputInvalid) {
                    e.preventDefault();
                    closeWith(true);
                  }
                }}
                placeholder={input.placeholder}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 transition-all duration-150"
              />
            </div>
          )}

          {/* Optional interactive option card */}
          {showCheckbox && (
            <label
              htmlFor={checkboxId}
              className={`mt-5 flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer select-none transition-all duration-150 ${
                isChecked
                  ? styles.checkboxCardChecked
                  : "border-slate-200/90 bg-slate-50/75 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
              }`}
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 peer-focus-visible:ring-offset-1 ${
                  isChecked
                    ? styles.checkboxBoxChecked
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                }`}
              >
                {isChecked && <Check className="h-3 w-3" strokeWidth={2.75} />}
              </span>
              <span className="text-[12.5px] font-medium leading-[1.45] text-slate-700 dark:text-slate-300">
                {checkboxLabel}
              </span>
            </label>
          )}
        </div>

        {/* Footer action bar */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <kbd className="inline-flex h-5 items-center rounded border border-slate-200/90 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Esc
            </kbd>
            <span>to dismiss</span>
          </div>

          <div className="flex flex-1 sm:flex-initial items-center justify-end gap-2.5">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={() => closeWith(false)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={isInputInvalid}
              onClick={() => closeWith(true)}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${styles.confirmBtn}`}
            >
              {showLockButtonIcon && (
                <LockKeyhole className="h-3.5 w-3.5 opacity-90" strokeWidth={2} />
              )}
              <span>{activeBtnText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ConfirmPopup = (
  props: ConfirmPopupInterface
): Promise<ConfirmPopupResult> => {
  if (typeof document === "undefined") {
    return Promise.resolve({ isConfirmed: false, isChecked: false });
  }

  return new Promise<ConfirmPopupResult>((resolve) => {
    const container = document.createElement("div");
    container.setAttribute("data-confirm-popup-root", "true");
    document.body.appendChild(container);

    const root = createRoot(container);

    const handleResolve = (result: ConfirmPopupResult) => {
      root.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      resolve(result);
    };

    root.render(<ConfirmDialog {...props} onResolve={handleResolve} />);
  });
};

export default ConfirmPopup;
