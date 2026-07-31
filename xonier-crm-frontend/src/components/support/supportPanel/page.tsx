"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { SupportView } from "@/src/types/support/support.type";
import SupportMenu from "../supportMenu/page";
import ContactSupport from "../contact/page";
import LiveChat from "../liveChat/page";
import Documentation from "../documentation/page";
import ReportBug from "../reportBug/page";
import FeatureRequest from "../featureRequest/page";
import SystemStatus from "../systemStatus/page";

interface SupportPanelProps {
  activeView: SupportView;
  onSelectView: (view: SupportView) => void;
  onBack: () => void;
  onClose: () => void;
}

const viewTitleKeys: Record<SupportView, string> = {
  menu: "support.widget.title",
  contact: "support.menu.contact.title",
  chat: "support.menu.chat.title",
  docs: "support.menu.docs.title",
  bug: "support.menu.bug.title",
  feature: "support.menu.feature.title",
  status: "support.menu.status.title",
};

function renderView(view: SupportView, onSelectView: (view: SupportView) => void) {
  switch (view) {
    case "contact":
      return <ContactSupport />;
    case "chat":
      return <LiveChat />;
    case "docs":
      return <Documentation />;
    case "bug":
      return <ReportBug />;
    case "feature":
      return <FeatureRequest />;
    case "status":
      return <SystemStatus />;
    case "menu":
    default:
      return <SupportMenu onSelectView={onSelectView} />;
  }
}

export default function SupportPanel({ activeView, onSelectView, onBack, onClose }: SupportPanelProps) {
  const { t } = useTranslation();
  const isMenu = activeView === "menu";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("support.widget.title") ?? ""}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex h-[32rem] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/95 sm:w-96"
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-4 text-white">
        {!isMenu && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("support.common.back") ?? ""}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <FiArrowLeft />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{t(viewTitleKeys[activeView])}</h2>
          {isMenu && (
            <p className="truncate text-xs text-cyan-50/90">{t("support.widget.subtitle")}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("support.common.close") ?? ""}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <FiX />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: isMenu ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isMenu ? -12 : 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {renderView(activeView, onSelectView)}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}