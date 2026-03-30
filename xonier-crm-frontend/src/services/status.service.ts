import api from "../lib/axios";
import { getPayLoad, StatusPayload } from "@/src/types/task/status.types";

export const StatusService = {
    getAll: (data: getPayLoad)=> api.get(`/status/all?${`page=${data.currentPage}`}&${`limit=${data.pageLimit}`}`),
    getAllWithoutPagination: ()=> api.get("/status/all/active/without-pagination"),
    update: (id: string,payload:StatusPayload)=>api.put(`/status/update/${id}`, payload),
    create: (data: StatusPayload)=> api.post("/status/create", data),
    delete: (id: string)=> api.delete(`/status/delete/${id}`)
}