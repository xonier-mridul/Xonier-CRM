"use client";

import React, { useState } from "react";
import { Bell, CheckCircle2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/src/hooks/useNotifications";
import { getNotificationIcon, formatTimeAgo, getNotificationLink } from "@/src/app/utils/notification.utils";
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
    fetchNotifications,
    fetchUnreadCount,
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
      onMouseEnter={() => {
        setNotifOpen(true);
        void fetchNotifications();
        void fetchUnreadCount();
      }}
      onMouseLeave={() => setNotifOpen(false)}
    >

      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        className={`relative h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
          notifOpen
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80"
        }`}
      >
        <Bell size={17} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-semibold text-white bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

     

      <AnimatePresence>
        {notifOpen && !calOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 6 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-1.5 w-96 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("notifications")}
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium tabular-nums">
                    {unreadCount} {t("new")}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllAsRead();
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCircle2 size={13} strokeWidth={1.75} /> {t("mark_all_read")}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200"></div>
                </div>
              ) : notifications.length > 0 ?  (
                notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) handleMarkAsRead(notif.id);
                      const link = getNotificationLink(notif);
                      setNotifOpen(false);
                      router.push(link || "/notifications");
                    }}
                    className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors border-b border-slate-100/80 dark:border-slate-800/70 last:border-0 ${
                      !notif.isRead ? "bg-slate-50/70 dark:bg-slate-800/30" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base flex-shrink-0">
                      {getNotificationIcon(notif.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {!notif.isRead && (
                            <span className="h-1.5 w-1.5 bg-teal-500 rounded-full flex-shrink-0"></span>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notif.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={13} strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ):(
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Bell size={28} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600 mb-2.5" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("no_notifications_yet")}
                  </p>
                </div>
              ) }
            </div>

            <Link
              href="/notifications"
              className="block text-center py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 transition-colors"
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