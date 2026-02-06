"use client";

import { handleCopy } from "@/src/app/utils/clipboard.utils";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { formatDate } from "@/src/app/utils/date.utils";
import {
  Badge,
  Field,
  InfoCard,
  LeadSkeleton,
  MaskEmailField,
  MaskPhoneField,
} from "@/src/components/ui/LeadComponent";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { PERMISSIONS } from "@/src/constants/enum";
import LeadService from "@/src/services/lead.service";
import { Lead } from "@/src/types/leads/leads.types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  MdOutlineEdit,
  MdDeleteOutline,
  MdTimeline,
  MdCategory,
} from "react-icons/md";
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
  IoDuplicateOutline,
  IoDownloadOutline,
  IoPrintOutline,
  IoCheckmarkCircle,
  IoCalendarOutline,
  IoInformationCircleOutline,
  IoFlagOutline,
  IoStatsChartOutline,
  IoLanguageOutline,
  IoCodeOutline,
  IoChatbubbleOutline,
  IoCreateOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { FaRegUser, FaIndustry } from "react-icons/fa";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import Skeleton from "react-loading-skeleton";
import Link from "next/link";

const LeadViewPage = (): JSX.Element => {
  const [err, setErr] = useState<string | string[]>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "contact" | "activity"
  >("overview");

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const getLeadData = async () => {
    setIsLoading(true);
    try {
      const result = await LeadService.getById(id);
      if (result.status === 200) {
        setLeadData(result.data.data);
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
    getLeadData();
  }, []);

  const handleDelete = async () => {
    if (!leadData) return;

    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure?",
        text: `Do you want to delete lead "${leadData.fullName}"?`,
        btnTxt: "Yes, delete",
      });

      if (confirm) {
        // Add your delete service call here
        // const result = await LeadService.delete(leadData.id);
        toast.success("Lead deleted successfully");
        router.push("/leads");
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

  const handlePrint = async () => {
    window.print();
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      medium:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      colors[priority] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      contacted:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      qualified:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
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

  if (!leadData) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoPersonOutline className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Lead Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The lead you're looking for doesn't exist or has been removed.
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
      {/* Header Section */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                  {leadData?.fullName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                    leadData?.priority
                  )}`}
                >
                  <IoFlagOutline className="w-4 h-4" />
                  {leadData?.priority}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    leadData?.status
                  )}`}
                >
                  <IoStatsChartOutline className="w-4 h-4" />
                  {leadData?.status}
                </span>
              </div>
              <p
                className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                onClick={() =>
                  handleCopy(leadData ? leadData.lead_id : "text not found")
                }
              >
                <IoDocumentText className="w-4 h-4" />
                Lead ID: <span className="font-mono">{leadData?.lead_id}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {hasPermission(PERMISSIONS.updateLead) ? (
                <Link
                  href={`/leads/update/${leadData.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <MdOutlineEdit className="w-4 h-4" />
                  Update Lead
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-400 opacity-60 text-white rounded-lg cursor-not-allowed">
                  <MdOutlineEdit className="w-4 h-4" />
                  Update Lead
                </span>
              )}

             

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
              >
                <IoPrintOutline className="w-4 h-4" />
              </button>

              {/* More Actions Dropdown */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 ">
                 
                  {hasPermission(PERMISSIONS.deleteLead) && (
                    <button
                      onClick={handleDelete}
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<IoBusinessOutline className="w-6 h-6" />}
          label="Company"
          value={leadData?.companyName || "—"}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<IoCodeOutline className="w-5 h-5" />}
          label="Project Type"
          value={leadData?.projectType?.replace("_", " ") || "—"}
          color="bg-purple-500"
        />
        <MetricCard
          icon={<IoLocationOutline className="w-5 h-5" />}
          label="Location"
          value={leadData?.city || "—"}
          color="bg-green-500"
        />
        <MetricCard
          icon={<IoCheckmarkCircle className="w-5 h-5" />}
          label="In Deal"
          value={leadData?.inDeal ? "Yes" : "No"}
          color={leadData?.inDeal ? "bg-emerald-500" : "bg-gray-500"}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
          {(["overview", "contact", "activity"] as const).map((tab) => (
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

      {/* Main Content */}
      <div className="flex gap-6">
        <div className="w-2/3 flex flex-col gap-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Lead Information */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <IoInformationCircleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Lead Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<IoInformationCircleOutline className="w-4 h-4" />}
                    label="Source"
                    value={leadData?.source}
                  />
                  <InfoItem
                    icon={<IoCodeOutline className="w-4 h-4" />}
                    label="Project Type"
                    value={leadData?.projectType?.replace("_", " ")}
                  />
                  <InfoItem
                    icon={<FaIndustry className="w-4 h-4" />}
                    label="Industry"
                    value={leadData?.industry || "—"}
                  />
                  <InfoItem
                    icon={<IoLanguageOutline className="w-4 h-4" />}
                    label="Language"
                    value={leadData?.language || "—"}
                  />
                  <InfoItem
                    icon={<IoFlagOutline className="w-4 h-4" />}
                    label="Priority"
                    value={leadData?.priority}
                  />
                  <InfoItem
                    icon={<IoStatsChartOutline className="w-4 h-4" />}
                    label="Status"
                    value={leadData?.status}
                  />
                </div>
              </div>

              {/* Employee Details */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-6">
                  <IoBriefcaseOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Employee Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem
                    icon={<IoBriefcaseOutline className="w-4 h-4" />}
                    label="Role"
                    value={leadData?.employeeRole || "—"}
                  />
                  <InfoItem
                    icon={<IoStatsChartOutline className="w-4 h-4" />}
                    label="Seniority"
                    value={leadData?.employeeSeniority || "—"}
                  />
                </div>
              </div>

              {/* Notes */}
              {(leadData?.message || leadData?.membershipNotes) && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-6">
                    <IoChatbubbleOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Notes & Messages
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {leadData?.message && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IoChatbubbleOutline className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Message
                          </p>
                        </div>
                        <p className="text-gray-900 dark:text-white">
                          {leadData.message}
                        </p>
                      </div>
                    )}
                    {leadData?.membershipNotes && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Membership Notes
                          </p>
                        </div>
                        <p className="text-gray-900 dark:text-white">
                          {leadData.membershipNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem
                  icon={<IoPersonOutline className="w-4 h-4" />}
                  label="Full Name"
                  value={leadData?.fullName}
                />
                <MaskEmailField label="Email" value={leadData?.email} />
                <MaskPhoneField label="Phone" value={leadData?.phone} />
                <InfoItem
                  icon={<IoBusinessOutline className="w-4 h-4" />}
                  label="Company"
                  value={leadData?.companyName || "—"}
                />
                <InfoItem
                  icon={<IoLocationOutline className="w-4 h-4" />}
                  label="City"
                  value={leadData?.city || "—"}
                />
                <InfoItem
                  icon={<IoGlobeOutline className="w-4 h-4" />}
                  label="Country"
                  value={leadData?.country || "—"}
                />
                <InfoItem
                  icon={<IoLocationOutline className="w-4 h-4" />}
                  label="Postal Code"
                  value={leadData?.postalCode || "—"}
                />
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
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

        {/* Sidebar */}
        <div className="w-1/3 flex flex-col gap-6">
          {/* Creator Information */}
          {leadData.createdBy && (
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
                  value={`${leadData.createdBy?.firstName} ${
                    leadData.createdBy?.lastName ?? ""
                  }`}
                />
                <ProfileField
                  icon={<IoMailOutline className="w-4 h-4" />}
                  label="Email"
                  value={leadData.createdBy?.email}
                />
                <ProfileField
                  icon={<IoCallOutline className="w-4 h-4" />}
                  label="Phone"
                  value={leadData.createdBy?.phone}
                />
                <ProfileField
                  icon={<IoBusinessOutline className="w-4 h-4" />}
                  label="Company"
                  value={leadData.createdBy?.company || "—"}
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
                label="In Deal"
                value={leadData.inDeal ? "Yes" : "No"}
                color={
                  leadData.inDeal
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }
              />
              <StatItem
                label="Created"
                value={formatDate(leadData.createdAt)}
                color="text-gray-600 dark:text-gray-400"
              />
              <StatItem
                label="Last Updated"
                value={formatDate(leadData.updatedAt)}
                color="text-gray-600 dark:text-gray-400"
              />
            </div>
          </div>

          {/* Location Info */}
          {(leadData?.country || leadData?.postalCode) && (
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <IoLocationOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Location Details
                </h3>
              </div>
              <div className="space-y-3">
                <StatItem
                  label="Country"
                  value={leadData?.country ? leadData?.country : "-"}
                  color="text-gray-600 dark:text-gray-400"
                />
                <StatItem
                  label="Postal Code"
                  value={leadData?.postalCode ? leadData?.postalCode : null}
                  color="text-gray-600 dark:text-gray-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadViewPage;

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
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 capitalize">
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
  value: string | undefined | number | null;
  color: string;
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className={`text-sm font-medium ${color}`}>{value || "—"}</span>
  </div>
);