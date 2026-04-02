import { Dispatch, SetStateAction } from "react";
import { CategoryItem } from "./category.types";
import { StatusItem } from "./status.types";
import { Timestamp } from "next/dist/server/lib/cache-handlers/types";
import { User } from "../auth/auth.types";

// ── Enums (mirror Python enums) ───────────────────────────────────────────────
export enum TASK_PRIORITY {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TASK_ENTITY_TYPE {
  PROJECT = "project",
  LEAD = "lead",
  DEAL = "deal",
  ENQUIRY = "enquiry",
  CONTACT = "contact",
  GENERAL = "general",
}

export enum RECURRENCE_TYPE {
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
}

// ── API Payloads (mirror Python schemas 1:1) ──────────────────────────────────
export interface CreateTaskPayload {
  title: string;
  description?: string;
  category: string;
  status?: string;
  priority: TASK_PRIORITY;
  entityType?: TASK_ENTITY_TYPE;
  entityId?: string;
  entityName?: string;
  assignedTo: string[];
  dueDate?: Date | Timestamp | null;
  startDate?: Date | Timestamp | null;
  estimatedHours?: number;
  isRecurring: boolean;
  recurrenceType?: RECURRENCE_TYPE;
  recurrenceEndsAt?: Date | Timestamp | null;
  tags: string[];
  attachments: string[];
  parentTask?: string | null;
  order: number;
}

export interface UpdateTaskPayload {
  title: string;
  description?: string;
  priority?: TASK_PRIORITY;
  dueDate?: Date | Timestamp | null;
  startDate?: Date | Timestamp | null;
  estimatedHours?: number;
  actualHours?: number;
  isRecurring?: boolean;
  recurrenceType?: RECURRENCE_TYPE;
  recurrenceEndsAt?: Date | Timestamp | null;
  tags?: string[];
  attachments?: string[];
  entityType?: TASK_ENTITY_TYPE;
  entityId?: string;
  entityName?: string;
  assignedTo?: string[];
  category: string;
  status: string;
}

export interface UpdateTaskStatusPayload {
  status: string;
  category?: string;
  order?: number;
}

export interface UpdateTaskPriorityPayload {
  priority: TASK_PRIORITY;
}

export interface AssignTaskPayload {
  assignedTo: string[];
}

export interface BulkAssignTaskPayload {
  taskIds: string[];
  assignedTo: string[];
}

export interface BulkStatusUpdatePayload {
  taskIds: string[];
  status: string;
}

export interface MoveTaskPayload {
  status: string;
  order?: number;
  category?: string;
}

export interface ReorderTaskPayload {
  tasks: { id: string; order: number }[];
}

export interface AddWatcherPayload {
  userId: string;
}


export interface AssignedUser {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  avatar?: string;
}

export interface StatusOption {
  _id: string;
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean
}

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  category: CategoryItem;
  categoryName?: string;
  status: StatusItem;
  statusName?: string;
  statusColor?: string;
  statusIcon?: string;
  priority: TASK_PRIORITY;
  entityType?: TASK_ENTITY_TYPE;
  entityId?: string;
  entityName?: string;
  assignedTo: AssignedUser[];
  dueDate?: Date | Timestamp | null;
  startDate?: Date | Timestamp | null;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  isRecurring: boolean;
  recurrenceType?: RECURRENCE_TYPE;
  recurrenceEndsAt?: Date | Timestamp | null;
  tags: string[];
  attachments: string[];
  parentTask?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export interface PaginatedTaskResponse {
  data: TaskItem[];
  page: number | string;
  limit: number | string;
  total: number;
}
