import api from "../lib/axios";
import { getPayLoad, StatusPayload } from "@/src/types/task/status.types";

export const StatusService = {
    getAll: (data: getPayLoad)=> {
        const params = new URLSearchParams();

        params.append("page", String(data.currentPage));
        params.append("limit", String(data.pageLimit));
        if(data.search){
            params.append("search", data.search);
        }
        if(data.category){
            params.append("category", data.category);
        }

        return api.get(`/task-status/all?${params.toString()}`);
    },
    getAllWithoutPagination: ()=> api.get("/status/all/active/without-pagination"),
    update: (id: string,payload:StatusPayload)=>api.put(`/task-status/update/${id}`,payload),
    create: (data: StatusPayload)=> api.post("/task-status/create", data),
    delete: (id: string)=> api.delete(`/task-status/delete/${id}`),
    getById: (id: string)=> api.get(`/task-status/by-category/${id}`)

}