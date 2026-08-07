"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiHome, FiChevronRight } from "react-icons/fi";

export default function TicketHeader() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="space-y-5">
    
<div className="flex justify-between items-center">
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
        <FiHome size={14} />
        <span>{t("my_tickets")}</span>
        <FiChevronRight size={14} />
        <span className="font-medium text-gray-900">{t("ticket_details")}</span>
      </nav>
        <motion.button
        whileHover={{ x: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1BA2C3] transition-colors border border-slate-200 rounded-xl px-4 py-2.5"
      >
        <FiArrowLeft size={16} />
        {t("back")}
      </motion.button>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t("ticket_details")}</h1>
        <p className="text-gray-500 mt-1">{t("track_ticket_subtitle")}</p>
      </div>
    </div>
  );
}