"use client"
import extractErrorMessages from '@/src/app/utils/error.utils';
import { PERMISSIONS, QUOTATION_EVENT_TYPE, QuotationStatus, QuotationCurrency } from '@/src/constants/enum';
import { QuoteService } from '@/src/services/quote.service';
import { Quotation } from '@/src/types/quotations/quote.types';
import { User } from '@/src/types';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import React, { JSX, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import {
  IoArrowBack,
  IoDocumentText,
  IoCalendarOutline,
  IoPricetagOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTimeOutline,
  IoBusinessOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoEllipsisVertical,
  IoCreateOutline,
  IoDownloadOutline,
  IoSendOutline,
  IoInformationCircleOutline,
  IoCashOutline,
  IoTrendingUpOutline,
  IoFunnelOutline,
  IoListOutline,
  IoReceiptOutline,
  IoGlobeOutline,
  IoLocationOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';
import { FaRegPaperPlane } from "react-icons/fa";
import { MdCategory, MdTimeline, MdDeleteOutline } from 'react-icons/md';
import ConfirmPopup from '@/src/components/ui/ConfirmPopup';
import { usePermissions } from '@/src/hooks/usePermissions';
import Link from 'next/link';
import { MaskEmailField, MaskPhoneField } from '@/src/components/ui/LeadComponent';
import { QuotationHistory } from '@/src/types/quotations/quoteHistory.types';
import { QuoteHistoryService } from '@/src/services/quoteHistory.service';
import Skeleton from 'react-loading-skeleton';

const CURRENCY_SYMBOLS: Record<QuotationCurrency, string> = {
  [QuotationCurrency.USD]: '$',
  [QuotationCurrency.EUR]: '€',
  [QuotationCurrency.GBP]: '£',
  [QuotationCurrency.INR]: '₹',
  [QuotationCurrency.AED]: 'د.إ',
  [QuotationCurrency.SAR]: '﷼',
  [QuotationCurrency.PKR]: '₨',
  [QuotationCurrency.CAD]: 'CA$',
  [QuotationCurrency.AUD]: 'A$',
}

const Page = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quotation | null>(null);
  const [quoteHistoryData, setQuoteHistoryData] = useState<QuotationHistory[] | null>(null);
  const [err, setErr] = useState<string[] | string>("");
  const [quoteHistoryInfo, setQuoteHistoryInfo] = useState<string[] | string>("");
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'deal' | 'timeline'>('overview');
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const getQuoteData = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await QuoteService.get_by_id(id);
      if (result.status === 200) setQuoteData(result.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getQuoteHistory = async (quoteId: string) => {
    try {
      const result = await QuoteHistoryService.getHistoryByQuote(quoteId);
      if (result.status === 200) {
        const data = result.data.data;
        const sortedData = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        setQuoteHistoryData(sortedData);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setQuoteHistoryInfo(messages);
      } else {
        setQuoteHistoryInfo(["Quote history data not found"]);
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    getQuoteData(String(id));
    getQuoteHistory(String(id));
  }, [id]);

  const getFullName = (user: User) => `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;

  const getInitials = (user: User) => {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase();
  };

  const formatDate = (dateString: string | Date) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatDateTime = (dateString: string | Date) =>
    new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmt = (amount: number) => {
    const symbol = quoteData ? (CURRENCY_SYMBOLS[quoteData.currency] ?? '$') : '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: QuotationStatus) => {
    const colors: Record<QuotationStatus, string> = {
      [QuotationStatus.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      [QuotationStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [QuotationStatus.UPDATED]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      [QuotationStatus.RESEND]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      [QuotationStatus.VIEWED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [QuotationStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.DELETE]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      [QuotationStatus.EXPIRED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[status] || colors[QuotationStatus.DRAFT];
  };

  const getStatusIcon = (status: QuotationStatus) => {
    switch (status) {
      case QuotationStatus.ACCEPTED: return <IoCheckmarkCircle className="w-4 h-4" />;
      case QuotationStatus.REJECTED: return <IoCloseCircle className="w-4 h-4" />;
      case QuotationStatus.EXPIRED: return <IoTimeOutline className="w-4 h-4" />;
      case QuotationStatus.SENT: return <IoSendOutline className="w-4 h-4" />;
      case QuotationStatus.VIEWED: return <IoInformationCircleOutline className="w-4 h-4" />;
      default: return <IoDocumentText className="w-4 h-4" />;
    }
  };

  const handleDelete = async () => {
    if (!quoteData) return;
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete quotation "${quoteData.quoteId}"?`,
        btnTxt: "Yes, delete",
      });
      if (confirm) {
        const result = await QuoteService.delete(quoteData.id);
        if (result.status === 200) {
          toast.success("Quotation deleted successfully");
          router.push('/quotations');
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
      else toast.error("Something went wrong");
    }
  };

  const handleResend = async (id: string) => {
    setIsResending(true);
    try {
      const result = await QuoteService.resend(id);
      if (result.status === 200) {
        toast.success("Quotation resent successfully");
        await getQuoteData(id);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
      else toast.error("Something went wrong");
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
        <Skeleton height={120} borderRadius={12} className="dark:bg-gray-700 w-full" />
        <Skeleton height={60} borderRadius={12} className="dark:bg-gray-700 w-full" />
        <div className="flex items-start gap-6">
          <div className="w-2/3 flex flex-col gap-6">
            <Skeleton height={240} borderRadius={12} className="dark:bg-gray-700 w-full" />
            <Skeleton height={130} borderRadius={12} className="dark:bg-gray-700 w-full" />
          </div>
          <div className="w-1/3">
            <Skeleton height={330} borderRadius={12} className="dark:bg-gray-700 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quotation Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The quotation you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = quoteData.valid ? new Date(quoteData.valid) < new Date() : false;
  const symbol = CURRENCY_SYMBOLS[quoteData.currency] ?? '$';
  const hasLineItems = (quoteData.lineItems ?? []).length > 0;

  const resendDisabled = [
    QuotationStatus.ACCEPTED,
    QuotationStatus.DRAFT,
    QuotationStatus.REJECTED,
    QuotationStatus.EXPIRED,
    QuotationStatus.DELETE,
  ].includes(quoteData.quotationStatus);

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="mb-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">
                  {quoteData.quoteId}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quoteData.quotationStatus)}`}>
                  {getStatusIcon(quoteData.quotationStatus)}
                  {quoteData.quotationStatus}
                </span>
                {quoteData.version > 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    v{quoteData.version}
                  </span>
                )}
                {isExpired && quoteData.quotationStatus !== QuotationStatus.ACCEPTED && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <IoTimeOutline className="w-4 h-4" />
                    Expired
                  </span>
                )}
              </div>
              {quoteData.title && (
                <p className="text-base text-gray-600 dark:text-gray-400">{quoteData.title}</p>
              )}
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {quoteData.currency} · {quoteData.customerName}
                {quoteData.companyName ? ` · ${quoteData.companyName}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleResend(quoteData.id)}
                disabled={resendDisabled || isResending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                <FaRegPaperPlane className="w-3.5 h-3.5" />
                {isResending ? "Resending..." : "Resend"}
              </button>

              <button
                onClick={() => toast.info("Download coming soon")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <IoDownloadOutline className="w-4 h-4" />
                Download
              </button>

              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors">
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                <div className=" absolute border border-slate-200 rounded-xl bg-white right-0 top-20 pt-2 w-48 opacity-0 invisible translate-y-2  group-hover:opacity-100  group-hover:visible  group-hover:translate-y-0 transition-all duration-300">
                  {hasPermission(PERMISSIONS.updateQuote) && quoteData.quotationStatus !== QuotationStatus.DELETE
                    ? <Link
                        href={`/quotations/update/${quoteData.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <IoCreateOutline className="w-4 h-4" />
                        Edit Quotation
                      </Link>
                    : <span className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                        <IoCreateOutline className="w-4 h-4" />
                        Edit Quotation
                      </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mb-5">
        <div className="flex gap-1 overflow-x-auto px-4 py-2">
          {(['overview', ...(hasLineItems ? ['items'] : []), 'deal', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {activeTab === 'overview' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <IoCashOutline className="w-5 h-5 text-blue-500" />
                  Financial Summary
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Subtotal</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{fmt(quoteData.subTotal)}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{fmt(quoteData.total)}</p>
                  </div>
                </div>

                <div className="space-y-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">{fmt(quoteData.subTotal)}</span>
                  </div>
                  {(quoteData.discountAmount || quoteData.discountPercent) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Discount{quoteData.discountPercent ? ` (${quoteData.discountPercent}%)` : ''}
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        -{fmt(quoteData.discountAmount || (quoteData.subTotal * (quoteData.discountPercent ?? 0) / 100))}
                      </span>
                    </div>
                  )}
                  {(quoteData.taxAmount || quoteData.taxPercent) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Tax{quoteData.taxPercent ? ` (${quoteData.taxPercent}%)` : ''}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        +{fmt(quoteData.taxAmount || (quoteData.subTotal * (quoteData.taxPercent ?? 0) / 100))}
                      </span>
                    </div>
                  )}
                  {quoteData.shippingAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                      <span className="font-medium text-gray-900 dark:text-white">+{fmt(quoteData.shippingAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-base">{fmt(quoteData.total)}</span>
                  </div>
                </div>

                {(quoteData.paymentTerms || quoteData.paymentMethod) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {quoteData.paymentTerms && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Payment Terms</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{quoteData.paymentTerms}</p>
                      </div>
                    )}
                    {quoteData.paymentMethod && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Payment Method</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{quoteData.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <IoPersonOutline className="w-5 h-5 text-blue-500" />
                  Customer Information
                </h2>

                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {quoteData.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{quoteData.customerName}</p>
                    {quoteData.companyName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <IoBusinessOutline className="w-3.5 h-3.5" />
                        {quoteData.companyName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                    <IoMailOutline className="w-4 h-4 text-gray-400 shrink-0" />
                    <MaskEmailField label="email" value={quoteData.customerEmail} />
                  </div>
                  {quoteData.customerPhone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      <IoCallOutline className="w-4 h-4 text-gray-400 shrink-0" />
                      <MaskPhoneField label="phone" value={quoteData.customerPhone} />
                    </div>
                  )}
                  {quoteData.companyAddress && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl md:col-span-2">
                      <IoLocationOutline className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{quoteData.companyAddress}</span>
                    </div>
                  )}
                  {quoteData.companyWebsite && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl md:col-span-2">
                      <IoGlobeOutline className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={quoteData.companyWebsite} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                        {quoteData.companyWebsite}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {(quoteData.notes || quoteData.termsAndConditions) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <IoDocumentTextOutline className="w-5 h-5 text-blue-500" />
                    Notes & Terms
                  </h2>
                  {quoteData.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Notes</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {quoteData.notes}
                      </p>
                    </div>
                  )}
                  {quoteData.termsAndConditions && (
                    <div className={quoteData.notes ? "pt-4 border-t border-gray-100 dark:border-gray-700" : ""}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Terms & Conditions</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {quoteData.termsAndConditions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {quoteData.description && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <IoDocumentText className="w-5 h-5 text-blue-500" />
                    Description
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {quoteData.description}
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'items' && hasLineItems && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <IoListOutline className="w-5 h-5 text-blue-500" />
                Line Items
              </h2>

              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 rounded-l-lg">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unit</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Disc %</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tax %</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(quoteData.lineItems ?? []).map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{item.description}</td>
                        <td className="px-4 py-3.5 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400">{item.unit || '—'}</td>
                        <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300">{fmt(item.unitPrice)}</td>
                        <td className="px-4 py-3.5 text-center">
                          {item.discount
                            ? <span className="text-emerald-600 dark:text-emerald-400">{item.discount}%</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {item.taxRate
                            ? <span className="text-indigo-600 dark:text-indigo-400">{item.taxRate}%</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-white">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                      <td colSpan={6} className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">Subtotal</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{fmt(quoteData.subTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'deal' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <IoFunnelOutline className="w-5 h-5 text-blue-500" />
                Associated Deal
              </h2>

              {quoteData.deal ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between pb-5 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{quoteData.deal.dealName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Deal ID: {quoteData.deal.deal_id}</p>
                    </div>
                    <Link
                      href={`/deals/view/${quoteData.deal.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl transition-colors"
                    >
                      View Deal
                      <IoArrowBack className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <IoCashOutline className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Amount</span>
                      </div>
                      <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                        ${quoteData.deal.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <IoTrendingUpOutline className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Stage</span>
                      </div>
                      <p className="text-base font-semibold text-blue-900 dark:text-blue-100">{quoteData.deal.dealStage}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MdCategory className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Type</span>
                      </div>
                      <p className="text-base font-semibold text-orange-900 dark:text-orange-100">{quoteData.deal.dealType}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Pipeline</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{quoteData.deal.dealPipeline}</p>
                    </div>
                    {quoteData.deal.dealProbability !== null && (
                      <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Win Probability</p>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{quoteData.deal.dealProbability}%</p>
                      </div>
                    )}
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Created Date</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatDate(quoteData.deal.createDate)}</p>
                    </div>
                    {quoteData.deal.closeDate && (
                      <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Close Date</p>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatDate(quoteData.deal.closeDate)}</p>
                      </div>
                    )}
                  </div>

                  {quoteData.deal.dealDescription && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      <p className="text-xs text-gray-400 mb-2">Description</p>
                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{quoteData.deal.dealDescription}</p>
                    </div>
                  )}
                  {quoteData.deal.nextStep && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Next Step</p>
                      <p className="text-sm text-gray-900 dark:text-white">{quoteData.deal.nextStep}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <IoFunnelOutline className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No deal associated with this quotation</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <MdTimeline className="w-5 h-5 text-blue-500" />
                Activity Timeline
              </h2>

              {quoteHistoryData && quoteHistoryData.length > 0 ? (
                <div className="space-y-4">
                  {quoteHistoryData.map((history, index) => {
                    const isLast = index === quoteHistoryData.length - 1;

                    const getEventStyle = (eventType: string) => {
                      const t = eventType.toLowerCase();
                      if (t.includes(QUOTATION_EVENT_TYPE.ACCEPTED)) return { icon: <IoCheckmarkCircle className="w-5 h-5" />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.REJECTED)) return { icon: <IoCloseCircle className="w-5 h-5" />, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.UPDATED)) return { icon: <IoCreateOutline className="w-5 h-5" />, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.EMAIL_SENT)) return { icon: <IoSendOutline className="w-5 h-5" />, bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.VIEWED)) return { icon: <IoInformationCircleOutline className="w-5 h-5" />, bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.STATUS_CHANGED)) return { icon: <IoTimeOutline className="w-5 h-5" />, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.DELETE)) return { icon: <MdDeleteOutline className="w-5 h-5" />, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
                      if (t.includes(QUOTATION_EVENT_TYPE.CREATED)) return { icon: <IoCheckmarkCircle className="w-5 h-5" />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
                      return { icon: <IoDocumentText className="w-5 h-5" />, bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' };
                    };

                    const style = getEventStyle(history.eventType);

                    return (
                      <div key={history.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
                            {style.icon}
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2 min-h-[2rem]" />}
                        </div>

                        <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">
                              {history.eventType.replace(/_/g, ' ')}
                            </p>
                            <time className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {formatDateTime(history.createdAt)}
                            </time>
                          </div>

                          {(history.previousStatus || history.newStatus) && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {history.previousStatus && (
                                <>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(history.previousStatus)}`}>
                                    {history.previousStatus}
                                  </span>
                                  <span className="text-gray-400 text-xs">→</span>
                                </>
                              )}
                              {history.newStatus && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(history.newStatus)}`}>
                                  {history.newStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {history.delta && Object.keys(history.delta).length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {Object.entries(history.delta).map(([field, change]) => (
                                <div key={field} className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 capitalize">
                                    {field.replace(/([A-Z])/g, ' $1').trim()}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="text-gray-400 line-through">{String(change.old ?? 'N/A')}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-gray-900 dark:text-white font-medium">{String(change.new ?? 'N/A')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {history.performedBy && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {getInitials(history.performedBy)}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                by {getFullName(history.performedBy)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {quoteHistoryInfo && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-4">
                      <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                        {typeof quoteHistoryInfo === 'string' ? quoteHistoryInfo : quoteHistoryInfo[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <IoCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-2" />
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Quotation Created</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{formatDateTime(quoteData.createdAt)}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(quoteData.createdBy)}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">by {getFullName(quoteData.createdBy)}</span>
                      </div>
                    </div>
                  </div>

                  {quoteData.updatedBy && quoteData.updatedAt !== quoteData.createdAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <IoCreateOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Last Updated</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{formatDateTime(quoteData.updatedAt)}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {getInitials(quoteData.updatedBy)}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">by {getFullName(quoteData.updatedBy)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <IoInformationCircleOutline className="w-4 h-4 text-blue-500" />
              Details
            </h3>
            <div className="space-y-3.5">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Issue Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(quoteData.issueDate)}</p>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-0.5">Valid Until</p>
                <p className={`text-sm font-semibold ${isExpired ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {quoteData.valid ? formatDate(quoteData.valid) : '—'}
                </p>
                {isExpired && <p className="text-xs text-red-400 mt-0.5">Expired</p>}
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-0.5">Currency</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {quoteData.currency} ({symbol})
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-0.5">Payment Status</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{quoteData.paymentStatus}</p>
              </div>
              {quoteData.viewCount > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-0.5">View Count</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{quoteData.viewCount} times</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-0.5">Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(quoteData.createdAt)}</p>
              </div>
              {quoteData.updatedAt && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-0.5">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(quoteData.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Created By</h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                {getInitials(quoteData.createdBy)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{getFullName(quoteData.createdBy)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{quoteData.createdBy.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {hasPermission(PERMISSIONS.updateQuote) && quoteData.quotationStatus !== QuotationStatus.DELETE
                ? <Link
                    href={`/quotations/update/${quoteData.id}`}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium"
                  >
                    <IoCreateOutline className="w-4 h-4" />
                    Edit Quotation
                  </Link>
                : <span className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-sm text-gray-400 cursor-not-allowed font-medium">
                    <IoCreateOutline className="w-4 h-4" />
                    Edit Quotation
                  </span>
              }
            </div>
          </div>

          {isExpired && quoteData.quotationStatus !== QuotationStatus.ACCEPTED && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex gap-3">
                <IoTimeOutline className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 mb-1">Quotation Expired</h4>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    Expired on {quoteData.valid ? formatDate(quoteData.valid) : '—'}. Consider creating a new quotation or extending the validity.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;