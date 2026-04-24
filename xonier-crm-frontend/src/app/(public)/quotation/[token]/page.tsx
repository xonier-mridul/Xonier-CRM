"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Quotation } from "@/src/types/quotations/quote.types";
import { QuotationStatus } from "@/src/constants/enum";
import { QuoteService } from "@/src/services/quote.service";

type PageStatus = "loading" | "idle" | "confirming" | "confirmed" | "expired" | "error";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

const checkExpired = (d: string) => new Date(d) < new Date();

export default function QuotationConfirmPage() {
  const params = useParams();
  const token = params?.token as string;

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setPageStatus("error"); return; }

    const fetchQuotation = async () => {
        if(!token) return
      try {
        const res = await QuoteService.get_data_with_token(token);
        const data: Quotation = res.data?.data;
        setQuotation(data);

        if (data.quotationStatus === QuotationStatus.ACCEPTED) {
          setPageStatus("confirmed");
        } else if (data.valid && checkExpired(data.valid)) {
          setPageStatus("expired");
        } else {
          setPageStatus("idle");
        }
      } catch (err: any) {
        const s = err?.response?.status;
        if (s === 404 || s === 410) setPageStatus("expired");
        else setPageStatus("error");
      }
    };

    fetchQuotation();
  }, [token]);

  const handleConfirm = async () => {
    if (!agreed || pageStatus !== "idle") return;
    setPageStatus("confirming");
    setError("");
    try {
      await QuoteService.confirm(token);
      setPageStatus("confirmed");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Confirmation failed. Please try again.");
      setPageStatus("idle");
    }
  };

  const issuedByName = quotation?.createdBy
    ? `${quotation.createdBy.firstName} ${quotation.createdBy.lastName ?? ""}`.trim()
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">

      {/* ── Loading ── */}
      {pageStatus === "loading" && (
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 animate-pulse space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
            <div className="h-5 w-32 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="h-7 w-56 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700" />
            ))}
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-48 bg-gray-50 dark:bg-gray-700/50 rounded-lg" />
                <div className="h-4 w-20 bg-gray-50 dark:bg-gray-700/50 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl" />
        </div>
      )}

      {/* ── Expired ── */}
      {pageStatus === "expired" && (
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 flex items-center justify-center text-3xl mx-auto">
              ⏰
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Quotation Expired</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                This quotation link is no longer valid.
                {quotation?.valid && (
                  <span> It expired on <strong className="text-gray-600 dark:text-gray-300">{fmtDate(quotation.valid)}</strong>.</span>
                )}
                {" "}Please contact us to receive an updated quotation.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50">
              ⚠ This link has expired
            </span>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {pageStatus === "error" && (
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 flex items-center justify-center text-3xl mx-auto">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Something Went Wrong</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                We couldn't load your quotation. The link may be invalid or this quotation may no longer exist.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmed state ── */}
      {pageStatus === "confirmed" && quotation && (
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-4xl mx-auto animate-bounce">
              ✅
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Quotation Confirmed!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Thank you <strong className="text-gray-700 dark:text-gray-300">{quotation.customerName}</strong>. Your confirmation for{" "}
                <strong className="text-gray-700 dark:text-gray-300">{quotation.quoteId}</strong> has been received.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Confirmed Amount</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {fmt(quotation.total)}
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Our team will be in touch with you shortly regarding next steps.
            </p>
          </div>
        </div>
      )}

      {/* ── Main quotation view ── */}
      {(pageStatus === "idle" || pageStatus === "confirming") && quotation && (
        <div className="w-full max-w-2xl space-y-4">

          {/* Header card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                    📄 Quotation
                  </span>
                  <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">
                    {quotation.quoteId}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                    ⏳ Awaiting Confirmation
                  </span>
                </div>

                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-1">
                  {quotation.title ?? "Review & Confirm Quotation"}
                </h1>

                {quotation.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1 max-w-lg line-clamp-2">
                    {quotation.description}
                  </p>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Prepared for{" "}
                  <strong className="text-gray-700 dark:text-gray-300">{quotation.customerName}</strong>
                  {quotation.companyName && (
                    <span className="text-gray-400 dark:text-gray-500"> · {quotation.companyName}</span>
                  )}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {fmt(quotation.total)}
                </p>
                {quotation.subTotal !== quotation.total && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Subtotal: {fmt(quotation.subTotal)}
                  </p>
                )}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-50 dark:border-gray-700/50">
              {[
                { label: "Issue Date", value: fmtDate(quotation.issueDate), icon: "📅" },
                { label: "Valid Until", value: quotation.valid ? fmtDate(quotation.valid) : "—", icon: "⏳" },
                { label: "Issued By", value: issuedByName, icon: "👤" },
                { label: "Contact", value: quotation.customerEmail, icon: "✉️" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  <span className="text-sm shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{m.label}</p>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700/50">
              <h2 className="text-sm font-extrabold text-gray-700 dark:text-gray-300">💰 Pricing Summary</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Subtotal</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(quotation.subTotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-base font-extrabold text-gray-800 dark:text-white">Total</span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">{fmt(quotation.total)}</span>
              </div>
            </div>
          </div>

          {/* Deal info */}
          {quotation.deal && (
            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 px-5 py-4">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">🤝 Related Deal</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
                {(quotation.deal as any)?.title ?? (quotation.deal as any)?.name ?? String(quotation.deal)}
              </p>
            </div>
          )}

          {/* Confirm card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-gray-700 dark:text-gray-300 mb-1">✍️ Confirm Your Quotation</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Please read and agree to the terms before confirming.
              </p>
            </div>

            {/* Agreement checkbox */}
            <button
              type="button"
              onClick={() => setAgreed((a) => !a)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                agreed
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  agreed
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                }`}
              >
                {agreed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                  I agree to the terms of this quotation
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-light">
                  By confirming, I acknowledge that I have reviewed the pricing and terms outlined in quotation{" "}
                  <strong className="text-gray-500 dark:text-gray-400">{quotation.quoteId}</strong> and agree to proceed with a total of{" "}
                  <strong className="text-gray-500 dark:text-gray-400">{fmt(quotation.total)}</strong>.
                </p>
              </div>
            </button>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50">
                <span className="text-rose-500 text-sm shrink-0">⚠</span>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!agreed || pageStatus === "confirming"}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${
                agreed && pageStatus !== "confirming"
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              {pageStatus === "confirming" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Confirming…
                </>
              ) : (
                <>
                  <span>✓</span>
                  Confirm Quotation — {fmt(quotation.total)}
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-300 dark:text-gray-600">
              🔒 Secured · Your confirmation is encrypted and time-stamped
            </p>
          </div>
        </div>
      )}
    </div>
  );
}