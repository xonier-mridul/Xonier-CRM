"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CampaignService from "@/src/services/campaign.service";
import { ICampaign } from "@/src/types/campaign/campaign.types";
import Pagination from "@/src/components/common/pagination";
import PrimaryButton from "@/src/components/ui/PrimeryButton";
import { FaPlus } from "react-icons/fa6";
import StatusBadge from "@/src/components/common/Status";
import CreatedAt from "@/src/components/common/CreatedAt";
import CreateCampaignModal from "./CreateCampaignModal";

const PipelineContent = () => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await CampaignService.getAll(currentPage, pageLimit);
      if (res.status === 200) {
        setCampaigns(res.data.data.data);
        setCurrentPage(Number(res.data.data.page));
        setPageLimit(Number(res.data.data.limit));
        setTotalPages(Number(res.data.data.totalPages));
      }
    } catch (error) {
      toast.error(t("failed_to_fetch_campaigns") || "Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentPage, pageLimit]);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-4">
      {/* Header section */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {t("campaign_pipeline") || "Campaign Pipeline"}
          </h2>
          <p className="text-sm text-gray-500">
            {t("manage_your_campaigns") || "Manage your campaigns and distributions"}
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors focus:outline-none"
          >
            <FaPlus />
            {t("create_campaign") || "Create Campaign"}
          </button>
        </div>
      </div>

      {/* List section */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">{t("name") || "Name"}</th>
                <th scope="col" className="px-6 py-3">{t("distribution_mode") || "Mode"}</th>
                <th scope="col" className="px-6 py-3">{t("managers") || "Managers"}</th>
                <th scope="col" className="px-6 py-3">{t("agents") || "Agents"}</th>
                <th scope="col" className="px-6 py-3">{t("status") || "Status"}</th>
                <th scope="col" className="px-6 py-3">{t("created_at") || "Created At"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4"><Skeleton width={120} /></td>
                    <td className="px-6 py-4"><Skeleton width={80} /></td>
                    <td className="px-6 py-4"><Skeleton width={100} /></td>
                    <td className="px-6 py-4"><Skeleton width={100} /></td>
                    <td className="px-6 py-4"><Skeleton width={60} /></td>
                    <td className="px-6 py-4"><Skeleton width={80} /></td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {t("no_campaigns_found") || "No campaigns found"}
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {camp.name}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {camp.distributionMode.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4">
                      {camp.managers?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      {camp.agents?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={camp.status} />
                    </td>
                    <td className="px-6 py-4">
                      <CreatedAt timestamp={camp.createdAt} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && campaigns.length > 0 && (
          <div className="p-4 border-t dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
};

export default PipelineContent;
