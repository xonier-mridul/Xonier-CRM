"use client";
import React, { useEffect, useRef } from "react";
import { Activity } from "@/src/types/action/action.types";
import { ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE } from "@/src/constants/enum";
import { InfoCard } from "../../ui/LeadComponent";

interface ActivityDetailPopupProps {
  activity: Activity | null;
  onClose: () => void;
}

const ENTITY_ICON: Partial<Record<ACTIVITY_ENTITY_TYPE, string>> = {
  [ACTIVITY_ENTITY_TYPE.ENQUIRY]: "◎",
  [ACTIVITY_ENTITY_TYPE.LEAD]: "◈",
  [ACTIVITY_ENTITY_TYPE.DEAL]: "◆",
  [ACTIVITY_ENTITY_TYPE.QUOTATION]: "◉",
  [ACTIVITY_ENTITY_TYPE.INVOICE]: "▣",
  [ACTIVITY_ENTITY_TYPE.USER]: "👤",
  [ACTIVITY_ENTITY_TYPE.AUTH]: "🔐",
  [ACTIVITY_ENTITY_TYPE.EVENT]: "📅",
  [ACTIVITY_ENTITY_TYPE.TASK]: "✅",
  [ACTIVITY_ENTITY_TYPE.TASK_REPORT]: "📋",
  [ACTIVITY_ENTITY_TYPE.PLAN]: "📦",
  [ACTIVITY_ENTITY_TYPE.COMPANY]: "🏢",
  [ACTIVITY_ENTITY_TYPE.OTP]: "🔢",
};

const ACTION_STYLE: Partial<
  Record<
    ACTIVITY_ACTION,
    {
      bg: string;
      text: string;
      dot: string;
      bar: string;
    }
  >
> = {
  [ACTIVITY_ACTION.CREATED]: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },

  [ACTIVITY_ACTION.UPDATED]: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },

  [ACTIVITY_ACTION.SENT]: {
    bg: "bg-violet-100 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },

  [ACTIVITY_ACTION.RESEND]: {
    bg: "bg-indigo-100 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
  },

  [ACTIVITY_ACTION.CONVERTED]: {
    bg: "bg-cyan-100 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },

  [ACTIVITY_ACTION.CLOSED_WON]: {
    bg: "bg-yellow-100 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    bar: "bg-yellow-500",
  },

  [ACTIVITY_ACTION.CLOSED_LOST]: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },

  [ACTIVITY_ACTION.DELETE]: {
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },

  [ACTIVITY_ACTION.WON]: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },

  [ACTIVITY_ACTION.LOST]: {
    bg: "bg-pink-100 dark:bg-pink-950/40",
    text: "text-pink-700 dark:text-pink-400",
    dot: "bg-pink-500",
    bar: "bg-pink-500",
  },

  [ACTIVITY_ACTION.ACCEPTED]: {
    bg: "bg-teal-100 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-400",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },

  [ACTIVITY_ACTION.SMS_SENT]: {
    bg: "bg-sky-100 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },

  [ACTIVITY_ACTION.SMS_DELIVERED]: {
    bg: "bg-lime-100 dark:bg-lime-950/40",
    text: "text-lime-700 dark:text-lime-400",
    dot: "bg-lime-500",
    bar: "bg-lime-500",
  },

  [ACTIVITY_ACTION.EMAIL_SENT]: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    dot: "bg-fuchsia-500",
    bar: "bg-fuchsia-500",
  },

  [ACTIVITY_ACTION.EMAIL_OPENED]: {
    bg: "bg-purple-100 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
  },

  [ACTIVITY_ACTION.RESTORE]: {
    bg: "bg-green-100 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    bar: "bg-green-500",
  },

  [ACTIVITY_ACTION.VERIFY]: {
    bg: "bg-orange-100 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },

  [ACTIVITY_ACTION.REGISTER]: {
    bg: "bg-cyan-100 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-600 dark:text-gray-400",
  dot: "bg-gray-400",
  bar: "bg-gray-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserLabel(user: Activity["userId"]): string {
  if (!user || typeof user !== "object") return String(user ?? "—");
  const u = user as any;
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return name || u.email || u.id || "—";
}

const ActivityDetailPopup: React.FC<ActivityDetailPopupProps> = ({
  activity,
  onClose,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activity) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activity, onClose]);

  if (!activity) return null;

  const style = ACTION_STYLE[activity.action] ?? DEFAULT_STYLE;
  const icon = ENTITY_ICON[activity.entityType] ?? "●";
  const metaEntries = activity.metadata ? Object.entries(activity.metadata) : [];

  return (
    <>
      <style>{`
        @keyframes _fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes _slideUp { from { opacity: 0; transform: translateY(14px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        ._popup-overlay { animation: _fadeIn  0.15s ease both }
        ._popup-panel   { animation: _slideUp 0.2s cubic-bezier(0.16,1,0.3,1) both }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={(e) => e.target === overlayRef.current && onClose()}
        className="_popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      >
        {/* Panel */}
        <div className="_popup-panel w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">

          {/* Top colour bar */}
          <div className={`h-1 w-full ${style.bar}`} />

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-xl text-gray-400 dark:text-gray-500 mt-0.5 leading-none select-none">
                {icon}
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                  {activity.title}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Action badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {activity.action.replace("_", " ")}
                  </span>
                  {/* Entity type badge */}
                  <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
                    {activity.entityType}
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-3 mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l11 11M13 2L2 13" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

            {/* Description */}
            {activity.description && (
              <InfoCard title="Description">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {activity.description}
                </p>
              </InfoCard>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard title="Performed By">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {getUserLabel(activity.userId)}
                </p>
              </InfoCard>

              <InfoCard title="Entity ID">
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                  {activity.entityId ?? "—"}
                </p>
              </InfoCard>

              <InfoCard title="Perform Score">
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {activity.perform}
                </p>
              </InfoCard>

              <InfoCard title="Created At">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {formatDate(activity.createdAt)}
                </p>
              </InfoCard>
            </div>

            {/* Activity ID */}
            <InfoCard title="Activity ID">
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
                {activity.id}
              </p>
            </InfoCard>

            {/* Metadata */}
            {metaEntries.length > 0 && (
              <InfoCard title="Metadata">
                <div className="divide-y divide-gray-100 dark:divide-gray-600">
                  {metaEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[auto_1fr] gap-x-4 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-px">
                        {key}
                      </span>
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap">
                        {typeof val === "object" && val !== null
                          ? JSON.stringify(val, null, 2)
                          : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivityDetailPopup;