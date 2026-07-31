"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiArrowLeft } from "react-icons/fi";

interface TicketNotFoundProps {
  ticketId: string;
}

export default function TicketNotFound({ ticketId }: TicketNotFoundProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-400">
        <FiAlertTriangle size={26} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">{t("ticket_not_found_title")}</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        {t("ticket_not_found_desc", { id: ticketId })}
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/supportTicket")}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
      >
        <FiArrowLeft size={16} />
        {t("back_to_tickets")}
      </motion.button>
    </motion.div>
  );
}