"use client";
import type { CampaignLeadAssignment } from "@/src/types/campaign/campaign.types";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import LeadEditForm from "./LeadEditForm";
import { Lead } from "@/src/types/leads/leads.types";

interface Props {
  campaignAssignment?: CampaignLeadAssignment;
  leadId: string;
  onClose: () => void;
  onSaved: (lead: Partial<Lead>) => void;
}

export default function LeadEditModal({ leadId, onClose, onSaved, campaignAssignment }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-call-lead-title"
      onCancel={onClose}
      onClick={(event) => event.stopPropagation()}
      className="m-auto max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto rounded-xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/60 dark:bg-gray-800 dark:text-white"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 id="edit-call-lead-title" className="text-sm font-semibold">Edit pipeline lead</h2>
        <button type="button" onClick={onClose} aria-label="Close lead editor" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
          <FiX size={20} />
        </button>
      </div>
      <LeadEditForm id={leadId} embedded onSaved={onSaved} campaignAssignment={campaignAssignment} />
    </dialog>,
    document.body
  );
}
