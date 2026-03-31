import api from "../lib/axios";
import { getPayLoad, StatusPayload } from "@/src/types/task/status.types";

export const StatusService = {
    getAll: (data: getPayLoad)=> api.get(`/task-status/all?${`page=${data.currentPage}`}&${`limit=${data.pageLimit}`} ${data.search && `&search=${data.search}`}`),
    getAllWithoutPagination: ()=> api.get("/status/all/active/without-pagination"),
    update: (id: string,payload:StatusPayload)=>api.put(`/task-status/update/${id}`,payload),
    create: (data: StatusPayload)=> api.post("/task-status/create", data),
    delete: (id: string)=> api.delete(`/task-status/delete/${id}`),
    getById: (id: string)=> api.get(`/task-status/by-category/${id}`)

}