"use client";

import { Ticket } from "@/src/types/ticket/ticket.type";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiUser, FiCalendar, FiMessageSquare, FiFlag, FiBriefcase } from "react-icons/fi";
import StatusBadge from "../statusBadge/page";


interface TicketSummaryProps {
  ticket: Ticket;
}

const priorityColor: Record<Ticket["priority"], string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-amber-500",
  HIGH: "text-red-500",
};

function InfoItem({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1BA2C3]/10 text-[#1BA2C3]">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-semibold ${valueColor ?? "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}

export default function TicketSummary({ ticket }: TicketSummaryProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">{t("ticket_number")}</p>
          <h2 className="text-xl font-bold text-gray-900">#{ticket.id}</h2>
        </div>
        <StatusBadge status={ticket.status} size="lg" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-8">{ticket.subject}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <InfoItem icon={FiUser} label={t("raised_by")} value={ticket.raisedBy} />
        <InfoItem icon={FiBriefcase} label={t("department")} value={ticket.department} />
        <InfoItem
          icon={FiFlag}
          label={t("priority")}
          value={t(`priority_${ticket.priority.toLowerCase()}`)}
          valueColor={priorityColor[ticket.priority]}
        />
        <InfoItem icon={FiCalendar} label={t("created_date")} value={ticket.createdAt} />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
      >
        <FiMessageSquare size={16} />
        {t("view_conversation")}
      </motion.button>
    </motion.div>
  );
}