"use client";
import type { CampaignLeadAssignment } from "@/src/types/campaign/campaign.types";

import { useState } from "react";
import { FiPhoneCall } from "react-icons/fi";
import CallModal from "@/src/components/pages/lead/CallModal";
import { Lead } from "@/src/types/leads/leads.types";

interface CallablePhoneProps {
  lead: Lead;
  displayValue: string;
  fontSize?: string;
  onCallDisposed?: (leadId: string, connectStatus: string) => void;
  onLeadUpdated?: (leadId: string, lead: Partial<Lead>) => void;
  /** When called from a campaign, the backend verifies this exact assignment. */
  campaignAssignment?: CampaignLeadAssignment;
  campaignId?: string;
  campaignLeadId?: string;
}

export default function CallablePhone({
  lead,
  displayValue,
  fontSize = "[13px]",
  onCallDisposed,
  onLeadUpdated,
  campaignAssignment,
  campaignId,
  campaignLeadId,
}: CallablePhoneProps) {
  const [open, setOpen] = useState(false);

  if (!lead.phone) return <span className="text-slate-400 text-[13px]">N/A</span>;

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

      {open && (
        <CallModal
          lead={lead}
          onClose={() => setOpen(false)}
          onDisposed={onCallDisposed}
          onLeadUpdated={onLeadUpdated}
          campaignAssignment={campaignAssignment}
          campaignId={campaignId}
          campaignLeadId={campaignLeadId}
        />
      )}
    </>
  );
}
