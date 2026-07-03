"use client";

import React from "react";
import { Notification } from "@/src/types/notification/notification.types";
import { FiTrash2, FiArchive, FiExternalLink } from "react-icons/fi";
import { getNotificationIcon, formatTimeAgo, getNotificationLink } from "@/src/app/utils/notification.utils";
import Link from "next/link";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onArchive,
}) => {
  const link = getNotificationLink(notification);

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${
        !notification.isRead
          ? "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center text-2xl flex-shrink-0">
        {getNotificationIcon(notification.entityType)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            {notification.title}
          </h4>
          {!notification.isRead && (
            <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {notification.body}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTimeAgo(notification.createdAt)}
          </span>

          <div className="flex items-center gap-2">
            {link && (
              <Link
                href={link}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs flex items-center gap-1"
              >
                <FiExternalLink /> View
              </Link>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(notification.id);
              }}
              className="text-gray-400 hover:text-orange-500 transition-colors"
              title="Archive"
            >
              <FiArchive className="text-sm" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <FiTrash2 className="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;