"use client";

import { Attachment, Ticket } from "@/src/types/ticket/ticket.type";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiFile, FiDownload } from "react-icons/fi";

interface TicketInformationProps {
  ticket: Ticket;
}

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:border-[#1BA2C3]/30 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
          <FiFile size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
          <p className="text-xs text-gray-500">{attachment.size}</p>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t("download_file")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-[#1BA2C3]/10 hover:text-[#1BA2C3] transition-colors"
      >
        <FiDownload size={16} />
      </motion.button>
    </div>
  );
}

export default function TicketInformation({ ticket }: TicketInformationProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm h-full"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{t("ticket_information")}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <FieldBlock label={t("issue_type")} value={ticket.issueType} />
        <FieldBlock label={t("product")} value={ticket.product} />
        <FieldBlock label={t("module")} value={ticket.module} />
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {t("description")}
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
          {t("attachments")}
        </h4>
        {ticket.attachments.length === 0 ? (
          <p className="text-sm text-gray-400">{t("no_attachments")}</p>
        ) : (
          <div className="space-y-3">
            {ticket.attachments.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}