"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { createPortal } from "react-dom";
import { LeadEngagementStatus } from "@/src/constants/enum"

const AVAILABLE_STATUSES: LeadEngagementStatus[] = [
  LeadEngagementStatus.CONNECTED,
  LeadEngagementStatus.NOT_CONNECTED,
  LeadEngagementStatus.NOT_REACHED,
  LeadEngagementStatus.INTERESTED,
  LeadEngagementStatus.MEETING_SCHEDULED,
  LeadEngagementStatus.NOT_INTERESTED,
  LeadEngagementStatus.WRONG_NUMBER,
];

export const STATUS_CONFIG: Record<
  LeadEngagementStatus,
  { label: string; color: string; textColor: string }
> = {
  [LeadEngagementStatus.INTERESTED]: {
    label: "Interested",
    color: "bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40",
    textColor: "text-teal-600 dark:text-teal-400",
  },
  [LeadEngagementStatus.NOT_INTERESTED]: {
    label: "Not Interested",
    color: "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40",
    textColor: "text-rose-500 dark:text-rose-400",
  },
  [LeadEngagementStatus.CONNECTED]: {
    label: "Connected",
    color: "bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/40",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  [LeadEngagementStatus.NOT_CONNECTED]: {
    label: "Not Connected",
    color: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  [LeadEngagementStatus.NOT_REACHED]: {
    label: "Not Reached",
    color: "bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600",
    textColor: "text-slate-500 dark:text-slate-400",
  },
  [LeadEngagementStatus.WRONG_NUMBER]: {
    label: "Wrong Number",
    color: "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40",
    textColor: "text-rose-500 dark:text-rose-400",
  },
  [LeadEngagementStatus.MEETING_SCHEDULED]: {
    label: "Meeting Scheduled",
    color: "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40",
    textColor: "text-violet-600 dark:text-violet-400",
  },
};

type Props = {
  currentStatus: LeadEngagementStatus;
  Id: string;
  onStatusUpdate: (
    id: string,
    newStatus: LeadEngagementStatus
  ) => Promise<void>;
};

export default function StatusDropdown({
  currentStatus,
  Id,
  onStatusUpdate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [openUpward, setOpenUpward] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ✅ toggle with auto direction
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // approx height
      const spaceBelow = window.innerHeight - rect.bottom;

      const shouldOpenUp = spaceBelow < dropdownHeight;
      setOpenUpward(shouldOpenUp);

      setPosition({
        top: shouldOpenUp
          ? rect.top - 10 // above button
          : rect.bottom + 10, // below button
        left: rect.left + rect.width / 2,
      });
    }

    setIsOpen((prev) => !prev);
  };

  const handleStatusChange = async (
    newStatus: LeadEngagementStatus
  ) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setIsUpdating(true);

    try {
      await onStatusUpdate(Id, newStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Button */}
      <div className="inline-block" ref={buttonRef}>
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`${
            STATUS_CONFIG[currentStatus].color
          } ${STATUS_CONFIG[currentStatus].textColor} px-3 py-1.5 text-[13px] font-semibold rounded-md flex items-center gap-2 justify-between min-w-[130px] transition-all`}
        >
          <span>{STATUS_CONFIG[currentStatus].label}</span>
          {isUpdating ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <FaChevronDown
              className={`text-[10px] opacity-60 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>
      </div>

      {/* 🔹 Floating Dropdown */}
      {isOpen &&
        createPortal(
          <div
            className="fixed z-[9999]"
            style={{
              top: position.top,
              left: position.left,
              transform: openUpward
                ? "translate(-50%, -100%)"
                : "translateX(-50%)",
            }}
          >
            <div
              ref={menuRef}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-[220px] p-4 flex flex-col gap-3 animate-[fadeIn_0.2s_ease]"
            >
              {AVAILABLE_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={status === currentStatus}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition
                    ${
                      status === currentStatus
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      STATUS_CONFIG[status].color
                    }`}
                  />

                  <span className="text-[13px] text-gray-800 dark:text-white">
                    {STATUS_CONFIG[status].label}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
