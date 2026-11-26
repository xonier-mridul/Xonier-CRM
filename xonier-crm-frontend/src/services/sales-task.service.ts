import api from "../lib/axios";
import type { LeadEngagementStatus } from "../constants/enum";

export type SalesTaskMode = "assign" | "reassign";
export type SalesTaskSelection = { mode: SalesTaskMode; userId: string; leadIds: string[] };
export type SalesTaskDraft = SalesTaskSelection & { requestId: string };
export type SalesTaskStatus = "pending" | "completed";
export type SalesTask = {
  taskCount?: number;
  pending?: number;
  completed?: number;
  overdue?: number;
  assigneeId?: string;
  assigneeName?: string;
  id: string;
  leadId: string;
  leadCode?: string;
  leadName?: string;
  connectStatus: LeadEngagementStatus;
  followUpAt: string | null;
  title: string;
  instructions: string;
  assignedAt: string;
  dueDate: string;
  status: SalesTaskStatus;
};
export type SalesTaskPreview = {
  assigneeName: string;
  leads: { id: string; code?: string; name?: string }[];
};
export type SalesTaskResult = {
  tasksCreated: number;
  skippedRecords: { leadId: string; lead_id: string; reason: string }[];
};

export const SALES_TASK_BATCH_LIMIT = 200;
export const SALES_TASK_DRAFT_KEY = "sales-tasks:assignment-draft";

const SalesTaskService = {
  preview: (selection: SalesTaskSelection, signal: AbortSignal) =>
    api.post<{ data: SalesTaskPreview }>("/sales-tasks/preview", selection, { signal }),
  create: (payload: SalesTaskDraft & { title: string; dueDate: string; instructions: string }) =>
    api.post<{ data: SalesTaskResult }>("/sales-tasks/assign", payload),
  list: (params: {
    dateField: "assignedAt" | "dueDate";
    dateFrom?: string;
    dateTo?: string;
    dueToday?: boolean;
    status?: SalesTaskStatus;
    page: number;
    team?: boolean;
    assigneeId?: string;
    search?: string;
  }, signal: AbortSignal) => api.get<{ data: { items: SalesTask[]; total: number } }>(
    "/sales-tasks", { params, signal },
  ),
  complete: (id: string) => api.patch(`/sales-tasks/${id}/complete`),
};

export default SalesTaskService;
