"use client";

import React, { useState } from "react";
import { useNotifications } from "@/src/hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import { NotificationFilter, NotificationStatus } from "@/src/types/notification/notification.types";
import { FiCheckCircle, FiTrash2, FiFilter } from "react-icons/fi";

const NotificationList = () => {
  const {
    notifications,
    loading,
    page,
    totalPages,
    setPage,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilter>({});

  const handleFilterChange = (key: keyof NotificationFilter, value: any) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    fetchNotifications(newFilter);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead([id]);
  };

  const handleArchive = async (id: string) => {
    await deleteNotification(id);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Notifications
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiCheckCircle /> Mark all as read
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiTrash2 /> Clear all
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <FiFilter className="text-gray-400" />
        <select
          value={filter.status || ""}
          onChange={(e) =>
            handleFilterChange("status", e.target.value || undefined)
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="">All Status</option>
          <option value={NotificationStatus.UNREAD}>Unread</option>
          <option value={NotificationStatus.READ}>Read</option>
        </select>

        <select
          value={filter.isRead !== undefined ? String(filter.isRead) : ""}
          onChange={(e) =>
            handleFilterChange(
              "isRead",
              e.target.value === "" ? undefined : e.target.value === "true"
            )
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="">All</option>
          <option value="false">Unread Only</option>
          <option value="true">Read Only</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No notifications found
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={deleteNotification}
                onArchive={handleArchive}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationList;