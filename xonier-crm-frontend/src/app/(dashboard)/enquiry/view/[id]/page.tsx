"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import { SIDEBAR_WIDTH } from "@/src/constants/constants";
import { EnquiryService } from "@/src/services/enquiry.service";
import { EnquiryData } from "@/src/types/enquiry/enquiry.types";
import axios from "axios";
import { useParams } from "next/navigation";
import React, { JSX, useEffect, useState } from "react";
import { toast } from "react-toastify";

const page = (): JSX.Element => {
  const [enquiryData, setEnquiryData] = useState<EnquiryData | null>(null);
  const [err, setErr] = useState<string[] | string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { id } = useParams();

  const getEnquiryData = async (id: any) => {
    setIsLoading(true);
    setErr(null);
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
    if (id) getEnquiryData(id);
  }, [id]);

  return (
    <div className={`ml-72 mt-[60px] p-6`}>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enquiry Overview
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {enquiryData?.enquiry_id}
            </p>
          </div>

          {enquiryData && (
            <div className="flex gap-3">
              <Badge type="status" value={enquiryData.status} />
              <Badge type="priority" value={enquiryData.priority} />
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <Skeleton />
        )}

        {/* Error */}
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {Array.isArray(err) ? err.join(", ") : err}
          </div>
        )}

        {/* Main Content */}
        {enquiryData && !isLoading && (
          <>
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <GlassCard>
                <Info label="Full Name" value={enquiryData.fullName} />
                <Info label="Email" value={enquiryData.email} />
                <Info label="Phone" value={enquiryData.phone} />
                <Info label="Company" value={enquiryData.companyName || "—"} />
              </GlassCard>

              <GlassCard>
                <Info
                  label="Project Type"
                  value={enquiryData.projectType.replace(/_/g, " ").toUpperCase()}
                />
                <Info
                  label="Source"
                  value={enquiryData.source.replace(/_/g, " ").toUpperCase()}
                />
                <Info
                  label="Active"
                  value={enquiryData.isActive ? "Yes" : "No"}
                />
              </GlassCard>

              <GlassCard>
                <Info
                  label="Created By"
                  value={
                    enquiryData.createdBy
                      ? `${enquiryData.createdBy.firstName} ${enquiryData.createdBy.lastName}`
                      : "Unassigned"
                  }
                />
                <Info
                  label="Assigned To"
                  value={
                    enquiryData.assignTo
                      ? `${enquiryData.assignTo.firstName} ${enquiryData.assignTo.lastName}`
                      : "Unassigned"
                  }
                />
                <Info
                  label="Created At"
                  value={new Date(enquiryData.createdAt).toLocaleString()}
                />
                <Info
                  label="Updated At"
                  value={new Date(enquiryData.updatedAt).toLocaleString()}
                />
              </GlassCard>
            </div>

            {/* Message Section */}
            <div className=" rounded-xl border-[1px] border-slate-900/1 dark:from-gray-800 dark:to-gray-900 p-6 bg-white dark:bg-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Client Message
              </h3>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                {enquiryData.message || "No message provided."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default page;

/* ---------------- UI Helpers ---------------- */

const GlassCard = ({ children }: { children: React.ReactNode }) => (
  <div className=" rounded-xl border-[1px] border-slate-900/10 bg-white dark:bg-gray-700 backdrop-blur-md p-5 flex flex-col gap-3">
    {children}
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="text-sm font-medium text-gray-900 dark:text-white">
      {value}
    </p>
  </div>
);

const Badge = ({
  type,
  value,
}: {
  type: "status" | "priority";
  value: string;
}) => {
  const base =
    "px-4 py-1 rounded-full text-xs font-semibold tracking-wide";

  const styles =
    type === "status"
      ? value === "new"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : value === "won"
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      : value === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : value === "medium"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";

  return (
    <span className={`${base} ${styles}`}>
      {value.toUpperCase()}
    </span>
  );
};

const Skeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700"
      />
    ))}
  </div>
);
