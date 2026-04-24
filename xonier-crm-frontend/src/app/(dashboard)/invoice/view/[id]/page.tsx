"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import InvoiceService from "@/src/services/invoice.service";
import { Invoice } from "@/src/types/invoice/invoice.types";
import { INVOICE_STATUS, PERMISSIONS } from "@/src/constants/enum";
import { User } from "@/src/types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { usePermissions } from "@/src/hooks/usePermissions";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";
import {
  IoArrowBack,
  IoDocumentText,
  IoCalendarOutline,
  IoCashOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTimeOutline,
  IoBusinessOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoEllipsisVertical,
  IoDownloadOutline,
  IoSendOutline,
  IoInformationCircleOutline,
  IoReceiptOutline,
  IoCardOutline,
  IoLocationOutline,
  IoAlertCircleOutline,
  IoFunnelOutline,
  IoTrendingUpOutline,
  IoPrintOutline,
  IoGlobeOutline,
} from "react-icons/io5";
import { MdDeleteOutline, MdPayment, MdCategory } from "react-icons/md";
import { FaRegPaperPlane, FaPercent } from "react-icons/fa";
import { handleCopy } from "@/src/app/utils/clipboard.utils";

const getFullName = (user: User) =>
  `${user.firstName}${user.lastName ? " " + user.lastName : ""}`;

const getInitials = (user: User) => {
  const f = user.firstName?.[0] || "";
  const l = user.lastName?.[0] || "";
  return (f + l).toUpperCase();
};

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);

const getStatusConfig = (status: INVOICE_STATUS) => {
  const configs: Record<INVOICE_STATUS, { bg: string; text: string; border: string; dot: string; label: string }> = {
    [INVOICE_STATUS.DRAFT]: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-600",
      dot: "bg-gray-400",
      label: "Draft",
    },
    [INVOICE_STATUS.SENT]: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-700",
      dot: "bg-blue-500",
      label: "Sent",
    },
    [INVOICE_STATUS.PAID]: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-700",
      dot: "bg-emerald-500",
      label: "Paid",
    },
    [INVOICE_STATUS.PARTIALLY_PAID]: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-700",
      dot: "bg-amber-500",
      label: "Partially Paid",
    },
    [INVOICE_STATUS.OVERDUE]: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-200 dark:border-red-700",
      dot: "bg-red-500",
      label: "Overdue",
    },
    [INVOICE_STATUS.CANCELLED]: {
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-700",
      dot: "bg-rose-500",
      label: "Cancelled",
    },
  };
  return configs[status] ?? configs[INVOICE_STATUS.DRAFT];
};

type ActiveTab = "invoice" | "deal" | "payment";

const InvoiceViewPage = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("invoice");
  const [menuOpen, setMenuOpen] = useState(false);

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const fetchInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      const result = await InvoiceService.getById(invoiceId);
      if (result.status === 200) setInvoiceData(result.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchInvoice(String(id));
  }, [id]);

  const handleDelete = async () => {
    if (!invoiceData) return;
    const confirm = await ConfirmPopup({
      title: "Delete Invoice?",
      text: `Are you sure you want to delete "${invoiceData.invoiceId}"?`,
      btnTxt: "Yes, Delete",
    });
    if (confirm) {
      toast.success("Invoice deleted successfully");
      router.push("/invoice");
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const result = await InvoiceService.download(String(id));
      if (result.status === 200) {
        const blob = new Blob([result.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `invoice_${invoiceData?.invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Invoice downloaded");
      }
    } catch {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6 space-y-4">
        <Skeleton height={100} borderRadius={16} />
        <Skeleton height={60} borderRadius={16} />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={90} borderRadius={16} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <Skeleton height={320} borderRadius={16} />
            <Skeleton height={220} borderRadius={16} />
          </div>
          <Skeleton height={560} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="ml-72 mt-14 p-6 flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <IoReceiptOutline className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invoice Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            The invoice you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <IoArrowBack className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const balance = invoiceData.total - (invoiceData.paidAmount || 0);
  const paymentPct = invoiceData.total > 0 ? ((invoiceData.paidAmount || 0) / invoiceData.total) * 100 : 0;
  const isOverdue =
    invoiceData.dueDate &&
    new Date(invoiceData.dueDate) < new Date() &&
    invoiceData.status !== INVOICE_STATUS.PAID &&
    invoiceData.status !== INVOICE_STATUS.CANCELLED;
  const daysOverdue = isOverdue
    ? Math.floor((Date.now() - new Date(invoiceData.dueDate).getTime()) / 86400000)
    : 0;
  const statusCfg = getStatusConfig(invoiceData.status as INVOICE_STATUS);

  const lineItems = invoiceData.lineItems ?? invoiceData.quotation?.lineItems ?? [];

  return (
    <div className="ml-72 mt-14 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                
                <h1
                  className="text-xl font-bold text-gray-900 dark:text-white font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => handleCopy(invoiceData.invoiceId)}
                  title="Click to copy"
                >
                  {invoiceData.invoiceId}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                    <IoAlertCircleOutline className="w-3.5 h-3.5" />
                    {daysOverdue}d Overdue
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{invoiceData.customerName}</span>
                {invoiceData.companyName ? ` · ${invoiceData.companyName}` : ""}
                {" · Due "}
                <span className={isOverdue ? "text-red-500 font-semibold" : ""}>{formatDate(invoiceData.dueDate)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {invoiceData.status !== INVOICE_STATUS.PAID && invoiceData.status !== INVOICE_STATUS.CANCELLED && (
                <button
                  onClick={() => toast.info("Mark as paid coming soon")}
                  disabled={!hasPermission(PERMISSIONS.markPaidInvoice)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoCheckmarkCircle className="w-4 h-4" />
                  Mark as Paid
                </button>
              )}
              {invoiceData.status === INVOICE_STATUS.DRAFT && (
                <button
                  onClick={() => toast.info("Send invoice coming soon")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <FaRegPaperPlane className="w-3.5 h-3.5" />
                  Send Invoice
                </button>
              )}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <IoDownloadOutline className="w-4 h-4" />
                Download PDF
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                >
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <span className="px-4 py-2.5 text-sm">Not found</span>
                    {/* {hasPermission(PERMISSIONS.deleteInvoice) && (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <MdDeleteOutline className="w-4 h-4" />
                        Delete Invoice
                      </button>
                    )} */}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Amount", value: fmt(invoiceData.total, invoiceData.currency), icon: <IoCashOutline className="w-5 h-5" />, color: "bg-blue-600" },
            { label: "Paid Amount", value: fmt(invoiceData.paidAmount || 0, invoiceData.currency), icon: <IoCheckmarkCircle className="w-5 h-5" />, color: "bg-emerald-600" },
            { label: "Balance Due", value: fmt(balance, invoiceData.currency), icon: <IoCardOutline className="w-5 h-5" />, color: balance > 0 ? "bg-red-500" : "bg-gray-400" },
            { label: "Due Date", value: formatDate(invoiceData.dueDate) || "—", icon: <IoCalendarOutline className="w-5 h-5" />, color: isOverdue ? "bg-red-500" : "bg-violet-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`${s.color} p-2.5 rounded-xl text-white shrink-0`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{s.label}</p>
                  <p className="text-base font-extrabold text-gray-900 dark:text-white truncate mt-0.5">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Payment progress ── */}
        {(invoiceData.status === INVOICE_STATUS.PARTIALLY_PAID || paymentPct > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Progress</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{paymentPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                style={{ width: `${Math.min(paymentPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-gray-400">Paid: {fmt(invoiceData.paidAmount || 0, invoiceData.currency)}</span>
              <span className="text-[11px] text-gray-400">Total: {fmt(invoiceData.total, invoiceData.currency)}</span>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 px-4 py-2 overflow-x-auto">
            {([
              { key: "invoice", label: "Invoice" },
              { key: "deal", label: "Deal & Quotation" },
              { key: "payment", label: "Payment" },
            ] as { key: ActiveTab; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* INVOICE TAB */}
            {activeTab === "invoice" && (
              <>
                {/* Customer info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <IoPersonOutline className="w-4 h-4 text-blue-500" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoBlock icon={<IoPersonOutline className="w-4 h-4" />} label="Name" value={invoiceData.customerName} />
                    <InfoBlock icon={<IoMailOutline className="w-4 h-4" />} label="Email" value={invoiceData.customerEmail} />
                    {invoiceData.customerPhone && (
                      <InfoBlock icon={<IoCallOutline className="w-4 h-4" />} label="Phone" value={invoiceData.customerPhone} />
                    )}
                    {invoiceData.companyName && (
                      <InfoBlock icon={<IoBusinessOutline className="w-4 h-4" />} label="Company" value={invoiceData.companyName} />
                    )}
                    {invoiceData.companyAddress && (
                      <InfoBlock icon={<IoLocationOutline className="w-4 h-4" />} label="Company Address" value={invoiceData.companyAddress} />
                    )}
                    {invoiceData.billingAddress && (
                      <InfoBlock icon={<IoLocationOutline className="w-4 h-4" />} label="Billing Address" value={invoiceData.billingAddress} />
                    )}
                    {invoiceData.companyWebsite && (
                      <InfoBlock icon={<IoGlobeOutline className="w-4 h-4" />} label="Website" value={invoiceData.companyWebsite} />
                    )}
                  </div>
                </div>

                {/* Line items */}
                {lineItems.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                        <IoReceiptOutline className="w-4 h-4 text-blue-500" />
                        Line Items
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                            {["Description", "Qty", "Unit Price", "Discount", "Tax", "Total"].map((h) => (
                              <th
                                key={h}
                                className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-colors"
                            >
                              <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-white">
                                {item.description}
                                {item.unit && <span className="text-gray-400 text-xs ml-1">/ {item.unit}</span>}
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{item.quantity}</td>
                              <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{fmt(item.unitPrice, invoiceData.currency)}</td>
                              <td className="px-5 py-3.5">
                                {item.discount ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.discount}%</span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                {item.taxRate ? (
                                  <span className="text-violet-600 dark:text-violet-400 font-medium">{item.taxRate}%</span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                                {fmt(item.total, invoiceData.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals breakdown */}
                    <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{fmt(invoiceData.subTotal, invoiceData.currency)}</span>
                          </div>
                          {invoiceData.discountAmount != null && invoiceData.discountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Discount{invoiceData.discountPercent ? ` (${invoiceData.discountPercent}%)` : ""}
                              </span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                -{fmt(invoiceData.discountAmount, invoiceData.currency)}
                              </span>
                            </div>
                          )}
                          {invoiceData.taxAmount != null && invoiceData.taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                Tax{invoiceData.taxPercent ? ` (${invoiceData.taxPercent}%)` : ""}
                              </span>
                              <span className="font-semibold text-gray-800 dark:text-white">+{fmt(invoiceData.taxAmount, invoiceData.currency)}</span>
                            </div>
                          )}
                          {invoiceData.shippingAmount != null && invoiceData.shippingAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                              <span className="font-semibold text-gray-800 dark:text-white">+{fmt(invoiceData.shippingAmount, invoiceData.currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-bold text-gray-900 dark:text-white">Total</span>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-lg">{fmt(invoiceData.total, invoiceData.currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Paid</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(invoiceData.paidAmount || 0, invoiceData.currency)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-bold text-gray-900 dark:text-white">Balance Due</span>
                            <span className={`font-extrabold text-base ${balance > 0 ? "text-red-500" : "text-emerald-500"}`}>
                              {fmt(balance, invoiceData.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes & Terms */}
                {(invoiceData.notes || invoiceData.termsAndConditions || invoiceData.paymentTerms) && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                    {invoiceData.paymentTerms && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5">Payment Terms</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{invoiceData.paymentTerms}</p>
                      </div>
                    )}
                    {invoiceData.notes && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">Notes</p>
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{invoiceData.notes}</p>
                      </div>
                    )}
                    {invoiceData.termsAndConditions && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Terms & Conditions</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{invoiceData.termsAndConditions}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoice meta */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <IoDocumentText className="w-4 h-4 text-blue-500" />
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoBlock icon={<IoDocumentText className="w-4 h-4" />} label="Invoice ID" value={invoiceData.invoiceId} mono />
                    {invoiceData.sourceQuoteId && (
                      <InfoBlock icon={<IoDocumentText className="w-4 h-4" />} label="Source Quote ID" value={invoiceData.sourceQuoteId} mono />
                    )}
                    {invoiceData.issueDate && (
                      <InfoBlock icon={<IoCalendarOutline className="w-4 h-4" />} label="Issue Date" value={formatDate(invoiceData.issueDate)} />
                    )}
                    <InfoBlock icon={<IoCalendarOutline className="w-4 h-4" />} label="Due Date" value={formatDate(invoiceData.dueDate)} />
                    <InfoBlock icon={<IoCashOutline className="w-4 h-4" />} label="Currency" value={invoiceData.currency} />
                    {invoiceData.lastPaymentDate && (
                      <InfoBlock icon={<IoTimeOutline className="w-4 h-4" />} label="Last Payment" value={formatDate(invoiceData.lastPaymentDate)} />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* DEAL TAB */}
            {activeTab === "deal" && (
              <div className="space-y-5">
                {invoiceData.deal && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                        <IoFunnelOutline className="w-4 h-4 text-blue-500" />
                        Associated Deal
                      </h3>
                      <Link
                        href={`/deals/view/${invoiceData.deal.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        View Deal <IoArrowBack className="w-3 h-3 rotate-180" />
                      </Link>
                    </div>

                    <div className="pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">
                      <h4 className="text-lg font-extrabold text-gray-900 dark:text-white">{invoiceData.deal.dealName}</h4>
                      <p className="text-xs text-gray-400 font-mono mt-1">{invoiceData.deal.deal_id}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Amount", value: `$${invoiceData.deal.amount?.toLocaleString("en-US")}`, icon: <IoCashOutline className="w-3.5 h-3.5" />, color: "violet" },
                        { label: "Stage", value: invoiceData.deal.dealStage, icon: <IoTrendingUpOutline className="w-3.5 h-3.5" />, color: "blue" },
                        { label: "Type", value: invoiceData.deal.dealType?.replace("_", " "), icon: <MdCategory className="w-3.5 h-3.5" />, color: "orange" },
                      ].map((s) => (
                        <div key={s.label} className={`bg-${s.color}-50 dark:bg-${s.color}-900/20 rounded-xl p-4 border border-${s.color}-100 dark:border-${s.color}-800`}>
                          <p className={`text-[10px] font-semibold text-${s.color}-600 dark:text-${s.color}-400 mb-1 flex items-center gap-1 uppercase`}>
                            {s.icon} {s.label}
                          </p>
                          <p className={`text-sm font-bold text-${s.color}-900 dark:text-${s.color}-100 capitalize`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoBlock label="Pipeline" value={invoiceData.deal.dealPipeline} />
                      {invoiceData.deal.dealProbability != null && (
                        <InfoBlock label="Win Probability" value={`${invoiceData.deal.dealProbability}%`} />
                      )}
                    </div>
                  </div>
                )}

                {invoiceData.quotation && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                        <IoDocumentText className="w-4 h-4 text-blue-500" />
                        Source Quotation
                      </h3>
                      <Link
                        href={`/quotations/view/${invoiceData.quotation.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        View Quotation <IoArrowBack className="w-3 h-3 rotate-180" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InfoBlock icon={<IoDocumentText className="w-4 h-4" />} label="Quote ID" value={invoiceData.quotation.quoteId} mono />
                      <InfoBlock icon={<IoInformationCircleOutline className="w-4 h-4" />} label="Title" value={invoiceData.quotation.title || "—"} />
                      <InfoBlock icon={<IoCheckmarkCircle className="w-4 h-4" />} label="Status" value={invoiceData.quotation.quotationStatus} />
                      <InfoBlock icon={<IoCashOutline className="w-4 h-4" />} label="Quote Total" value={fmt(invoiceData.quotation.total, invoiceData.currency)} />
                      <InfoBlock icon={<IoCalendarOutline className="w-4 h-4" />} label="Issue Date" value={invoiceData.quotation.issueDate ? formatDate(invoiceData.quotation.issueDate) : "—"} />
                      <InfoBlock icon={<IoCalendarOutline className="w-4 h-4" />} label="Valid Until" value={invoiceData.quotation.valid ? formatDate(invoiceData.quotation.valid) : "—"} />
                      {invoiceData.quotation.confirmedAt && (
                        <InfoBlock icon={<IoCheckmarkCircle className="w-4 h-4" />} label="Confirmed At" value={formatDate(invoiceData.quotation.confirmedAt)} />
                      )}
                      {invoiceData.quotation.paymentTerms && (
                        <InfoBlock icon={<IoCashOutline className="w-4 h-4" />} label="Payment Terms" value={invoiceData.quotation.paymentTerms} />
                      )}
                    </div>
                    {invoiceData.quotation.description && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Description</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.quotation.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT TAB */}
            {activeTab === "payment" && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wider">
                  <MdPayment className="w-4 h-4 text-blue-500" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Total Amount", value: fmt(invoiceData.total, invoiceData.currency), color: "blue", icon: <IoCashOutline className="w-4 h-4" /> },
                    { label: "Paid Amount", value: fmt(invoiceData.paidAmount || 0, invoiceData.currency), color: "emerald", icon: <IoCheckmarkCircle className="w-4 h-4" /> },
                    { label: "Balance Due", value: fmt(balance, invoiceData.currency), color: balance > 0 ? "red" : "gray", icon: <IoCardOutline className="w-4 h-4" /> },
                    { label: "Payment Progress", value: `${paymentPct.toFixed(1)}%`, color: "violet", icon: <FaPercent className="w-3.5 h-3.5" /> },
                  ].map((s) => (
                    <div key={s.label} className={`bg-${s.color}-50 dark:bg-${s.color}-900/20 rounded-xl p-5 border border-${s.color}-100 dark:border-${s.color}-800`}>
                      <p className={`text-xs font-medium text-${s.color}-600 dark:text-${s.color}-400 mb-2 flex items-center gap-1.5`}>
                        {s.icon} {s.label}
                      </p>
                      <p className={`text-2xl font-extrabold text-${s.color}-900 dark:text-${s.color}-100`}>{s.value}</p>
                      {s.label === "Payment Progress" && (
                        <div className="mt-2 w-full bg-violet-200 dark:bg-violet-800 rounded-full h-1.5">
                          <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${Math.min(paymentPct, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Payment History</h4>
                  <div className="text-center py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <IoInformationCircleOutline className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Payment history coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {invoiceData.createdBy && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Created By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {getInitials(invoiceData.createdBy)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{getFullName(invoiceData.createdBy)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{invoiceData.createdBy.email}</p>
                    {invoiceData.createdBy.phone && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{invoiceData.createdBy.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Invoice Summary</h3>
              <div className="space-y-3">
                <SidebarRow label="Status" value={statusCfg.label} highlight={invoiceData.status === INVOICE_STATUS.OVERDUE} />
                {invoiceData.issueDate && <SidebarRow label="Issue Date" value={formatDate(invoiceData.issueDate)} />}
                <SidebarRow label="Due Date" value={formatDate(invoiceData.dueDate)} highlight={!!isOverdue} />
                <SidebarRow label="Currency" value={invoiceData.currency} />
                <SidebarRow label="Created" value={formatDate(invoiceData.createdAt)} />
                <SidebarRow label="Updated" value={formatDate(invoiceData.updatedAt)} />
                {isOverdue && <SidebarRow label="Days Overdue" value={`${daysOverdue} days`} highlight />}
                {invoiceData.lastPaymentDate && <SidebarRow label="Last Payment" value={formatDate(invoiceData.lastPaymentDate)} />}
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${
              invoiceData.status === INVOICE_STATUS.PAID
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : isOverdue
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {invoiceData.status === INVOICE_STATUS.PAID
                  ? <IoCheckmarkCircle className="w-4 h-4 text-emerald-600" />
                  : <IoAlertCircleOutline className="w-4 h-4 text-red-500" />}
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Payment Status</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className="font-semibold text-xs uppercase text-gray-900 dark:text-white">{statusCfg.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{paymentPct.toFixed(0)}%</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500 dark:text-gray-400">Remaining</span>
                    <span className="font-extrabold text-gray-900 dark:text-white">{fmt(balance, invoiceData.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoiceData.updatedBy && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Last Updated By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {getInitials(invoiceData.updatedBy)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{getFullName(invoiceData.updatedBy)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{formatDate(invoiceData.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewPage;

const InfoBlock = ({
  icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
    <div className="flex items-center gap-1.5 mb-1">
      {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
    <p className={`text-sm font-semibold text-gray-900 dark:text-white ${icon ? "pl-5" : ""} ${mono ? "font-mono text-xs" : ""}`}>
      {value ?? "—"}
    </p>
  </div>
);

const SidebarRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
    <span className={`text-xs font-semibold ${highlight ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
      {value ?? "—"}
    </span>
  </div>
);