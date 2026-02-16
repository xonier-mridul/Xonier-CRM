"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import InvoiceService from "@/src/services/invoice.service";
import { Invoice } from "@/src/types/invoice/invoice.types";
import { INVOICE_STATUS, PERMISSIONS } from "@/src/constants/enum";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ErrorComponent from "@/src/components/ui/ErrorComponent";
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
  IoCreateOutline,
  IoDownloadOutline,
  IoPrintOutline,
  IoSendOutline,
  IoInformationCircleOutline,
  IoReceiptOutline,
  IoCardOutline,
  IoLocationOutline,
  IoStatsChartOutline,
  IoPricetagOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import {
  MdOutlineEdit,
  MdDeleteOutline,
  MdTimeline,
  MdPayment,
} from "react-icons/md";
import { FaRegUser, FaRegPaperPlane, FaPercent } from "react-icons/fa";
import { handleCopy } from "@/src/app/utils/clipboard.utils";

const InvoiceViewPage = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [err, setErr] = useState<string[] | string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "deal" | "payment">(
    "overview"
  );

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const getInvoiceData = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await InvoiceService.getById(id);

      if (result.status === 200) {
        setInvoiceData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
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

  useEffect(() => {
    if (!id) return;
    getInvoiceData(String(id));
  }, [id]);

  const handleDelete = async () => {
    if (!invoiceData) return;

    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete invoice "${invoiceData.invoiceId}"?`,
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        
        toast.success("Invoice deleted successfully");
        router.push("/invoices");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        toast.error(`${messages}`);
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  const handleSendInvoice = async () => {
    toast.info("Send invoice functionality coming soon");
  };

  const handleDownload = async (id: string) => {
    if(!id){
      toast.info("Invoice id not found")
      return
    }
  try {

    const result = await InvoiceService.download(id);
    
    if (result.status === 200) {

      const blob = new Blob([result.data], { type: 'application/pdf' });
      

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${id}.pdf`;
      

      document.body.appendChild(link);
      link.click();
      
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const messages = extractErrorMessages(error);
      toast.error(`${messages}`);
    } else {
      toast.error("Something went wrong");
    }
  }
};

  const handlePrint = async () => {
    window.print();
  };

  const handleMarkAsPaid = async () => {
    toast.info("Mark as paid functionality coming soon");
  };

  const getStatusColor = (status: INVOICE_STATUS) => {
    const colors = {
      [INVOICE_STATUS.DRAFT]:
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      [INVOICE_STATUS.SENT]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      [INVOICE_STATUS.PAID]:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      [INVOICE_STATUS.PARTIALLY_PAID]:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      [INVOICE_STATUS.OVERDUE]:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      [INVOICE_STATUS.CANCELLED]:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || colors[INVOICE_STATUS.DRAFT];
  };

  const getStatusIcon = (status: INVOICE_STATUS) => {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return <IoCheckmarkCircle className="w-4 h-4" />;
      case INVOICE_STATUS.CANCELLED:
        return <IoCloseCircle className="w-4 h-4" />;
      case INVOICE_STATUS.OVERDUE:
        return <IoAlertCircleOutline className="w-4 h-4" />;
      case INVOICE_STATUS.SENT:
        return <IoSendOutline className="w-4 h-4" />;
      case INVOICE_STATUS.PARTIALLY_PAID:
        return <IoCardOutline className="w-4 h-4" />;
      default:
        return <IoDocumentText className="w-4 h-4" />;
    }
  };

  const calculateBalance = () => {
    if (!invoiceData) return 0;
    return invoiceData.total - (invoiceData.paidAmount || 0);
  };

  const calculatePaymentPercentage = () => {
    if (!invoiceData || invoiceData.total === 0) return 0;
    return ((invoiceData.paidAmount || 0) / invoiceData.total) * 100;
  };

  const isOverdue = () => {
    if (!invoiceData?.dueDate) return false;
    return (
      new Date(invoiceData.dueDate) < new Date() &&
      invoiceData.status !== INVOICE_STATUS.PAID
    );
  };

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6 flex flex-col gap-6 animate-pulse">
        <Skeleton
          height={120}
          borderRadius={12}
          className="dark:bg-gray-700 w-full"
        />
        <Skeleton
          height={60}
          borderRadius={12}
          className="dark:bg-gray-700 w-full"
        />
        <div className="flex items-start gap-6">
          <div className="w-2/3 flex flex-col gap-6">
            <Skeleton
              height={300}
              borderRadius={12}
              className="dark:bg-gray-700 w-full"
            />
            <Skeleton
              height={200}
              borderRadius={12}
              className="dark:bg-gray-700 w-full"
            />
          </div>
          <div className="w-1/3">
            <Skeleton
              height={400}
              borderRadius={12}
              className="dark:bg-gray-700 w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="ml-72 mt-14 p-6">
        <ErrorComponent error={err} />
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoReceiptOutline className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invoice Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The invoice you're looking for doesn't exist or has been removed.
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

  const balance = calculateBalance();
  const paymentPercentage = calculatePaymentPercentage();

  console.log("invoice id: ", invoiceData.id)

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">

      <div className="mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {invoiceData.invoiceId}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    invoiceData.status as INVOICE_STATUS
                  )}`}
                >
                  {getStatusIcon(invoiceData.status as INVOICE_STATUS)}
                  {invoiceData.status}
                </span>
                {isOverdue() && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <IoAlertCircleOutline className="w-4 h-4" />
                    Overdue
                  </span>
                )}
              </div>
              <p
                className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                onClick={() =>
                  handleCopy(invoiceData ? invoiceData.invoiceId : "")
                }
              >
                <IoDocumentText className="w-4 h-4" />
                Click to copy Invoice ID
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {invoiceData.status !== INVOICE_STATUS.PAID && (
                <button
                  onClick={handleMarkAsPaid}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <IoCheckmarkCircle className="w-4 h-4" />
                  Mark as Paid
                </button>
              )}
              {invoiceData.status === INVOICE_STATUS.DRAFT && (
                <button
                  onClick={handleSendInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors group"
                >
                  <FaRegPaperPlane className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Send Invoice
                </button>
              )}
              <button
                onClick={()=>handleDownload(String(id))}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <IoDownloadOutline className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <IoPrintOutline className="w-4 h-4" />
              </button>


              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  {hasPermission(PERMISSIONS.updateInvoice) ? (
                    <Link
                      href={`/invoices/update/${invoiceData.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <IoCreateOutline className="w-4 h-4" />
                      Edit
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-4 py-2 text-gray-400 dark:text-gray-500 cursor-not-allowed">
                      <IoCreateOutline className="w-4 h-4" />
                      Edit
                    </span>
                  )}
                  {hasPermission(PERMISSIONS.deleteInvoice) && (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <MdDeleteOutline className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<IoCashOutline className="w-6 h-6" />}
          label="Total Amount"
          value={`₹ ${invoiceData.total?.toLocaleString("en-IN")}`}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<IoCheckmarkCircle className="w-6 h-6" />}
          label="Paid Amount"
          value={`₹ ${(invoiceData.paidAmount || 0)?.toLocaleString("en-IN")}`}
          color="bg-green-500"
        />
        <MetricCard
          icon={<IoCardOutline className="w-6 h-6" />}
          label="Balance Due"
          value={`₹ ${balance?.toLocaleString("en-IN")}`}
          color={balance > 0 ? "bg-red-500" : "bg-gray-500"}
        />
        <MetricCard
          icon={<IoCalendarOutline className="w-5 h-5" />}
          label="Due Date"
          value={formatDate(invoiceData.dueDate) || "—"}
          color={isOverdue() ? "bg-red-500" : "bg-purple-500"}
        />
      </div>


      {invoiceData.status === INVOICE_STATUS.PARTIALLY_PAID && (
        <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {paymentPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${paymentPercentage}%` }}
            ></div>
          </div>
        </div>
      )}


      <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
          {(["overview", "deal", "payment"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1.5 px-1 font-medium transition-colors cursor-pointer relative whitespace-nowrap ${
                activeTab === tab
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
              )}
            </button>
          ))}
        </div>
      </div>


      <div className="flex gap-6">
        <div className="w-2/3 flex flex-col gap-6">

          {activeTab === "overview" && (
            <>

              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Customer Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label="Customer Name"
                    value={invoiceData.customerName}
                  />
                  <InfoItem
                    icon={<IoMailOutline className="w-4 h-4" />}
                    label="Email"
                    value={invoiceData.customerEmail}
                  />
                  <InfoItem
                    icon={<IoCallOutline className="w-4 h-4" />}
                    label="Phone"
                    value={invoiceData.customerPhone}
                  />
                  <InfoItem
                    icon={<IoBusinessOutline className="w-4 h-4" />}
                    label="Company"
                    value={invoiceData.companyName || "—"}
                  />
                  <InfoItem
                    icon={<IoLocationOutline className="w-4 h-4" />}
                    label="Billing Address"
                    value={invoiceData.billingAddress || "—"}
                  />
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <IoReceiptOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invoice Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<IoDocumentText className="w-4 h-4" />}
                    label="Invoice ID"
                    value={invoiceData.invoiceId}
                  />
                  <InfoItem
                    icon={<IoCalendarOutline className="w-4 h-4" />}
                    label="Issue Date"
                    value={invoiceData.issueDate ?formatDate(invoiceData.issueDate): "--"}
                  />
                  <InfoItem
                    icon={<IoCalendarOutline className="w-4 h-4" />}
                    label="Due Date"
                    value={formatDate(invoiceData.dueDate) || "—"}
                  />
                  <InfoItem
                    icon={<IoStatsChartOutline className="w-4 h-4" />}
                    label="Status"
                    value={invoiceData.status}
                  />
                  <InfoItem
                    icon={<IoCashOutline className="w-4 h-4" />}
                    label="Subtotal"
                    value={`₹ ${invoiceData.subTotal?.toLocaleString("en-IN")}`}
                  />
                  <InfoItem
                    icon={<IoCashOutline className="w-4 h-4" />}
                    label="Total"
                    value={`₹ ${invoiceData.total?.toLocaleString("en-IN")}`}
                  />
                  <InfoItem
                    icon={<IoCheckmarkCircle className="w-4 h-4" />}
                    label="Paid Amount"
                    value={`₹ ${(invoiceData.paidAmount || 0)?.toLocaleString(
                      "en-IN"
                    )}`}
                  />
                  <InfoItem
                    icon={<IoCardOutline className="w-4 h-4" />}
                    label="Balance"
                    value={`₹ ${balance?.toLocaleString("en-IN")}`}
                  />
                  <InfoItem
                    icon={<IoCalendarOutline className="w-4 h-4" />}
                    label="Last Payment"
                    value={
                      invoiceData.lastPaymentDate
                        ? formatDate(invoiceData.lastPaymentDate)
                        : "—"
                    }
                  />
                </div>

                {invoiceData.notes && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <IoInformationCircleOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes
                      </p>
                    </div>
                    <p className="text-gray-900 dark:text-white">
                      {invoiceData.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Deal Tab */}
          {activeTab === "deal" && (
            <>
              {invoiceData.deal && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <IoDocumentText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Associated Deal
                      </h3>
                    </div>
                    <Link
                      href={`/deals/${invoiceData.deal.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Full Deal →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem
                      icon={<IoDocumentText className="w-4 h-4" />}
                      label="Deal ID"
                      value={invoiceData.deal.deal_id}
                    />
                    <InfoItem
                      icon={<IoInformationCircleOutline className="w-4 h-4" />}
                      label="Deal Name"
                      value={invoiceData.deal.dealName}
                    />
                    <InfoItem
                      icon={<IoPricetagOutline className="w-4 h-4" />}
                      label="Deal Amount"
                      value={`₹ ${invoiceData.deal.amount?.toLocaleString(
                        "en-IN"
                      )}`}
                    />
                    <InfoItem
                      icon={<IoStatsChartOutline className="w-4 h-4" />}
                      label="Pipeline"
                      value={invoiceData.deal.dealPipeline}
                    />
                    <InfoItem
                      icon={<MdTimeline className="w-4 h-4" />}
                      label="Stage"
                      value={invoiceData.deal.dealStage}
                    />
                    <InfoItem
                      icon={<IoInformationCircleOutline className="w-4 h-4" />}
                      label="Type"
                      value={invoiceData.deal.dealType?.replace("_", " ")}
                    />
                  </div>
                </div>
              )}

              {invoiceData.quotation && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <IoDocumentText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Associated Quotation
                      </h3>
                    </div>
                    <Link
                      href={`/quotations/${invoiceData.quotation.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Quotation →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem
                      icon={<IoDocumentText className="w-4 h-4" />}
                      label="Quote ID"
                      value={invoiceData.quotation.quoteId}
                    />
                    <InfoItem
                      icon={<IoInformationCircleOutline className="w-4 h-4" />}
                      label="Title"
                      value={invoiceData.quotation.title || "—"}
                    />
                    <InfoItem
                      icon={<IoStatsChartOutline className="w-4 h-4" />}
                      label="Status"
                      value={invoiceData.quotation.quotationStatus}
                    />
                    <InfoItem
                      icon={<IoCashOutline className="w-4 h-4" />}
                      label="Quote Total"
                      value={`₹ ${invoiceData.quotation.total?.toLocaleString(
                        "en-IN"
                      )}`}
                    />
                    <InfoItem
                      icon={<IoCalendarOutline className="w-4 h-4" />}
                      label="Issue Date"
                      value={formatDate(invoiceData.quotation.issueDate)}
                    />
                    <InfoItem
                      icon={<IoCalendarOutline className="w-4 h-4" />}
                      label="Valid Until"
                      value={formatDate(invoiceData.quotation.valid)}
                    />
                  </div>

                  {invoiceData.quotation.description && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <IoInformationCircleOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </p>
                      </div>
                      <p className="text-gray-900 dark:text-white">
                        {invoiceData.quotation.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Payment Tab */}
          {activeTab === "payment" && (
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <MdPayment className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Information
                </h3>
              </div>

              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCashOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total Amount
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹ {invoiceData.total?.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Paid Amount
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹ {(invoiceData.paidAmount || 0)?.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      balance > 0
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IoCardOutline
                        className={`w-5 h-5 ${
                          balance > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Balance Due
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹ {balance?.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FaPercent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Payment Progress
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {paymentPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Payment Timeline */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Payment History
                  </h4>
                  <div className="text-center py-8">
                    <IoInformationCircleOutline className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Payment history coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-1/3 flex flex-col gap-6">
          {/* Creator Information */}
          {invoiceData.createdBy && (
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl border border-blue-400 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <FaRegUser className="text-xl text-white" />
                <h2 className="text-white font-semibold text-xl">
                  Creator Information
                </h2>
              </div>
              <div className="border-b border-white/30 w-full mb-4"></div>
              <div className="space-y-4">
                <ProfileField
                  icon={<IoPersonOutline className="w-4 h-4" />}
                  label="Name"
                  value={`${invoiceData.createdBy?.firstName} ${
                    invoiceData.createdBy?.lastName ?? ""
                  }`}
                />
                <ProfileField
                  icon={<IoMailOutline className="w-4 h-4" />}
                  label="Email"
                  value={invoiceData.createdBy?.email}
                />
                <ProfileField
                  icon={<IoCallOutline className="w-4 h-4" />}
                  label="Phone"
                  value={invoiceData.createdBy?.phone}
                />
                <ProfileField
                  icon={<IoBusinessOutline className="w-4 h-4" />}
                  label="Company"
                  value={invoiceData.createdBy?.company || "—"}
                />
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <StatItem
                label="Created"
                value={formatDate(invoiceData.createdAt)}
                color="text-gray-600 dark:text-gray-400"
              />
              <StatItem
                label="Last Updated"
                value={formatDate(invoiceData.updatedAt)}
                color="text-gray-600 dark:text-gray-400"
              />
              {isOverdue() && (
                <StatItem
                  label="Days Overdue"
                  value={Math.floor(
                    (new Date().getTime() -
                      new Date(invoiceData.dueDate!).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ).toString()}
                  color="text-red-600 dark:text-red-400"
                />
              )}
            </div>
          </div>

          {/* Payment Status Card */}
          <div
            className={`p-6 rounded-xl border shadow-lg ${
              invoiceData.status === INVOICE_STATUS.PAID
                ? "bg-gradient-to-br from-green-500 to-green-600 border-green-400"
                : invoiceData.status === INVOICE_STATUS.OVERDUE ||
                  isOverdue()
                ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400"
                : "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              {invoiceData.status === INVOICE_STATUS.PAID ? (
                <IoCheckmarkCircle className="text-2xl text-white" />
              ) : (
                <IoAlertCircleOutline className="text-2xl text-white" />
              )}
              <h2 className="text-white font-semibold text-xl">
                Payment Status
              </h2>
            </div>
            <div className="border-b border-white/30 w-full mb-4"></div>
            <div className="space-y-3 text-white">
              <div className="flex justify-between">
                <span className="text-white/80">Status</span>
                <span className="font-semibold uppercase">
                  {invoiceData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Progress</span>
                <span className="font-semibold">
                  {paymentPercentage.toFixed(0)}%
                </span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/80">Remaining</span>
                  <span className="font-semibold">
                    ₹ {balance.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewPage;

// Component for metric cards
const MetricCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) => (
  <div className="bg-white dark:bg-gray-700 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`${color} p-3 rounded-lg text-white`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
      </div>
    </div>
  </div>
);

// Component for info items with icons
const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="group">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
    <p className="font-medium text-gray-900 dark:text-white capitalize pl-6">
      {value}
    </p>
  </div>
);

// Component for profile fields in sidebar
const ProfileField = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      {icon && <span className="text-white/80">{icon}</span>}
      <span className="text-sm text-white/80">{label}</span>
    </div>
    <div className="font-medium text-white pl-6">{value}</div>
  </div>
);

// Component for quick stats
const StatItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | undefined;
  color: string;
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className={`text-sm font-medium ${color}`}>{value || "—"}</span>
  </div>
);