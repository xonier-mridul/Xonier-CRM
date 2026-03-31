import { Dispatch, SetStateAction } from "react";

// ── Enums (mirror Python enums) ───────────────────────────────────────────────
export enum TASK_PRIORITY {
  LOW    = "LOW",
  MEDIUM = "MEDIUM",
  HIGH   = "HIGH",
  URGENT = "URGENT",
}

export enum TASK_ENTITY_TYPE {
  PROJECT = "PROJECT",
  LEAD    = "LEAD",
  DEAL    = "DEAL",
  CONTACT = "CONTACT",
  COMPANY = "COMPANY",
}

export enum RECURRENCE_TYPE {
  DAILY   = "DAILY",
  WEEKLY  = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY  = "YEARLY",
}

export enum TaskPermissions {
  CREATE_TASK          = "CREATE_TASK",
  EDIT_TASK            = "EDIT_TASK",
  DELETE_TASK          = "DELETE_TASK",
  VIEW_TASK            = "VIEW_TASK",
  ASSIGN_TASK          = "ASSIGN_TASK",
  UPDATE_TASK_STATUS   = "UPDATE_TASK_STATUS",
  UPDATE_TASK_PRIORITY = "UPDATE_TASK_PRIORITY",
}

// ── API Payloads (mirror Python schemas 1:1) ──────────────────────────────────
export interface CreateTaskPayload {
  title:             string;
  description?:      string;
  category:          string;
  status?:           string;
  priority:          TASK_PRIORITY;
  entityType?:       TASK_ENTITY_TYPE;
  entityId?:         string;
  entityName?:       string;
  assignedTo:        string[];
  dueDate?:          string;
  startDate?:        string;
  estimatedHours?:   number;
  isRecurring:       boolean;
  recurrenceType?:   RECURRENCE_TYPE;
  recurrenceEndsAt?: string;
  tags:              string[];
  attachments:       string[];
  parentTask?:       string;
  order:             number;
}

export interface UpdateTaskPayload {
  title?:            string;
  description?:      string;
  priority?:         TASK_PRIORITY;
  dueDate?:          string;
  startDate?:        string;
  estimatedHours?:   number;
  actualHours?:      number;
  isRecurring?:      boolean;
  recurrenceType?:   RECURRENCE_TYPE;
  recurrenceEndsAt?: string;
  tags?:             string[];
  attachments?:      string[];
  entityType?:       TASK_ENTITY_TYPE;
  entityId?:         string;
  entityName?:       string;
}

export interface UpdateTaskStatusPayload {
  status:    string;
  category?: string;
}

export interface UpdateTaskPriorityPayload {
  priority: TASK_PRIORITY;
}

export interface AssignTaskPayload {
  assignedTo: string[];
}

export interface BulkAssignTaskPayload {
  taskIds:    string[];
  assignedTo: string[];
}

export interface BulkStatusUpdatePayload {
  taskIds: string[];
  status:  string;
}

export interface MoveTaskPayload {
  status: string;
  order?: number;
}

export interface ReorderTaskPayload {
  tasks: { id: string; order: number }[];
}

export interface AddWatcherPayload {
  userId: string;
}

// ── Lookup / response shapes ──────────────────────────────────────────────────
export interface AssignedUser {
  id:      string;
  name:    string;
  email:   string;
  avatar?: string;
}

export interface StatusOption {
  id:    string;
  name:  string;
  color: string;
  icon:  string;
}

export interface CategoryOption {
  id:    string;
  name:  string;
  icon?: string;
}

export interface UserOption {
  id:      string;
  name:    string;
  email:   string;
  avatar?: string;
}

export interface TaskItem {
  id:                string;
  title:             string;
  description:       string | null;
  category:          string;
  categoryName?:     string;
  status:            string;
  statusName?:       string;
  statusColor?:      string;
  statusIcon?:       string;
  priority:          TASK_PRIORITY;
  entityType?:       TASK_ENTITY_TYPE;
  entityId?:         string;
  entityName?:       string;
  assignedTo:        AssignedUser[];
  dueDate?:          string;
  startDate?:        string;
  estimatedHours?:   number;
  actualHours?:      number;
  isRecurring:       boolean;
  recurrenceType?:   RECURRENCE_TYPE;
  recurrenceEndsAt?: string;
  tags:              string[];
  attachments:       string[];
  parentTask?:       string;
  order:             number;
  createdAt:         string;
  updatedAt:         string;
}

export interface PaginatedTaskResponse {
  data:  TaskItem[];
  page:  number | string;
  limit: number | string;
  total: number;
}