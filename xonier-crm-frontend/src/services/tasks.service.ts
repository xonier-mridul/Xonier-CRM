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
  PaginatedTaskResponse,
  TaskItem,
} from "@/src/types/task/task.types";

interface GetAllParams {
  currentPage: number;
  pageLimit:   number;
  status?:     string;
  priority?:   string;
  category?:   string;
  search?:     string;
}

export const TaskService = {
  getAll: ({ currentPage, pageLimit, status, priority, category, search }: GetAllParams) => {
    const params = new URLSearchParams({
      page:  String(currentPage),
      limit: String(pageLimit),
      ...(status   && { status }),
      ...(priority && { priority }),
      ...(category && { category }),
      ...(search   && { search }),
    });
    return api.get(`/task/all?${params.toString()}`);
  },

  getById: (id: string) =>
    api.get<{ data: TaskItem }>(`/task/${id}`),

  create: (payload: CreateTaskPayload) =>
    api.post("/task/create", payload),

  update: (id: string, payload: UpdateTaskPayload) =>
    api.put(`/task/update/${id}`, payload),

  updateStatus: (id: string, payload: UpdateTaskStatusPayload) =>
    api.patch(`/task/status/${id}`, payload),

  updatePriority: (id: string, payload: UpdateTaskPriorityPayload) =>
    api.patch(`/task/${id}/priority`, payload),

  assign: (id: string, payload: AssignTaskPayload) =>
    api.patch(`/task/${id}/assign`, payload),

  move: (id: string, payload: MoveTaskPayload) =>
    api.patch(`/task/${id}/move`, payload),

  reorder: (payload: ReorderTaskPayload) =>
    api.patch("/task/reorder", payload),

  bulkAssign: (payload: BulkAssignTaskPayload) =>
    api.patch("/task/bulk-assign", payload),

  bulkStatusUpdate: (payload: BulkStatusUpdatePayload) =>
    api.patch("/task/bulk-status", payload),

  addWatcher: (id: string, payload: AddWatcherPayload) =>
    api.post(`/task/${id}/watcher`, payload),

  delete: (id: string) =>
    api.delete(`/task/${id}`),
};