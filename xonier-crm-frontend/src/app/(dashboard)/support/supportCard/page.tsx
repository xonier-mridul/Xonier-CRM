"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiArrowRight, FiBook, FiMessageSquare, FiPhone, FiMail } from "react-icons/fi";
import type { IconType } from "react-icons";

interface SupportItem {
  icon: IconType;
  labelKey: string;
}

const supportItems: SupportItem[] = [
  { icon: FiBook, labelKey: "help_center" },
  { icon: FiMessageSquare, labelKey: "live_chat" },
  { icon: FiPhone, labelKey: "call_support" },
  { icon: FiMail, labelKey: "email_support" },
];

export default function TicketSupportCard() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-4">{t("need_help")}</h3>
      <div className="space-y-1">
        {supportItems.map((item) => (
          <motion.button
            key={item.labelKey}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex w-full items-center justify-between rounded-xl p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1BA2C3]/10 text-[#1BA2C3]">
                <item.icon size={15} />
              </div>
              <span className="text-sm font-medium text-gray-700">{t(item.labelKey)}</span>
            </div>
            <FiArrowRight
              size={14}
              className="text-gray-300 group-hover:text-[#1BA2C3] transition-colors"
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}