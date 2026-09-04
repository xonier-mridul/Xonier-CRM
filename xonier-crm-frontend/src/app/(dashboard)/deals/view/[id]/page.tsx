"use client";

import { handleCopy } from "@/src/app/utils/clipboard.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import extractErrorMessages from "@/src/app/utils/error.utils";
import DataNotFound from "@/src/components/common/DataNotFound";
import {
  MaskEmailField,
  MaskPhoneField,
} from "@/src/components/ui/LeadComponent";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import dealService from "@/src/services/deal.service";
import { Deal } from "@/src/types/deals/deal.types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import {
  MdOutlineSettings,
  MdCategory,
  MdTimeline,
  MdDeleteOutline,
} from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import {
  FaRegUser,
  FaRegPaperPlane,
  FaPercent,
  FaChartLine,
  FaHandshake,
} from "react-icons/fa";
import {
  IoArrowBack,
  IoCalendarOutline,
  IoCashOutline,
  IoBusinessOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoEllipsisVertical,
  IoDuplicateOutline,
  IoDownloadOutline,
  IoPrintOutline,
  IoDocumentText,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoFunnelOutline,
  IoTrendingUpOutline,
  IoLocationOutline,
  IoGlobeOutline,
  IoBriefcaseOutline,
  IoStatsChartOutline,
  IoFlagOutline,
  IoInformationCircleOutline,
} from "react-icons/io5";
import Link from "next/link";
import { usePermissions } from "@/src/hooks/usePermissions";
import { DEAL_STATUS, PERMISSIONS } from "@/src/constants/enum";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { useTranslation } from "react-i18next";

const DealViewPage = (): JSX.Element => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [dealData, setDealData] = useState<Deal | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "lead" | "activity">(
    "overview"
  );

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const componentRef = useRef<HTMLDivElement>(null);

  const getDealData = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await dealService.getById(id);
      if (result.status === 200) {
        setDealData(result.data.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) getDealData(id as string);
  }, [id]);

  const handleDelete = async () => {
    if (!dealData) return;

    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete deal "${dealData.dealName}"?`,
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        const result = await dealService.delete(dealData.id);
        if (result.status === 200) {
          toast.success("Deal deleted successfully");
          router.push("/deals");
        }
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

  const handleDuplicate = async () => {
    toast.info("Duplicate functionality coming soon");
  };

  const handleDownload = async () => {
    toast.info("Download functionality coming soon");
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Deal-${dealData?.deal_id}`,
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        setIsPrinting(true);
        resolve();
      });
    },
    onAfterPrint: () => setIsPrinting(false),
  });

  const getDealStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      qualification:
        "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
      proposal:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      negotiation:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      closed_won:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      closed_lost:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      colors[stage] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getDealTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      new_business:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      existing_business:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      renewal:
        "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    };
    return (
      colors[type] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-6 animate-pulse">
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

  if (!dealData) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t("deal_not_found")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("the_deal_you're_looking_for_doesn't")}
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              {t("go_back")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { lead_id: lead } = dealData;
  const date = formatDate(dealData?.createDate);

  return (
    <div className="min-h-screen">
      {/* Global print styles: fixes gap-based whitespace at page breaks */}
      <style>{`
        @media print {
          /* Convert flex+gap layout to block so gaps don't create dead space at page breaks */
          .print-col-stack { display: block !important; }
          .print-col-stack > * { margin-bottom: 1.5rem; width: 100% !important; }

          /* Prevent section headings from being orphaned at bottom of page */
          h3 { break-after: avoid; }

          /* Metric grid: force 4 columns */
          .metric-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      <div ref={componentRef} className="print:p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div
            className={`${
              dealData.status === DEAL_STATUS.DELETE
                ? "border-red-400 bg-red-100 "
                : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-700"
            } rounded-xl border p-6`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1
                    className={`${
                      dealData.status === DEAL_STATUS.DELETE
                        ? "text-red-500 "
                        : "text-gray-900 dark:text-white"
                    } text-3xl font-bold line-clamp-1 w-64 capitalize`}
                  >
                    {dealData?.dealName}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${getDealStageColor(
                      dealData?.dealStage
                    )}`}
                  >
                    <IoFunnelOutline className="w-4 h-4 text-[10px]" />
                    {dealData?.dealStage?.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${getDealTypeColor(
                      dealData?.dealType
                    )}`}
                  >
                    <IoBriefcaseOutline className="w-4 h-4" />
                    {dealData?.dealType?.replace("_", " ")}
                  </span>
                </div>
                <p
                  className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors flex items-center gap-2"
                  onClick={() => handleCopy(dealData ? dealData.deal_id : "")}
                >
                  <IoDocumentText className="w-4 h-4" />
                  {t("deal_id")} <span className="font-mono">{dealData?.deal_id}</span>
                </p>
              </div>

              {/* Hide action buttons when printing */}
           
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                {hasPermission(PERMISSIONS.createQuote) &&
                  dealData.status !== DEAL_STATUS.DELETE && (
                    <Link
                      href={`/deals/quotation/${dealData.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors group"
                    >
                      <FaRegPaperPlane className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {t("send_quotation")}
                    </Link>
                  )}

                {/* <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <IoPrintOutline className="w-4 h-4" />
                </button> */}

                {/* More Actions Dropdown */}
                <div className="relative group ">
                  <button className="inline-flexitems-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <IoEllipsisVertical className="w-5 h-5" />
                  </button>
                  <div className="opacity-0 invisible  group-hover:visible   translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute right-0 top-10 mt-2 w-48 py-3  bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700  z-10">
                    {hasPermission(PERMISSIONS.updateDeal) &&
                    dealData.status !== DEAL_STATUS.DELETE ? (
                      <Link
                        href={`/deals/update/${dealData.id}`}
                        className="w-full flex items-center gap-2  px-4 py-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                      >
                        <MdOutlineSettings className="w-4 h-4" />
                        {t("update_deal")}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-4 py-2 opacity-60 rounded-lg cursor-not-allowed">
                        <MdOutlineSettings className="w-4 h-4" />
                        {t("update_deal")}
                      </span>
                    )}

                    {hasPermission(PERMISSIONS.deleteDeal) &&
                      dealData.status !== DEAL_STATUS.DELETE && (
                        <button
                          onClick={handleDelete}
                          className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <MdDeleteOutline className="w-4 h-4" />
                          {t("delete")}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="metric-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<IoCashOutline className="w-6 h-6" />}
            label={t("deal_amount")}
            value={`$ ${dealData?.amount?.toLocaleString("en-IN")}`}
            color="bg-green-500"
          />
          <MetricCard
            icon={<FaPercent className="w-5 h-5" />}
            label={t("deal_probability")}
            value={`${dealData?.dealProbability ?? 0}%`}
            color="bg-cyan-500"
          />
          <MetricCard
            icon={<FaChartLine className="w-5 h-5" />}
            label={t("forecast_probability")}
            value={`${dealData?.forecastProbability ?? 0}%`}
            color="bg-purple-500"
          />
          {date && (
            <MetricCard
              icon={<IoCalendarOutline className="w-5 h-5" />}
              label={t("created")}
              value={date}
              color="bg-amber-500"
            />
          )}
        </div>

        {/* Hide tab nav when printing */}
        {!isPrinting && (
          <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
              {(["overview", "lead", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-1.5 px-1 font-medium transition-colors cursor-pointer relative whitespace-nowrap ${
                    activeTab === tab
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600 dark:bg-cyan-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content: stacked on print via print-col-stack */}
        <div className="flex gap-6 print-col-stack">
          <div className="w-2/3 print:w-full flex flex-col gap-6">
            {/* Overview Tab */}
            {(activeTab === "overview" || isPrinting) && (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
                <div className="flex items-center gap-2 mb-6">
                  <IoStatsChartOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("deal_information")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<IoFunnelOutline className="w-4 h-4" />}
                    label={t("pipeline")}
                    value={dealData?.dealPipeline}
                  />
                  <InfoItem
                    icon={<MdTimeline className="w-4 h-4" />}
                    label={t("stage")}
                    value={dealData?.dealStage}
                  />
                  <InfoItem
                    icon={<MdCategory className="w-4 h-4" />}
                    label={t("type")}
                    value={dealData?.dealType}
                  />
                  <InfoItem
                    icon={<IoCashOutline className="w-4 h-4" />}
                    label={t("amount")}
                    value={`$ ${dealData?.amount?.toLocaleString("en-IN")}`}
                  />
                  <InfoItem
                    icon={<FaPercent className="w-4 h-4" />}
                    label={t("deal_probability")}
                    value={`${dealData?.dealProbability ?? 0}%`}
                  />
                  <InfoItem
                    icon={<IoTrendingUpOutline className="w-4 h-4" />}
                    label={t("forecast_category")}
                    value={dealData?.forecastCategory ?? "—"}
                  />
                  <InfoItem
                    icon={<IoCalendarOutline className="w-4 h-4" />}
                    label={t("create_date")}
                    value={date}
                  />
                  <InfoItem
                    icon={<IoCalendarOutline className="w-4 h-4" />}
                    label={t("close_date")}
                    value={dealData?.closeDate ?? "—"}
                  />
                  <InfoItem
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label={t("deal_owner")}
                    value={dealData?.dealOwner ?? "—"}
                  />
                  <InfoItem
                    icon={<FaHandshake className="w-4 h-4" />}
                    label={t("deal_collaborator")}
                    value={dealData?.dealCollaborator ?? "—"}
                  />
                  <InfoItem
                    icon={<IoFlagOutline className="w-4 h-4" />}
                    label={t("next_step")}
                    value={dealData?.nextStep ?? "—"}
                  />
                  <InfoItem
                    icon={<IoCheckmarkCircle className="w-4 h-4" />}
                    label={t("closed_won_reason")}
                    value={dealData?.closedWonReason ?? "—"}
                  />
                  <InfoItem
                    icon={<IoCloseCircle className="w-4 h-4" />}
                    label={t("closed_lost_reason")}
                    value={dealData?.closedLostReason ?? "—"}
                  />
                  <InfoItem
                    icon={<IoInformationCircleOutline className="w-4 h-4" />}
                    label={t("original_traffic_source")}
                    value={dealData?.originalTrafficSource ?? "—"}
                  />
                  <InfoItem
                    icon={<FaChartLine className="w-4 h-4" />}
                    label={t("forecast_probability")}
                    value={`${dealData?.forecastProbability ?? 0}%`}
                  />
                </div>

                {dealData?.dealDescription && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg break-inside-avoid">
                    <div className="flex items-center gap-2 mb-2">
                      <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("description_2")}
                      </p>
                    </div>
                    <p className="text-gray-900 dark:text-white">
                      {dealData.dealDescription}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lead Tab */}
            {(activeTab === "lead" || isPrinting) && (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
                <div className="flex items-center gap-2 mb-6">
                  <IoPersonOutline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("lead_information")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label={t("full_name")}
                    value={lead.fullName}
                  />
                  <MaskEmailField label={t("email")} value={lead.email} />
                  <MaskPhoneField label={t("phone")} value={lead.phone} />
                  <InfoItem
                    icon={<IoBusinessOutline className="w-4 h-4" />}
                    label={t("company")}
                    value={lead.companyName ?? "—"}
                  />
                  <InfoItem
                    icon={<IoFlagOutline className="w-4 h-4" />}
                    label={t("priority")}
                    value={lead.priority}
                  />
                  <InfoItem
                    icon={<IoStatsChartOutline className="w-4 h-4" />}
                    label={t("status")}
                    value={lead.status}
                  />
                  <InfoItem
                    icon={<IoInformationCircleOutline className="w-4 h-4" />}
                    label={t("source")}
                    value={lead.source}
                  />
                  <InfoItem
                    icon={<IoBriefcaseOutline className="w-4 h-4" />}
                    label={t("project_type")}
                    value={lead.projectType}
                  />
                  <InfoItem
                    icon={<IoLocationOutline className="w-4 h-4" />}
                    label={t("city")}
                    value={lead.city ?? "—"}
                  />
                  <InfoItem
                    icon={<IoGlobeOutline className="w-4 h-4" />}
                    label={t("country")}
                    value={lead.country ?? "—"}
                  />
                </div>

                {lead.message && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg break-inside-avoid">
                    <div className="flex items-center gap-2 mb-2">
                      <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("lead_message")}
                      </p>
                    </div>
                    <p className="text-gray-900 dark:text-white">
                      {lead.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab — hidden when printing */}
            {activeTab === "activity" && !isPrinting && (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <MdTimeline className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("activity_timeline")}
                  </h3>
                </div>
                <div className="text-center py-12">
                  <IoInformationCircleOutline className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t("activity_timeline_coming_soon")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - full width on print */}
          <div className="w-1/3 print:w-full flex flex-col gap-6">
            {/* Creator Information */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-xl border border-cyan-400 shadow-lg break-inside-avoid">
              <div className="flex items-center gap-2 mb-4">
                <FaRegUser className="text-xl text-white" />
                <h2 className="text-white font-semibold text-xl">
                  {t("creator_information")}
                </h2>
              </div>
              <div className="border-b border-white/30 w-full mb-4"></div>
              {dealData.createdBy ? (
                <div className="space-y-4">
                  <ProfileField
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label={t("name_2")}
                    value={`${dealData.createdBy?.firstName} ${
                      dealData.createdBy?.lastName ?? ""
                    }`}
                  />
                  <ProfileField
                    icon={<IoMailOutline className="w-4 h-4" />}
                    label={t("email")}
                    value={dealData.createdBy?.email}
                  />
                  <ProfileField
                    icon={<IoCallOutline className="w-4 h-4" />}
                    label={t("phone")}
                    value={dealData.createdBy?.phone}
                  />
                  
                </div>
              ) : (
                <p className="text-white text-center py-4">
                  {t("creator_data_not_found")}
                </p>
              )}
            </div>

            {/* Assigned To Information */}
            {dealData.assignedTo && (
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl border border-indigo-400 shadow-lg break-inside-avoid">
                <div className="flex items-center gap-2 mb-4">
                  <FaRegUser className="text-xl text-white" />
                  <h2 className="text-white font-semibold text-xl">
                    Assigned To
                  </h2>
                </div>
                <div className="border-b border-white/30 w-full mb-4"></div>
                <div className="space-y-4">
                  <ProfileField
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label={t("name_2")}
                    value={`${dealData.assignedTo.firstName} ${
                      dealData.assignedTo.lastName ?? ""
                    }`}
                  />
                  <ProfileField
                    icon={<IoMailOutline className="w-4 h-4" />}
                    label={t("email")}
                    value={dealData.assignedTo.email}
                  />
                  <ProfileField
                    icon={<IoCallOutline className="w-4 h-4" />}
                    label={t("phone")}
                    value={dealData.assignedTo.phone}
                  />
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("quick_stats")}
              </h3>
              <div className="space-y-3">
                <StatItem
                  label={t("in_quotation")}
                  value={dealData.inQuotation ? "Yes" : "No"}
                  color={
                    dealData.inQuotation
                      ? "text-green-600"
                      : "text-gray-600"
                  }
                />
                <StatItem
                  label={t("created")}
                  value={formatDate(dealData.createdAt)}
                  color="text-gray-600 dark:text-gray-400"
                />
                <StatItem
                  label={t("last_updated")}
                  value={formatDate(dealData.updatedAt)}
                  color="text-gray-600 dark:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealViewPage;

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