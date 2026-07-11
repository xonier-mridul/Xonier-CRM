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
  { label: string; color: string }
> = {
  [LeadEngagementStatus.INTERESTED]: {
    label: "Interested",
    color: "bg-green-500",
  },
  [LeadEngagementStatus.NOT_INTERESTED]: {
    label: "Not Interested",
    color: "bg-red-500",
  },
  [LeadEngagementStatus.CONNECTED]: {
    label: "Connected",
    color: "bg-blue-500",
  },
  [LeadEngagementStatus.NOT_CONNECTED]: {
    label: "Not Connected",
    color: "bg-yellow-500",
  },
  [LeadEngagementStatus.NOT_REACHED]: {
    label: "Not Reached",
    color: "bg-gray-500",
  },
  [LeadEngagementStatus.WRONG_NUMBER]: {
    label: "Wrong Number",
    color: "bg-red-900",
  },
  [LeadEngagementStatus.MEETING_SCHEDULED]: {
    label: "Meeting Scheduled",
    color: "bg-green-900",
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
      {/* 🔹 Button */}
      <div className="inline-block  " ref={buttonRef}>
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`${
            STATUS_CONFIG[currentStatus].color
          } text-white px-4 py-1.5 text-sm rounded-md flex items-center gap-2 justify-between min-w-[140px]`}
        >
          <span>{STATUS_CONFIG[currentStatus].label}</span>

          {isUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FaChevronDown
              className={`text-xs transition-transform ${
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

                  <span className="text-sm text-gray-800 dark:text-white">
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
