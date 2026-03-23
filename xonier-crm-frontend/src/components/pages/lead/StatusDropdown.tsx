"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import { LeadEngagementStatus } from "@/src/types/leads/leads.types";

const AVAILABLE_STATUSES: LeadEngagementStatus[] = [
  LeadEngagementStatus.CONNECTED,
  LeadEngagementStatus.NOT_CONNECTED,
  LeadEngagementStatus.NOT_REACHED,
  LeadEngagementStatus.INTERESTED,
  LeadEngagementStatus.NOT_INTERESTED,
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
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle + calculate position
  const handleToggle = () => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();

    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });

    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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
      {/* Trigger */}
      <div className="relative inline-block" ref={dropdownRef}>
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

      {/* Portal Dropdown */}
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {AVAILABLE_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={status === currentStatus}
                className={`w-full text-left px-4 py-2 text-sm capitalize transition
                  ${
                    status === currentStatus
                      ? "bg-gray-200 dark:bg-gray-600 cursor-not-allowed"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                {STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}