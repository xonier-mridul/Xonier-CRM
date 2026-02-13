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
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { 
  MdOutlineSettings, 
  MdCategory, 
  MdTimeline,
  MdDeleteOutline 
} from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { 
  FaRegUser, 
  FaRegPaperPlane,
  FaPercent,
  FaChartLine,
  FaHandshake
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
  IoInformationCircleOutline
} from "react-icons/io5";
import Link from "next/link";
import { usePermissions } from "@/src/hooks/usePermissions";
import { DEAL_STATUS, PERMISSIONS } from "@/src/constants/enum";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

const DealViewPage = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [dealData, setDealData] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lead' | 'activity'>('overview');

  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();

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
        toast.error(`${messages}`);
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
        const result = await dealService.delete(dealData.id)
        if(result.status === 200){

          toast.success("Deal deleted successfully");
          router.push('/deals');
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

  const handlePrint = async () => {
    window.print();
  };

  const getDealStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'qualification': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'proposal': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'negotiation': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'closed_won': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'closed_lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'delete': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getDealTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'new_business': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'existing_business': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'renewal': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

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

  if (!dealData) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <IoDocumentText className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Deal Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The deal you're looking for doesn't exist or has been removed.
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

  const { lead_id: lead } = dealData;
  const date = formatDate(dealData?.createDate);

  return (
    <div className="mt-14 ml-72 p-6 min-h-screen">
      {/* Header Section */}
      <div className="mb-6">
        <div className={`${dealData.status === DEAL_STATUS.DELETE ? "border-red-400 bg-red-100 ": "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-700"}  rounded-xl border border-gray-200 p-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                
                <h1 className={`${dealData.status === DEAL_STATUS.DELETE ? "text-red-500 " : "text-gray-900 dark:text-white"} text-3xl font-bold line-clamp-1 w-64 capitalize`}>
                  {dealData?.dealName}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${getDealStageColor(dealData?.dealStage)}`}>
                  <IoFunnelOutline className="w-4 h-4 text-[10px]" />
                  {dealData?.dealStage?.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${getDealTypeColor(dealData?.dealType)}`}>
                  <IoBriefcaseOutline className="w-4 h-4" />
                  {dealData?.dealType?.replace('_', ' ')}
                </span>
              </div>
              <p
                className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                onClick={() => handleCopy(dealData ? dealData.deal_id : "")}
              >
                <IoDocumentText className="w-4 h-4" />
                Deal ID: <span className="font-mono">{dealData?.deal_id}</span>
              </p>
            </div>


            <div className="flex flex-wrap items-center gap-2">
              {(hasPermission(PERMISSIONS.createQuote)&& (dealData.status !== DEAL_STATUS.DELETE)) && (
                <Link
                  href={`/deals/quotation/${dealData.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors group"
                >
                  <FaRegPaperPlane className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Send Quotation
                </Link>
              )}
              


              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <IoPrintOutline className="w-4 h-4" />
              </button>

              {/* More Actions Dropdown */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                  <IoEllipsisVertical className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                 {(hasPermission(PERMISSIONS.updateDeal) && (dealData.status !== DEAL_STATUS.DELETE)) ? (
                <Link
                  href={`/deals/update/${dealData.id}`}
                  className="w-full flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <MdOutlineSettings className="w-4 h-4" />
                  Update Deal
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2  opacity-60 rounded-lg cursor-not-allowed">
                  <MdOutlineSettings className="w-4 h-4" />
                  Update Deal
                </span>
              )}

                  {(hasPermission(PERMISSIONS.deleteDeal) && (dealData.status !== DEAL_STATUS.DELETE)) && (
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<IoCashOutline className="w-6 h-6" />}
          label="Deal Amount"
          value={`₹ ${dealData?.amount?.toLocaleString('en-IN')}`}
          color="bg-green-500"
        />
        <MetricCard
          icon={<FaPercent className="w-5 h-5" />}
          label="Deal Probability"
          value={`${dealData?.dealProbability ?? 0}%`}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<FaChartLine className="w-5 h-5" />}
          label="Forecast Probability"
          value={`${dealData?.forecastProbability ?? 0}%`}
          color="bg-purple-500"
        />
        {date && <MetricCard
          icon={<IoCalendarOutline className="w-5 h-5" />}
          label="Created"
          value={date}
          color="bg-amber-500"
        />}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-700 mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 overflow-x-auto px-6 py-3.5">
          {(['overview', 'lead', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1.5 px-1 font-medium transition-colors cursor-pointer relative whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
          {/* Deal Information */}
          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <IoStatsChartOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Deal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoItem
                  icon={<IoFunnelOutline className="w-4 h-4" />}
                  label="Pipeline"
                  value={dealData?.dealPipeline}
                />
                <InfoItem
                  icon={<MdTimeline className="w-4 h-4" />}
                  label="Stage"
                  value={dealData?.dealStage}
                />
                <InfoItem
                  icon={<MdCategory className="w-4 h-4" />}
                  label="Type"
                  value={dealData?.dealType}
                />
                <InfoItem
                  icon={<IoCashOutline className="w-4 h-4" />}
                  label="Amount"
                  value={`₹ ${dealData?.amount?.toLocaleString('en-IN')}`}
                />
                <InfoItem
                  icon={<FaPercent className="w-4 h-4" />}
                  label="Deal Probability"
                  value={`${dealData?.dealProbability ?? 0}%`}
                />
                <InfoItem
                  icon={<IoTrendingUpOutline className="w-4 h-4" />}
                  label="Forecast Category"
                  value={dealData?.forecastCategory ?? "—"}
                />
                <InfoItem
                  icon={<IoCalendarOutline className="w-4 h-4" />}
                  label="Create Date"
                  value={date}
                />
                <InfoItem
                  icon={<IoCalendarOutline className="w-4 h-4" />}
                  label="Close Date"
                  value={dealData?.closeDate ?? "—"}
                />
                <InfoItem
                  icon={<IoPersonOutline className="w-4 h-4" />}
                  label="Deal Owner"
                  value={dealData?.dealOwner ?? "—"}
                />
                <InfoItem
                  icon={<FaHandshake className="w-4 h-4" />}
                  label="Deal Collaborator"
                  value={dealData?.dealCollaborator ?? "—"}
                />
                <InfoItem
                  icon={<IoFlagOutline className="w-4 h-4" />}
                  label="Next Step"
                  value={dealData?.nextStep ?? "—"}
                />
                <InfoItem
                  icon={<IoCheckmarkCircle className="w-4 h-4" />}
                  label="Closed Won Reason"
                  value={dealData?.closedWonReason ?? "—"}
                />
                <InfoItem
                  icon={<IoCloseCircle className="w-4 h-4" />}
                  label="Closed Lost Reason"
                  value={dealData?.closedLostReason ?? "—"}
                />
                <InfoItem
                  icon={<IoInformationCircleOutline className="w-4 h-4" />}
                  label="Original Traffic Source"
                  value={dealData?.originalTrafficSource ?? "—"}
                />
                <InfoItem
                  icon={<FaChartLine className="w-4 h-4" />}
                  label="Forecast Probability"
                  value={`${dealData?.forecastProbability ?? 0}%`}
                />
              </div>

              {dealData?.dealDescription && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </p>
                  </div>
                  <p className="text-gray-900 dark:text-white">
                    {dealData.dealDescription}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lead Information */}
          {activeTab === 'lead' && (
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-6">
                <IoPersonOutline className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Lead Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoItem
                  icon={<IoPersonOutline className="w-4 h-4" />}
                  label="Full Name"
                  value={lead.fullName}
                />
                <MaskEmailField label="Email" value={lead.email} />
                <MaskPhoneField label="Phone" value={lead.phone} />
                <InfoItem
                  icon={<IoBusinessOutline className="w-4 h-4" />}
                  label="Company"
                  value={lead.companyName ?? "—"}
                />
                <InfoItem
                  icon={<IoFlagOutline className="w-4 h-4" />}
                  label="Priority"
                  value={lead.priority}
                />
                <InfoItem
                  icon={<IoStatsChartOutline className="w-4 h-4" />}
                  label="Status"
                  value={lead.status}
                />
                <InfoItem
                  icon={<IoInformationCircleOutline className="w-4 h-4" />}
                  label="Source"
                  value={lead.source}
                />
                <InfoItem
                  icon={<IoBriefcaseOutline className="w-4 h-4" />}
                  label="Project Type"
                  value={lead.projectType}
                />
                <InfoItem
                  icon={<IoLocationOutline className="w-4 h-4" />}
                  label="City"
                  value={lead.city ?? "—"}
                />
                <InfoItem
                  icon={<IoGlobeOutline className="w-4 h-4" />}
                  label="Country"
                  value={lead.country ?? "—"}
                />
              </div>

              {lead.message && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <IoDocumentText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lead Message
                    </p>
                  </div>
                  <p className="text-gray-900 dark:text-white">{lead.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          {activeTab === 'activity' && (
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl border border-blue-400 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <FaRegUser className="text-xl text-white" />
              <h2 className="text-white font-semibold text-xl">
                Creator Information
              </h2>
            </div>
            <div className="border-b border-white/30 w-full mb-4"></div>
            {dealData.createdBy ? (
              <div className="space-y-4">
                <ProfileField
                  icon={<IoPersonOutline className="w-4 h-4" />}
                  label="Name"
                  value={`${dealData.createdBy?.firstName} ${dealData.createdBy?.lastName ?? ""}`}
                />
                <ProfileField
                  icon={<IoMailOutline className="w-4 h-4" />}
                  label="Email"
                  value={dealData.createdBy?.email}
                />
                <ProfileField
                  icon={<IoCallOutline className="w-4 h-4" />}
                  label="Phone"
                  value={dealData.createdBy?.phone}
                />
                <ProfileField
                  icon={<IoBusinessOutline className="w-4 h-4" />}
                  label="Company"
                  value={dealData.createdBy?.company || "—"}
                />
              </div>
            ) : (
              <p className="text-white text-center py-4">
                Creator data not found
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <StatItem
                label="In Quotation"
                value={dealData.inQuotation ? "Yes" : "No"}
                color={dealData.inQuotation ? "text-green-600" : "text-gray-600"}
              />
              <StatItem
                label="Created"
                value={formatDate(dealData.createdAt)}
                color="text-gray-600 dark:text-gray-400"
              />
              <StatItem
                label="Last Updated"
                value={formatDate(dealData.updatedAt)}
                color="text-gray-600 dark:text-gray-400"
              />
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
      {icon && (
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      )}
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
