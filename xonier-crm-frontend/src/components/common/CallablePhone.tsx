"use client";

import { useState } from "react";
import { parseFollowUpTime } from "@/src/app/utils/followUpTime.utils";
import { FiPhoneCall, FiClock } from "react-icons/fi";
import CallModal from "@/src/components/pages/lead/CallModal";
import { Lead } from "@/src/types/leads/leads.types";

interface CallablePhoneProps {
  lead: Lead;
  displayValue: string;
  fontSize?: string;
  onCallDisposed?: (leadId: string, connectStatus: string) => void;
  campaignId?: string;
  campaignLeadId?: string;
}

function formatFollowUpTime(iso: string): string {
  return parseFollowUpTime(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default function CallablePhone({
  lead,
  displayValue,
  fontSize = "[13px]",
  onCallDisposed,
  campaignId,
  campaignLeadId,
}: CallablePhoneProps) {
  const [open, setOpen] = useState(false);

  if (!lead.phone) return <span className="text-slate-400 text-[13px]">N/A</span>;

  const isFollowUp = lead.connectStatus === "follow_up" && lead.followUpAt;
  const isOverdue = isFollowUp && parseFollowUpTime(lead.followUpAt!) < new Date();

  return (
    <>
      <span className="relative inline-block group">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className={`text-${fontSize} text-blue-400 dark:text-blue-300 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors`}
        >
          {displayValue}
        </button>
        <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#0092B8] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          <FiPhoneCall className="mr-1 inline -mt-0.5" size={11} />
          Make call
        </span>
      </span>

      {/* Follow-up badge — shown below phone number when status is follow_up */}
      {isFollowUp && (
        <span
          className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
            isOverdue
              ? "text-amber-500 dark:text-amber-400"
              : "text-teal-600 dark:text-teal-400"
          }`}
          title={`Follow up scheduled at ${formatFollowUpTime(lead.followUpAt!)}`}
        >
          <FiClock size={10} className="shrink-0" />
          {formatFollowUpTime(lead.followUpAt!)}
        </span>
      )}

      {open && (
        <CallModal
          lead={lead}
          onClose={() => setOpen(false)}
          onDisposed={onCallDisposed}
          campaignId={campaignId}
          campaignLeadId={campaignLeadId}
        />
      )}
    </>
  );
}
