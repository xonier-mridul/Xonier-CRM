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
import { icons } from "lucide-react";
import { useParams } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MdOutlineSettings } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import { FaRegUser } from "react-icons/fa";

const DealViewPage = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [dealData, setDealData] = useState<Deal | null>(null);

  const { id } = useParams();

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

  if (!dealData) {
    return (
      <div className="mt-14 p-6" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <DataNotFound title="Deal" />
      </div>
    );
  }

  const { lead_id: lead } = dealData;
  const date = formatDate(dealData?.createDate);

 

  return (
    <div className="mt-14 p-6 space-y-8" style={{ marginLeft: SIDEBAR_WIDTH }}>
      <div className="bg-white dark:bg-gray-700  bg p-6 rounded-xl border flex justify-between items-center gap-10 border-slate-900/10">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
            {dealData?.dealName}
          </h2>
          <p
            className="text-gray-500 dark:text-gray-400 mt-1 cursor-pointer"
            onClick={() => handleCopy(dealData ? dealData.deal_id : "")}
          >
            Deal ID:{" "}
            <span className="hover:text-blue-300">{dealData?.deal_id}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PrimaryButton
            text="Edit deal"
            link={`/deals/update/${dealData.id}`}
            icon={<MdOutlineSettings />}
          />
        </div>
      </div>
     <div className="flex gap-6">
      <div className="w-2/3 flex flex-col gap-5">
      <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-slate-900/10">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Deal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoading ? (
            <InfoItem label="Pipeline" value={dealData?.dealPipeline} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Stage" value={dealData?.dealStage} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Type" value={dealData?.dealType} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Amount" value={`₹ ${dealData?.amount}`} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Deal Probability"
              value={`${dealData?.dealProbability ?? 0}%`}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Forecast Category"
              value={dealData?.forecastCategory ?? "—"}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Create Date" value={date} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Close Date" value={dealData?.closeDate ?? "—"} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Deal Owner" value={dealData?.dealOwner ?? "—"} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Deal Collaborator"
              value={dealData?.dealCollaborator ?? "—"}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem label="Next Step" value={dealData?.nextStep ?? "—"} />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Closed Won Reason"
              value={dealData?.closedWonReason ?? "—"}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Closed Lost Reason"
              value={dealData?.closedLostReason ?? "—"}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Original Traffic Source"
              value={dealData?.originalTrafficSource ?? "—"}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
          {!isLoading ? (
            <InfoItem
              label="Forecast Probability"
              value={`${dealData?.forecastProbability ?? "-"}%`}
            />
          ) : (
            <Skeleton
              height={24}
              width={130}
              borderRadius={8}
              className="animate-pulse"
            />
          )}
        </div>

        {dealData?.dealDescription && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Description
            </p>
            <p className="text-slate-900 dark:text-white">
              {dealData.dealDescription}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-slate-900/10">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Lead Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem label="Full Name" value={lead.fullName} />

          <MaskEmailField label="Email" value={lead.email} />

          <MaskPhoneField label="Phone" value={lead.phone} />
          <InfoItem label="Company" value={lead.companyName ?? "—"} />
          <InfoItem label="Priority" value={lead.priority} />
          <InfoItem label="Status" value={lead.status} />
          <InfoItem label="Source" value={lead.source} />
          <InfoItem label="Project Type" value={lead.projectType} />
          <InfoItem label="City" value={lead.city ?? "—"} />
          <InfoItem label="Country" value={lead.country ?? "—"} />
        </div>

        {lead.message && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Lead Message
            </p>
            <p className="text-slate-900 dark:text-white">{lead.message}</p>
          </div>
        )}
      </div>
      </div>
      <div className="w-1/3 flex flex-col gap-5">
        <div className="bg-blue-500 flex flex-col gap-2.5  p-6 rounded-xl border border-slate-900/10">
          <h2 className="text-white font-semibold text-xl flex items-center gap-2"> <FaRegUser className="text-lg"/> Creator Information</h2>
          <div className="border-b border-white/60 w-full"></div>
           {dealData.createdBy ? 
      <div className="grid grid-cols-1  gap-6">
        <ProfileField
          label="Name"
          value={`${dealData.createdBy?.firstName} ${dealData.createdBy?.lastName ?? ""}`}
        />

        <ProfileField label="Email" value={dealData.createdBy?.email} />

        <ProfileField label="Phone" value={dealData.createdBy?.phone} />

        <ProfileField
          label="Company"
          value={dealData.createdBy?.company || "—"}
        />

        {/* <ProfileField
          label="Last Login"
          value={dealData.createdBy.lastLogin ? formatDate(dealData.createdBy.lastLogin) : "—"}
        /> */}
      </div>: <p className="text-white font-semibold text-xl flex items-center gap-2">Creator data not found</p>}
        </div>
        
      </div>
      </div>
    </div>
  );
};

export default DealViewPage;

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className="font-medium text-slate-900 dark:text-white capitalize">
      {value}
    </p>
  </div>
);

const ProfileField = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm text-gray-300 ">
      {label}
    </span>
    <div className="font-medium text-slate-900 dark:text-white">
      {value}
    </div>
  </div>
);

