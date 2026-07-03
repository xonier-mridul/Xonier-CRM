"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationService } from "@/src/services/notification.service";
import {
  Notification,
  NotificationFilter,
  NotificationStatus,
} from "@/src/types/notification/notification.types";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";

const POLL_INTERVAL_MS = 30000;

export const useNotifications = (autoFetch = true) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const previousCountRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const fetchNotifications = useCallback(
    async (filters?: NotificationFilter) => {
      setLoading(true);
      try {
        const response = await NotificationService.getNotifications({
          page,
          limit: 20,
          ...filters,
        });

        if (response.success) {
          setNotifications(response.data.data);
          setTotalPages(response.data.totalPages);
          setTotal(response.data.total);
        }
      } catch (error) {
        toast.error("Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await NotificationService.getUnreadCount();
      if (response.success) {
        const currentCount = response.data.unreadCount;

        if (currentCount > previousCountRef.current) {
          toast.info(`You have ${currentCount} unread notifications`, {
            position: "top-right",
            autoClose: 4000,
          
          });
        }

        previousCountRef.current = currentCount;
        setUnreadCount(currentCount);
      }
    } catch (error) {
      console.error("Failed to fetch unread count");
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      try {
        const response = await NotificationService.markAsRead(notificationIds);
        if (response.success) {
          setNotifications((prev: Notification[]) =>
            prev.map((notif: Notification) =>
              notificationIds.includes(notif.id)
                ? ({
                    ...notif,
                    isRead: true,
                    status: NotificationStatus.READ,
                  } as Notification)
                : notif
            )
          );
          await fetchUnreadCount();
        }
      } catch (error) {
        toast.error("Failed to mark as read");
      }
    },
    [fetchUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await NotificationService.markAllAsRead();
      if (response.success) {
        setNotifications((prev: Notification[]) =>
          prev.map(
            (notif: Notification) =>
              ({
                ...notif,
                isRead: true,
                status: NotificationStatus.READ,
              } as Notification)
          )
        );
        setUnreadCount(0);
        previousCountRef.current = 0;
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const response =
          await NotificationService.deleteNotification(notificationId);
        if (response.success) {
          setNotifications((prev: Notification[]) =>
            prev.filter((notif: Notification) => notif.id !== notificationId)
          );
          await fetchUnreadCount();
          toast.success("Notification deleted");
        }
      } catch (error) {
        toast.error("Failed to delete notification");
      }
    },
    [fetchUnreadCount]
  );

  const clearAll = useCallback(async () => {
    try {
      const response = await NotificationService.clearAll();
      if (response.success) {
        setNotifications([]);
        setUnreadCount(0);
        previousCountRef.current = 0;
        toast.success("All notifications cleared");
      }
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  }, []);

  useEffect(() => {
    if (!autoFetch || !isAuthenticated) return;

    fetchNotifications();
    fetchUnreadCount();

    intervalRef.current = setInterval(() => {
      fetchUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, isAuthenticated, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    page,
    totalPages,
    total,
    setPage,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};