"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import StatusBadge from "../statusBadge/page";
import { PreviousTicket } from "@/src/types/ticket/ticket.type";

interface TicketHistoryProps {
  tickets: PreviousTicket[];
}

export default function TicketHistory({ tickets }: TicketHistoryProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="border-b border-gray-100 p-6 md:p-8">
        <h3 className="text-lg font-semibold text-gray-900">{t("previous_tickets")}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="whitespace-nowrap px-6 py-3 font-medium">{t("ticket_id")}</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">{t("subject")}</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">{t("status")}</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">{t("priority")}</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">{t("updated")}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
              >
                <td className="whitespace-nowrap px-6 py-4 font-semibold text-gray-900">
                  #{ticket.id}
                </td>
                <td className="max-w-xs px-6 py-4 text-gray-600 truncate">{ticket.subject}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} size="sm" />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                  {t(`priority_${ticket.priority.toLowerCase()}`)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">{ticket.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}