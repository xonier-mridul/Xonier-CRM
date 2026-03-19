"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import { handleCopy } from "@/src/app/utils/clipboard.utils";
import { EnquiryService } from "@/src/services/enquiry.service";
import { PERMISSIONS, SALES_STATUS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import {
  IoArrowBack,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoBusinessOutline,
  IoLocationOutline,
  IoGlobeOutline,
  IoBriefcaseOutline,
  IoDocumentText,
  IoEllipsisVertical,
  IoPrintOutline,
  IoCheckmarkCircle,
  IoCalendarOutline,
  IoInformationCircleOutline,
  IoFlagOutline,
  IoStatsChartOutline,
  IoLanguageOutline,
  IoCodeOutline,
  IoChatbubbleOutline,
  IoTimeOutline,
  IoLinkOutline,
  IoPeopleOutline,
  IoLayersOutline,
  IoSearchOutline
} from "react-icons/io5";
import { MdOutlineEdit, MdDeleteOutline, MdTimeline } from "react-icons/md";
import { FaRegUser, FaIndustry } from "react-icons/fa";
import { MdOutlineLeaderboard } from "react-icons/md";
import { EnquiryData } from "@/src/types/enquiry/enquiry.types";

/* ─────────────── Type (matches schema) ─────────────── */
  

/* ─────────────── Page ─────────────── */
const EnquiryViewPage = (): JSX.Element => {
  const [enquiryData, setEnquiryData] = useState<EnquiryData | null>(null);
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "contact" | "details"
  >("overview");

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const componentRef = useRef<HTMLDivElement>(null);

  const getEnquiryData = async () => {
    setIsLoading(true);
    setErr("");
    try {
      const result = await EnquiryService.getById(id);
      if (result.status === 200) {
        setEnquiryData(result.data.data);
      }
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

  useEffect(() => {
    if (id) getEnquiryData();
  }, [id]);

  const handleDelete = async (enquiryId: string) => {
    if (!enquiryData) return;
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete enquiry "${enquiryData.fullName}"?`,
        btnTxt: "Yes, delete",
      });
      if (confirm) {
        const result = await EnquiryService.delete(enquiryId);
        if (result.status === 200) {
          toast.success("Enquiry deleted successfully");
          router.push("/enquiry");
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

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Enquiry-${enquiryData?.enquiry_id}`,
    onBeforePrint: () =>
      new Promise<void>((resolve) => {
        setIsPrinting(true);
        resolve();
      }),
    onAfterPrint: () => setIsPrinting(false),
  });

  const getPriorityColor = (priority: string) => {
    const map: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return map[priority] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      open: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return map[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="ml-72 mt-14 p-6 flex flex-col gap-6 animate-pulse">
        <Skeleton height={120} borderRadius={12} className="dark:bg-gray-700 w-full" />
        <Skeleton height={60} borderRadius={12} className="dark:bg-gray-700 w-full" />
        <div className="flex items-start gap-6">
          <div className="w-2/3 flex flex-col gap-6">
            <Skeleton height={300} borderRadius={12} className="dark:bg-gray-700 w-full" />
            <Skeleton height={200} borderRadius={12} className="dark:bg-gray-700 w-full" />
          </div>
          <div className="w-1/3">
            <Skeleton height={400} borderRadius={12} className="dark:bg-gray-700 w-full" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!isLoading && !enquiryData) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Enquiry Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The enquiry you're looking for doesn't exist or has been removed.
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

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">
      <style>{`
        @media print {
          .print-col-stack { display: block !important; }
          .print-col-stack > * { margin-bottom: 1.5rem; width: 100% !important; }
          h3 { break-after: avoid; }
          .metric-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      <div ref={componentRef} className="print:p-6">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                    {enquiryData!.fullName}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                      enquiryData!.priority
                    )}`}
                  >
                    <IoFlagOutline className="w-4 h-4" />
                    {enquiryData!.priority}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      enquiryData!.status
                    )}`}
                  >
                    <IoStatsChartOutline className="w-4 h-4" />
                    {enquiryData!.status}
                  </span>
                  {!enquiryData!.isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                      Inactive
                    </span>
                  )}
                </div>
                <p
                  className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                  onClick={() =>
                    handleCopy(enquiryData ? enquiryData.enquiry_id : "")
                  }
                >
                  <IoDocumentText className="w-4 h-4" />
                  Enquiry ID:{" "}
                  <span className="font-mono">{enquiryData!.enquiry_id}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {hasPermission(PERMISSIONS.updateEnquiry) &&
                enquiryData!.status !== SALES_STATUS.DELETE ? (
                  <Link
                    href={`/enquiry/update//${enquiryData!.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <MdOutlineEdit className="w-4 h-4" />
                    Update Enquiry
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-400 opacity-60 text-white rounded-lg cursor-not-allowed">
                    <MdOutlineEdit className="w-4 h-4" />
                    Update Enquiry
                  </span>
                )}

                {/* <button
                  onClick={() => handlePrint()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  <IoPrintOutline className="w-4 h-4" />
                </button> */}

                <div className="relative group">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <IoEllipsisVertical className="w-4 h-4" />
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    {hasPermission(PERMISSIONS.deleteEnquiry) && (
                      <button
                        onClick={() => handleDelete(enquiryData!.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
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

        {/* ── Error ── */}
        {err && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {Array.isArray(err) ? err.join(", ") : err}
          </div>
        )}

        {/* ── Metric Cards ── */}
        <div className="metric-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<IoBusinessOutline className="w-6 h-6" />}
            label="Company"
            value={enquiryData!.companyName || "—"}
            color="bg-blue-500"
          />
          <MetricCard
            icon={<IoBriefcaseOutline className="w-5 h-5" />}
            label="Designation"
            value={enquiryData!.designation || "—"}
            color="bg-purple-500"
          />
          <MetricCard
            icon={<IoCodeOutline className="w-5 h-5" />}
            label="Project Type"
            value={enquiryData!.projectType?.replace(/_/g, " ") || "—"}
            color="bg-indigo-500"
          />
          <MetricCard
            icon={<IoInformationCircleOutline className="w-5 h-5" />}
            label="Info Type"
            value={enquiryData!.infoType || "—"}
            color="bg-teal-500"
          />
        </div>

        {/* ── Tab Navigation ── */}
        {!isPrinting && (
          <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
              {(["overview", "contact", "details"] as const).map((tab) => (
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
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Layout ── */}
        <div className="flex gap-6 print-col-stack">
          {/* Left Column (2/3) */}
          <div className="w-2/3 print:w-full flex flex-col gap-6">

            {/* ── OVERVIEW TAB ── */}
            {(activeTab === "overview" || isPrinting) && (
              <>
                {/* Enquiry Information */}
                <SectionCard
                  icon={<IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  title="Enquiry Information"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
                    <InfoItem
                      icon={<IoInformationCircleOutline className="w-4 h-4" />}
                      label="Source"
                      value={enquiryData!.source?.replace(/_/g, " ") || "—"}
                    />
                    <InfoItem
                      icon={<IoCodeOutline className="w-4 h-4" />}
                      label="Project Type"
                      value={enquiryData!.projectType?.replace(/_/g, " ") || "—"}
                    />
                    <InfoItem
                      icon={<IoFlagOutline className="w-4 h-4" />}
                      label="Priority"
                      value={enquiryData!.priority || "—"}
                    />
                    <InfoItem
                      icon={<IoStatsChartOutline className="w-4 h-4" />}
                      label="Status"
                      value={enquiryData!.status || "—"}
                    />
                    <InfoItem
                      icon={<IoInformationCircleOutline className="w-4 h-4" />}
                      label="Info Type"
                      value={enquiryData!.infoType || "—"}
                    />
                    <InfoItem
                      icon={<IoCheckmarkCircle className="w-4 h-4" />}
                      label="Active"
                      value={enquiryData!.isActive ? "Yes" : "No"}
                    />
                  </div>
                </SectionCard>

                {/* Industry & Technologies */}
                {((enquiryData!.industry && enquiryData!.industry.length > 0) ||
                  (enquiryData!.technologies && enquiryData!.technologies.length > 0) ||
                  (enquiryData!.keywords && enquiryData!.keywords.length > 0)) && (
                  <SectionCard
                    icon={<FaIndustry className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    title="Industry & Technologies"
                  >
                    <div className="flex flex-col gap-5">
                      {enquiryData!.industry && enquiryData!.industry.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <FaIndustry className="w-3 h-3" /> Industry
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {enquiryData!.industry.map((ind, i) => (
                              <TagPill key={i} label={ind} color="blue" />
                            ))}
                          </div>
                        </div>
                      )}
                      {enquiryData!.technologies && enquiryData!.technologies.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <IoLayersOutline className="w-3 h-3" /> Technologies
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {enquiryData!.technologies.map((tech, i) => (
                              <TagPill key={i} label={tech} color="purple" />
                            ))}
                          </div>
                        </div>
                      )}
                      {enquiryData!.keywords && enquiryData!.keywords.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <IoSearchOutline className="w-3 h-3" /> Keywords
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {enquiryData!.keywords.map((kw, i) => (
                              <TagPill key={i} label={kw} color="gray" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Assign Information */}
                {enquiryData!.assignTo && (
                  <SectionCard
                    icon={<MdOutlineLeaderboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    title="Assigned To"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
                      <InfoItem
                        icon={<IoPersonOutline className="w-4 h-4" />}
                        label="Name"
                        value={`${enquiryData!.assignTo.firstName} ${enquiryData!.assignTo.lastName}`}
                      />
                      {enquiryData!.assignTo.email && (
                        <InfoItem
                          icon={<IoMailOutline className="w-4 h-4" />}
                          label="Email"
                          value={enquiryData!.assignTo.email}
                        />
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Extra Fields */}
                {enquiryData!.extra_fields && enquiryData!.extra_fields.length > 0 && (
                  <SectionCard
                    icon={<IoDocumentText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    title="Additional Fields"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
                      {enquiryData!.extra_fields.map((field, i) => (
                        <InfoItem
                          key={i}
                          icon={<IoInformationCircleOutline className="w-4 h-4" />}
                          label={field.key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (c) => c.toUpperCase())
                            .trim()}
                          value={field.value || "—"}
                        />
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Message */}
                {enquiryData!.message && (
                  <SectionCard
                    icon={<IoChatbubbleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    title="Client Message"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-gray-900 dark:text-white text-sm leading-relaxed whitespace-pre-wrap">
                        {enquiryData!.message}
                      </p>
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* ── CONTACT TAB ── */}
            {(activeTab === "contact" || isPrinting) && (
              <SectionCard
                icon={<IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                title="Contact Information"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
                  <InfoItem
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label="Full Name"
                    value={enquiryData!.fullName}
                  />
                  <InfoItem
                    icon={<IoBriefcaseOutline className="w-4 h-4" />}
                    label="Designation"
                    value={enquiryData!.designation || "—"}
                  />
                  <InfoItem
                    icon={<IoMailOutline className="w-4 h-4" />}
                    label="Email"
                    value={enquiryData!.email}
                  />
                  <InfoItem
                    icon={<IoCallOutline className="w-4 h-4" />}
                    label="Phone"
                    value={enquiryData!.phone}
                  />
                  <InfoItem
                    icon={<IoBusinessOutline className="w-4 h-4" />}
                    label="Company"
                    value={enquiryData!.companyName || "—"}
                  />
                  <InfoItem
                    icon={<IoPeopleOutline className="w-4 h-4" />}
                    label="Number of Employees"
                    value={enquiryData!.numberOfEmployees || "—"}
                  />
                  {enquiryData!.location && (
                    <>
                      {enquiryData!.location.city && (
                        <InfoItem
                          icon={<IoLocationOutline className="w-4 h-4" />}
                          label="City"
                          value={enquiryData!.location.city}
                        />
                      )}
                      {enquiryData!.location.state && (
                        <InfoItem
                          icon={<IoLocationOutline className="w-4 h-4" />}
                          label="State"
                          value={enquiryData!.location.state}
                        />
                      )}
                      {enquiryData!.location.country && (
                        <InfoItem
                          icon={<IoGlobeOutline className="w-4 h-4" />}
                          label="Country"
                          value={enquiryData!.location.country}
                        />
                      )}
                      {enquiryData!.location.postalCode && (
                        <InfoItem
                          icon={<IoLocationOutline className="w-4 h-4" />}
                          label="Postal Code"
                          value={enquiryData!.location.postalCode}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Social Links */}
                {enquiryData!.socialLinks &&
                  Object.values(enquiryData!.socialLinks).some(Boolean) && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <IoLinkOutline className="w-4 h-4 text-blue-500" />
                        Social Links
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(enquiryData!.socialLinks)
                          .filter(([, v]) => v)
                          .map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            >
                              <IoLinkOutline className="w-4 h-4" />
                              <span className="capitalize">{platform}</span>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
              </SectionCard>
            )}

            {/* ── DETAILS TAB ── */}
            {activeTab === "details" && !isPrinting && (
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <MdTimeline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Activity Timeline
                  </h3>
                </div>
                <div className="text-center py-12">
                  <IoInformationCircleOutline className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Activity timeline coming soon
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (1/3) */}
          <div className="w-1/3 print:w-full flex flex-col gap-6">

            {/* Creator Information */}
            {enquiryData!.createdBy && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl border border-blue-400 shadow-lg break-inside-avoid">
                <div className="flex items-center gap-2 mb-4">
                  <FaRegUser className="text-xl text-white" />
                  <h2 className="text-white font-semibold text-xl">
                    Creator Information
                  </h2>
                </div>
                <div className="border-b border-white/30 w-full mb-4" />
                <div className="space-y-4">
                  <ProfileField
                    icon={<IoPersonOutline className="w-4 h-4" />}
                    label="Name"
                    value={`${enquiryData!.createdBy.firstName} ${enquiryData!.createdBy.lastName ?? ""}`}
                  />
                  {enquiryData!.createdBy.email && (
                    <ProfileField
                      icon={<IoMailOutline className="w-4 h-4" />}
                      label="Email"
                      value={enquiryData!.createdBy.email}
                    />
                  )}
                  {enquiryData!.createdBy.phone && (
                    <ProfileField
                      icon={<IoCallOutline className="w-4 h-4" />}
                      label="Phone"
                      value={enquiryData!.createdBy.phone}
                    />
                  )}
                  {enquiryData!.createdBy.company && (
                    <ProfileField
                      icon={<IoBusinessOutline className="w-4 h-4" />}
                      label="Company"
                      value={enquiryData!.createdBy.company}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <StatItem
                  label="Active"
                  value={enquiryData!.isActive ? "Yes" : "No"}
                  color={
                    enquiryData!.isActive
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }
                />
                <StatItem
                  label="Created"
                  value={formatDate(enquiryData!.createdAt)}
                  color="text-gray-600 dark:text-gray-400"
                />
                <StatItem
                  label="Last Updated"
                  value={formatDate(enquiryData!.updatedAt)}
                  color="text-gray-600 dark:text-gray-400"
                />
                {enquiryData!.numberOfEmployees && (
                  <StatItem
                    label="Employees"
                    value={enquiryData!.numberOfEmployees}
                    color="text-gray-600 dark:text-gray-400"
                  />
                )}
              </div>
            </div>

            {/* Location Info */}
            {enquiryData!.location &&
              Object.values(enquiryData!.location).some(Boolean) && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
                  <div className="flex items-center gap-2 mb-4">
                    <IoLocationOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Location Details
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {enquiryData!.location.city && (
                      <StatItem label="City" value={enquiryData!.location.city} color="text-gray-600 dark:text-gray-400" />
                    )}
                    {enquiryData!.location.state && (
                      <StatItem label="State" value={enquiryData!.location.state} color="text-gray-600 dark:text-gray-400" />
                    )}
                    {enquiryData!.location.country && (
                      <StatItem label="Country" value={enquiryData!.location.country} color="text-gray-600 dark:text-gray-400" />
                    )}
                    {enquiryData!.location.postalCode && (
                      <StatItem label="Postal Code" value={enquiryData!.location.postalCode} color="text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                </div>
              )}

            {/* Social Links Sidebar Card */}
            {enquiryData!.socialLinks &&
              Object.values(enquiryData!.socialLinks).some(Boolean) && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
                  <div className="flex items-center gap-2 mb-4">
                    <IoLinkOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Social Links
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(enquiryData!.socialLinks)
                      .filter(([, v]) => v)
                      .map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm py-1"
                        >
                          <IoLinkOutline className="w-4 h-4 flex-shrink-0" />
                          <span className="capitalize truncate">{platform}</span>
                        </a>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnquiryViewPage;

/* ─────────────── Shared UI Components ─────────────── */

const SectionCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700 break-inside-avoid">
    <div className="flex items-center gap-2 mb-6">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

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
    <div className="flex items-center gap-3 overflow-hidden">
      <div className={`${color} p-3 rounded-lg text-white flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 capitalize truncate">
          {value}
        </p>
      </div>
    </div>
  </div>
);

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
    <p className="font-medium text-gray-900 dark:text-white pl-6 capitalize">{value}</p>
  </div>
);

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

const StatItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null | undefined;
  color: string;
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className={`text-sm font-medium ${color}`}>{value || "—"}</span>
  </div>
);

const TagPill = ({
  label,
  color,
}: {
  label: string;
  color: "blue" | "purple" | "gray";
}) => {
  const styles = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${styles[color]}`}
    >
      {label}
    </span>
  );
};