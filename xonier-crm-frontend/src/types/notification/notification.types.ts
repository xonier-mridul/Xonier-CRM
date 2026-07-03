export enum NotificationType {
  EVENT_CREATED = "event_created",
  EVENT_UPDATED = "event_updated",
  EVENT_DELETED = "event_deleted",
  EVENT_REMINDER = "event_reminder",

  TASK_CREATED = "task_created",
  TASK_UPDATED = "task_updated",
  TASK_ASSIGNED = "task_assigned",
  TASK_COMPLETED = "task_completed",
  TASK_OVERDUE = "task_overdue",

  DEAL_CREATED = "deal_created",
  DEAL_UPDATED = "deal_updated",
  DEAL_STAGE_CHANGED = "deal_stage_changed",
  DEAL_WON = "deal_won",
  DEAL_LOST = "deal_lost",

  LEAD_CREATED = "lead_created",
  LEAD_ASSIGNED = "lead_assigned",
  LEAD_UPDATED = "lead_updated",
  LEAD_CONVERTED = "lead_converted",

  QUOTATION_CREATED = "quotation_created",
  QUOTATION_SENT = "quotation_sent",
  QUOTATION_ACCEPTED = "quotation_accepted",
  QUOTATION_REJECTED = "quotation_rejected",

  INVOICE_CREATED = "invoice_created",
  INVOICE_PAID = "invoice_paid",
  INVOICE_OVERDUE = "invoice_overdue",

  USER_INVITED = "user_invited",
  USER_REGISTERED = "user_registered",

  GENERAL = "general",
  SYSTEM = "system",
}

export enum NotificationEntityType {
  EVENT = "event",
  TASK = "task",
  DEAL = "deal",
  LEAD = "lead",
  QUOTATION = "quotation",
  INVOICE = "invoice",
  USER = "user",
  COMPANY = "company",
  GENERAL = "general",
  SYSTEM = "system",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId?: string | null;
  title: string;
  body: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  metadata?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  companyId?: string | null;
}

export interface NotificationFilter {
  status?: NotificationStatus;
  type?: NotificationType;
  entityType?: NotificationEntityType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: {
    data: Notification[];
    page: number;
    totalPages: number;
    limit: number;
    total: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: {
    unreadCount: number;
  };
}