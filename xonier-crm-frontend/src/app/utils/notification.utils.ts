import { NotificationEntityType, Notification } from "@/src/types/notification/notification.types";

export const getNotificationIcon = (entityType: NotificationEntityType): string => {
  switch (entityType) {
    case NotificationEntityType.EVENT:
      return "📅";
    case NotificationEntityType.TASK:
      return "✅";
    case NotificationEntityType.DEAL:
      return "💼";
    case NotificationEntityType.LEAD:
      return "👤";
    case NotificationEntityType.QUOTATION:
      return "📄";
    case NotificationEntityType.INVOICE:
      return "💰";
    case NotificationEntityType.USER:
      return "👥";
    case NotificationEntityType.COMPANY:
      return "🏢";
    case NotificationEntityType.SYSTEM:
      return "⚙️";
    default:
      return "🔔";
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

export const getNotificationLink = (notification: Notification): string | null => {
  if (!notification.entityId) return null;

  switch (notification.entityType) {
    case NotificationEntityType.EVENT:
      return `/calender`;
    case NotificationEntityType.TASK:
      return `/task/${notification.entityId}`;
    case NotificationEntityType.DEAL:
      return `/deals/${notification.entityId}`;
    case NotificationEntityType.LEAD:
      return `/leads/${notification.entityId}`;
    case NotificationEntityType.QUOTATION:
      return `/quotations/${notification.entityId}`;
    case NotificationEntityType.INVOICE:
      return `/invoices/${notification.entityId}`;
    case NotificationEntityType.USER:
      return `/users/${notification.entityId}`;
    case NotificationEntityType.COMPANY:
      return `/companies/${notification.entityId}`;
    default:
      return null;
  }
};