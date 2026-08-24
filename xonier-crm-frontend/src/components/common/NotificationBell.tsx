"use client";

import React, { useState } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FiCheckCircle, FiTrash2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/src/hooks/useNotifications";
import { getNotificationIcon, formatTimeAgo } from "@/src/app/utils/notification.utils";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

interface NotificationBellProps {
  calOpen: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ calOpen }) => {
  const { t } = useTranslation();
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };
  

  

  return (
    <div
      className="relative"
      onMouseEnter={() => setNotifOpen(true)}
      onMouseLeave={() => setNotifOpen(false)}
    >

      <button className="relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100/60 dark:bg-gray-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600 transition-all group cursor-pointer">
        <IoMdNotificationsOutline className="text-2xl group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

     

      <AnimatePresence>
        {notifOpen && !calOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 8 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
            onClick={()=>router.push('/notifications')}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {t("notifications")}
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} {t("new")}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
                >
                  <FiCheckCircle /> {t("mark_all_read")}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              ) : notifications.length > 0 ?  (
                notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    className={`flex gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                      !notif.isRead ? "bg-cyan-50/40 dark:bg-cyan-900/10" : ""
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-800/40 flex items-center justify-center text-lg flex-shrink-0">
                      {getNotificationIcon(notif.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {!notif.isRead && (
                            <span className="h-2 w-2 bg-cyan-500 rounded-full flex-shrink-0"></span>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notif.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ):(
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <IoMdNotificationsOutline className="text-5xl text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("no_notifications_yet")}
                  </p>
                </div>
              ) }
            </div>

            <Link
              href="/notifications"
              className="block text-center py-3 text-sm font-medium text-cyan-600 hover:bg-slate-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 transition-colors"
            >
              {t("view_all_notifications")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default NotificationBell;