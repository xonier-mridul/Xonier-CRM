import api from "../lib/axios"; 
import {getPayLoad, CategoryPayload } from "@/src/types/task/category.types";

export const CategoryService = {
    getAll: (data: getPayLoad)=> api.get(`/task-category/all?${`page=${data.currentPage}`}&${`limit=${data.pageLimit}`} ${data.search && `&search=${data.search}`}`),
    create: (data:CategoryPayload )=> api.post("/task-category/create", data),
    update: (id: string,payload:CategoryPayload)=>api.put(`/task-category/update/${id}`, payload),
    delete: (id: string)=> api.delete(`/task-category/delete/${id}`)
}