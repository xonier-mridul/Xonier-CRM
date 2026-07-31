"use client";

import type { IconType } from "react-icons";
import { motion } from "framer-motion";
import {
  FiMail,
  FiMessageCircle,
  FiBookOpen,
  FiAlertTriangle,
  FiStar,
  FiActivity,
  FiChevronRight,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { SupportView } from "@/src/types/support/support.type";

interface SupportMenuProps {
  onSelectView: (view: SupportView) => void;
}

interface MenuEntry {
  id: Exclude<SupportView, "menu">;
  icon: IconType;
  accent: string;
}

const entries: MenuEntry[] = [
  { id: "contact", icon: FiMail, accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "chat", icon: FiMessageCircle, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "docs", icon: FiBookOpen, accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { id: "bug", icon: FiAlertTriangle, accent: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { id: "feature", icon: FiStar, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "status", icon: FiActivity, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
];

export default function SupportMenu({ onSelectView }: SupportMenuProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {entries.map(({ id, icon: Icon, accent }, index) => (
        <motion.button
          key={id}
          type="button"
          onClick={() => onSelectView(id)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          whileHover={{ y: -2 }}
          className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-700"
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${accent}`}>
            <Icon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(`support.menu.${id}.title`)}
            </span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
              {t(`support.menu.${id}.description`)}
            </span>
          </span>
          <FiChevronRight className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-cyan-500" />
        </motion.button>
      ))}
    </div>
  );
}