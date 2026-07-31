"use client";

import { motion } from "framer-motion";
import { LuHeadset } from "react-icons/lu";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface FloatingButtonProps {
  open: boolean;
  hasUnread?: boolean;
  onToggle: () => void;
}

export default function FloatingButton({ open, hasUnread = false, onToggle }: FloatingButtonProps) {
  const { t } = useTranslation();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={open ? t("support.widget.closeLabel") : t("support.widget.openLabel")}
      aria-expanded={open}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-xl text-white shadow-lg shadow-cyan-600/30 transition-colors hover:bg-cyan-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 dark:focus-visible:ring-cyan-800"
    >
      <motion.span
        key={open ? "close" : "open"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {open ? <FiX /> : <LuHeadset />}
      </motion.span>

      {!open && hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        </span>
      )}
    </motion.button>
  );
}