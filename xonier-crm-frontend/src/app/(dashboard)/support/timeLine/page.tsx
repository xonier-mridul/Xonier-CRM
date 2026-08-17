"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiFlag, FiSearch, FiSettings, FiUser, FiCheckCircle, FiInfo, FiClock } from "react-icons/fi";
import type { IconType } from "react-icons";
import TimelineStep from "../timeLineStep/page";
import { Ticket, TicketStatus } from "@/src/types/ticket/ticket.type";

interface TicketTimelineProps {
  ticket: Ticket;
}

const statusOrder: TicketStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
];

const statusIcons: Record<TicketStatus, IconType> = {
  OPEN: FiFlag,
  UNDER_REVIEW: FiSearch,
  IN_PROGRESS: FiSettings,
  WAITING_FOR_USER: FiUser,
  RESOLVED: FiCheckCircle,
};

export default function TicketTimeline({ ticket }: TicketTimelineProps) {
  const { t } = useTranslation();
  const currentIndex = statusOrder.indexOf(ticket.status);
  const progress = (currentIndex / (statusOrder.length - 1)) * 100;
  const activeEvent = ticket.history.find((event) => event.status === ticket.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-10">
        <FiClock className="text-[#1BA2C3]" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">{t("status_timeline")}</h3>
      </div>

      {/* Desktop horizontal timeline */}
      <div className="hidden md:block relative">
        <div className="absolute top-6 left-10 right-10 h-1 bg-gray-200 rounded-full" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute top-6 left-10 h-1 bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B] rounded-full"
          style={{ maxWidth: "calc(100% - 5rem)" }}
        />
        <div className="relative flex justify-between">
          {ticket.history.map((event, index) => {
            const stepIndex = statusOrder.indexOf(event.status);
            return (
              <TimelineStep
                key={event.id}
                index={index}
                icon={statusIcons[event.status]}
                title={t(event.title)}
                description={t(event.description)}
                date={event.date}
                completed={stepIndex < currentIndex}
                active={stepIndex === currentIndex}
              />
            );
          })}
        </div>
      </div>

      {/* Mobile vertical timeline */}
      <div className="md:hidden">
        {ticket.history.map((event, index) => {
          const stepIndex = statusOrder.indexOf(event.status);
          return (
            <TimelineStep
              key={event.id}
              index={index}
              orientation="vertical"
              icon={statusIcons[event.status]}
              title={t(event.title)}
              description={t(event.description)}
              date={event.date}
              completed={stepIndex < currentIndex}
              active={stepIndex === currentIndex}
              isLast={index === ticket.history.length - 1}
            />
          );
        })}
      </div>

      {/* Current status panel */}
      <div className="mt-10 flex flex-col md:flex-row md:items-center gap-6 rounded-2xl border border-[#1BA2C3]/20 bg-gradient-to-br from-[#1BA2C3]/5 to-[#33BF8B]/5 p-6">
        <div className="flex flex-1 items-start gap-3">
          <FiInfo className="mt-0.5 shrink-0 text-[#1BA2C3]" size={20} />
          <div>
            <h4 className="font-semibold text-gray-900">{t("current_status")}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {activeEvent ? t(activeEvent.description) : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-gray-500">{t("estimated_response")}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{ticket.estimatedResponse}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("last_updated")}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{ticket.updatedAt}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}