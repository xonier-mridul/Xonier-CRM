"use client";

import React from "react";
import { EventInput } from "@fullcalendar/core";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS, PRIORITY } from "@/src/constants/enum";

interface ViewEventPopupProps {
  open: boolean;
  event: EventInput | null;
  onClose: () => void;
  onDelete: (id: string, title: string) => void;
  onEdit?: () => void;
}

const ViewEventPopup: React.FC<ViewEventPopupProps> = ({
  open,
  event,
  onClose,
  onDelete,
  onEdit,
}) => {
  const { hasPermission } = usePermissions();

  if (!open || !event) return null;

  // Fixed date formatting function with proper type handling
  const formatDateTime = (date: any): string => {
    if (!date) return "N/A";
    
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else {
      return "N/A";
    }
    
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: any): string => {
    if (!date) return "N/A";
    
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else {
      return "N/A";
    }
    
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: any): string => {
    if (!date) return "";
    
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else {
      return "";
    }
    
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40",
          text: "text-red-700 dark:text-red-300",
          badge: "bg-red-500 dark:bg-red-600",
          icon: "🔴",
        };
      case "medium":
        return {
          bg: "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/40 dark:to-yellow-900/40",
          text: "text-yellow-700 dark:text-yellow-300",
          badge: "bg-yellow-500 dark:bg-yellow-600",
          icon: "🟡",
        };
      case "low":
        return {
          bg: "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40",
          text: "text-green-700 dark:text-green-300",
          badge: "bg-green-500 dark:bg-green-600",
          icon: "🟢",
        };
      default:
        return {
          bg: "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
          text: "text-gray-700 dark:text-gray-300",
          badge: "bg-gray-500 dark:bg-gray-600",
          icon: "⚪",
        };
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "meeting":
        return "👥";
      case "task":
        return "✅";
      case "reminder":
        return "⏰";
      case "personal":
        return "🏠";
      default:
        return "📅";
    }
  };

  const priority = event.extendedProps?.priority || "medium";
  const priorityConfig = getPriorityConfig(priority);
  const eventTypeIcon = getEventTypeIcon(event.extendedProps?.eventType);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden m-4 transform transition-all animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-teal-600 dark:from-blue-700 dark:via-blue-600 dark:to-purple-700 px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{eventTypeIcon}</span>
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                  {event.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/30">
                  {event.extendedProps?.eventType?.replace('_', ' ') || "Event"}
                </span>
                {event.allDay && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    🌅 All Day
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 text-white border border-white/30 hover:rotate-90 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {event.allDay ? "📅 Date" : "🕐 Schedule"}
                </h3>
                {event.allDay ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(event.start)}
                    </p>
                    {event.end && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        to {formatDate(event.end)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Start</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(event.start)}
                      </p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatTime(event.start)}
                      </p>
                    </div>
                    {event.end && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">End</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(event.end)}
                        </p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {formatTime(event.end)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className={`${priorityConfig.bg} ${(priority === PRIORITY.HIGH) ? "border-red-500" : (priority === PRIORITY.MEDIUM) ? "border-yellow-500" : (priority === PRIORITY.LOW) ? "border-green-500" : "border-gray-500" } rounded-xl p-5 border border-opacity-50`}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center">
                <span className="text-2xl">{priorityConfig.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
                  Priority Level
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${priorityConfig.text} capitalize`}>
                    {priority}
                  </span>
                  <div className={`h-2 w-24 ${priorityConfig.badge} rounded-full opacity-60`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.extendedProps?.description && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    📝 Description
                  </h3>
                  <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {event.extendedProps.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.extendedProps?.meetingLink && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-5 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    🔗 Meeting Link
                  </h3>
                  <a
                    href={event.extendedProps.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-base font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline decoration-2 underline-offset-4 break-all transition-colors"
                  >
                    <span>Join Meeting</span>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-8 py-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Event ID: {event.id}
            </div>
            <div className="flex gap-3">
              {onEdit && hasPermission(PERMISSIONS.updateEvent) && (
                <button
                  onClick={onEdit}
                  className="px-5 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30  rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-4 focus:ring-blue-200  transition-all duration-200 flex items-center gap-2  cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Event
                </button>
              )}
              {hasPermission(PERMISSIONS.deleteEvent) && (
                <button
                  onClick={() => onDelete(event.id as string, event.title as string)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ViewEventPopup;