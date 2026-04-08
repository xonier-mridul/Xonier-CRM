import api from "@/src/lib/axios";
import {
  CreateTaskPayload,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
  UpdateTaskPriorityPayload,
  AssignTaskPayload,
  BulkAssignTaskPayload,
  BulkStatusUpdatePayload,
  MoveTaskPayload,
  ReorderTaskPayload,
  AddWatcherPayload,
  TaskItem,
  CreateSubTaskPayload,
  UpdateSubTaskPayload,
} from "@/src/types/task/task.types";
import { create } from "domain";

interface GetAllParams {
  currentPage: number;
  pageLimit: number;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  user?: string;
}

export const TaskService = {
  getAll: ({ currentPage, pageLimit, status, priority, category, search ,user }: GetAllParams) => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageLimit),
      ...(status   && { status }),
      ...(priority && { priority }),
      ...(category && { category }),
      ...(search   && { search }),
      ...(user     && { user }),
    });
    return api.get(`/task/all?${params.toString()}`);
  },

  getById: (id: string) => api.get<{ data: TaskItem }>(`/task/${id}`),

  create: (payload: CreateTaskPayload) => api.post("/task/create", payload),

  update: (id: string, payload: UpdateTaskPayload) => api.put(`/task/update/${id}`, payload),

  updateStatus: (id: string, payload: UpdateTaskStatusPayload) => api.patch(`/task/status/${id}`, payload),

  updatePriority: (id: string, payload: UpdateTaskPriorityPayload) => api.patch(`/task/${id}/priority`, payload),

  assign: (id: string, payload: AssignTaskPayload) => api.patch(`/task/assign/${id}`, payload),

  moveTask: (id: string, payload: MoveTaskPayload & { category?: string }) => api.patch(`/task/move/${id}`, payload),

  reorder: (payload: ReorderTaskPayload) => api.patch("/task/reorder", payload),

  bulkAssign: (payload: BulkAssignTaskPayload) => api.post("/task/bulk-assign", payload),

  bulkStatusUpdate: (payload: BulkStatusUpdatePayload) => api.patch("/task/bulk-status", payload),

  addWatcher: (id: string, payload: AddWatcherPayload) => api.post(`/task/${id}/watcher`, payload),

  removeWatcher: (id: string, watcherId: string) => api.delete(`/task/${id}/watcher/${watcherId}`),

  getActivity: (id: string) => api.get(`/task/${id}/activity`),

  getKanban: (categoryId: string) => api.get(`/task/kanban/${categoryId}`),

  getMyTasks: (params?: { page?: number; limit?: number; status?: string; priority?: string; category?: string }) => {
    const p = new URLSearchParams({
      page: String(params?.page ?? 1),
      limit: String(params?.limit ?? 20),
      ...(params?.status   && { status: params.status }),
      ...(params?.priority && { priority: params.priority }),
      ...(params?.category && { category: params.category }),
    });
    return api.get(`/task/my-tasks?${p.toString()}`);
  },

  getDueToday: () => api.get("/task/due-today"),

  getOverdue: () => api.get("/task/overdue"),

  getByEntity: (entityType: string, entityId: string) => api.get(`/task/by-entity/${entityType}/${entityId}`),

  delete: (id: string) => api.delete(`/task/delete/${id}`),

  getSubTasks: (id: string) => api.get(`/task/${id}/subtasks`),

  createSubTask: (id: string, payload: CreateSubTaskPayload) => api.post(`/task/${id}/subtask`, payload),

  updateSubTask: (id: string, taskId: string, payload: UpdateSubTaskPayload) => api.put(`/task/${id}/subtask/${taskId}`, payload),

  deleteSubTask: (id: string, taskId: string) => api.delete(`/task/${id}/subtask/${taskId}`),

};