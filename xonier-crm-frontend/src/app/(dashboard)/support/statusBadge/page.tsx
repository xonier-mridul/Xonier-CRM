"use client";

import { TicketStatus } from "@/src/types/ticket/ticket.type";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status: TicketStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<TicketStatus, { bg: string; text: string; labelKey: string }> = {
  OPEN: { bg: "bg-blue-50", text: "text-blue-700", labelKey: "status_open" },
  UNDER_REVIEW: { bg: "bg-orange-50", text: "text-orange-700", labelKey: "status_under_review" },
  IN_PROGRESS: { bg: "bg-teal-50", text: "text-teal-700", labelKey: "status_in_progress" },
  WAITING_FOR_USER: { bg: "bg-yellow-50", text: "text-yellow-700", labelKey: "status_waiting_for_user" },
  RESOLVED: { bg: "bg-emerald-50", text: "text-emerald-700", labelKey: "status_resolved" },
};

const sizeConfig: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${config.bg} ${config.text} ${sizeConfig[size]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(config.labelKey)}
    </motion.span>
  );
}