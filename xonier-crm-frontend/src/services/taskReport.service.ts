import api from "../lib/axios";
import {
  CreateMorningAgendaPayload,
  TaskReportListParams,
  UpdateEveningReportPayload
} from "../types/task/taskReport";
import { ParamValue } from "next/dist/server/request/params";

export const TaskReportService = {
  getAll: (params: TaskReportListParams) =>{
    return api.get(`/task-reports/all?${params.page ? `page=${params.page}` : ""}${params.limit ? `&limit=${params.limit}` : ""}${params.search ? `&search=${params.search}` : ""}${params.fromDate ? `&fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`);
  },
  getMine: (params: TaskReportListParams) =>
    api.get(`/task-reports/my-reports?${params.page ? `page=${params.page}` : ""}${params.limit ? `&limit=${params.limit}` : ""}${params.search ? `&search=${params.search}` : ""}`),

  getById: (id: ParamValue) =>
    api.get(`/task-reports/by-users/tasks?userIds=${id}`),

  createMorningAgenda: (payload: CreateMorningAgendaPayload) =>
    api.post(`/task-reports/morning/submit`, payload),

  updateMorningAgenda: (id: ParamValue, payload: Partial<CreateMorningAgendaPayload>) =>
    api.patch(`/task-reports/${id}/morning/update`, payload),

  submitEveningReport: (id: ParamValue, payload: UpdateEveningReportPayload) =>
    api.post(`/task-reports/${id}/evening/submit`, payload),

  updateEveningReport: (id: ParamValue, payload: UpdateEveningReportPayload) =>
    api.patch(`/task-reports/${id}/evening/update`, payload),

  reviewReport: (id: ParamValue, comment: string) =>
    api.patch(`/task-reports/${id}/review`, { managerComment: comment }),

  deleteReport: (id: string) =>
    api.delete(`/task-reports/${id}`),
  getToday: (id: ParamValue) =>
    api.get(`/task-reports/${id}`)
};