import api from "@/src/lib/axios";
import {
  NotificationFilter,
  NotificationResponse,
  UnreadCountResponse,
} from "@/src/types/notification/notification.types";

export class NotificationService {
  private static BASE_URL = "/v1/notifications";

  static async getNotifications(
    filters?: NotificationFilter
  ): Promise<NotificationResponse> {
    const params = new URLSearchParams();

    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.entityType) params.append("entityType", filters.entityType);
    if (filters?.isRead !== undefined)
      params.append("isRead", String(filters.isRead));
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const queryString = params.toString();
    const url = queryString
      ? `${this.BASE_URL}/?${queryString}`
      : `${this.BASE_URL}/`;

    const response = await api.get<NotificationResponse>(url);
    return response.data;
  }

  static async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get<UnreadCountResponse>(
      `${this.BASE_URL}/unread-count`
    );
    return response.data;
  }

  static async markAsRead(notificationIds: string[]): Promise<{
    success: boolean;
    message: string;
    data: { updated: number };
  }> {
    const response = await api.patch(`${this.BASE_URL}/mark-read`, {
      notificationIds,
    });
    return response.data;
  }

  static async markAllAsRead(): Promise<{
    success: boolean;
    message: string;
    data: { updated: number };
  }> {
    const response = await api.patch(`${this.BASE_URL}/mark-all-read`, {});
    return response.data;
  }

  static async archiveNotification(notificationId: string): Promise<{
    success: boolean;
    message: string;
    data: { archived: boolean };
  }> {
    const response = await api.patch(
      `${this.BASE_URL}/archive/${notificationId}`,
      {}
    );
    return response.data;
  }

  static async deleteNotification(notificationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await api.delete(`${this.BASE_URL}/${notificationId}`);
    return response.data;
  }

  static async clearAll(): Promise<{
    success: boolean;
    message: string;
    data: { deleted: number };
  }> {
    const response = await api.delete(`${this.BASE_URL}/clear-all`);
    return response.data;
  }
}