"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function TicketUpdates() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-2">{t("notifications")}</h3>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">{t("receive_updates_desc")}</p>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-gray-700">{t("email_notifications")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("email_notifications")}
          onClick={() => setEnabled((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B]" : "bg-gray-200"
          }`}
        >
          <motion.span
            className="inline-block h-4 w-4 rounded-full bg-white shadow"
            animate={{ x: enabled ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
      >
        {t("update_preferences")}
      </motion.button>
    </motion.div>
  );
}