"use client";

import { useEffect, useRef, useCallback } from "react";
import { NotificationService } from "@/src/services/notification.service";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";

interface UseNotificationPollingProps {
  onNewNotification: (count: number) => void;
  intervalMs?: number;
}

export const useNotificationPolling = ({
  onNewNotification,
  intervalMs = 30000,
}: UseNotificationPollingProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousCountRef = useRef<number>(0);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const checkForNewNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await NotificationService.getUnreadCount();
      if (response.success) {
        const currentCount = response.data.unreadCount;

        if (currentCount > previousCountRef.current) {
          onNewNotification(currentCount);
        }

        previousCountRef.current = currentCount;
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [isAuthenticated, onNewNotification]);

  useEffect(() => {
    if (!isAuthenticated) return;

    checkForNewNotifications();

    intervalRef.current = setInterval(checkForNewNotifications, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, checkForNewNotifications, intervalMs]);
};