"use client";

import { AppMode } from "@/src/types/referral/referral.type";
import { useTranslation } from "react-i18next";


export default function AppBar({
  mode,
  onModeChange,
}: {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}) {
  const { t } = useTranslation();

  const who =
    mode === "partner" ? "Jeevant Global Solutions" : "Priya Nair · " + t("appbar.financeAdmin");
  const avatarInitials = mode === "partner" ? "JG" : "PN";

  return (
    <div className="flex items-center bg-white justify-between gap-5 bg-ink px-5 py-3.5 text-[#EFEDE3] sm:px-7 fixed top-0 w-full z-10">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[18px] items-end gap-0.5">
          <span className="w-1 rounded-sm bg-cyan-300" style={{ height: 6 }} />
          <span className="w-1 rounded-sm bg-cyan-300" style={{ height: 10 }} />
          <span className="w-1 rounded-sm bg-cyan-300" style={{ height: 14 }} />
          <span className="w-1 rounded-sm bg-[#DEEFE8]" style={{ height: 18 }} />
        </div>
        <div className="font-display text-lg text-cyan-500 tracking-tight">
          Xonier <b className="font-semibold">{t("appbar.brandSuffix")}</b>
        </div>
      </div>

      <div className="flex bg-slate-200  gap-0.5 rounded-full p-[3px]">
        <button
          onClick={() => onModeChange("partner")}
          className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
            mode === "partner" ? " font-medium text-white bg-cyan-500" : "text-slate-400"
          }`}
        >
          {t("appbar.partnerPortal")}
        </button>
        <button
          onClick={() => onModeChange("admin")}
          className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
            mode === "admin" ? "font-medium text-white bg-cyan-500" : "text-slate-400"
          }`}
        >
          {t("appbar.adminConsole")}
        </button>
      </div>

      <div className="flex items-center gap-2.5 text-[13px] text-slate-400">
        <span className="hidden sm:inline">{who}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-medium text-white">
          {avatarInitials}
        </div>
      </div>
    </div>
  );
}
