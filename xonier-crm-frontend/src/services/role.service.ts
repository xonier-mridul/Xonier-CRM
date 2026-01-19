import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { GetAllRolesPayload, UserRolePayload } from "../types/roles/roles.types";


export const RoleService = {
    getRoles : (data: GetAllRolesPayload)=> api.get(`/user-role/all?${`page=${data.currentPage}`}&${`limit=${data.pageLimit}`}`),
    getRolesWithoutPagination: ()=> api.get("/user-role/all/active/without-pagination"),
    getRoleById: (id: ParamValue)=> api.get(`/user-role/get-by-id/${id}`),
    update: (id: ParamValue,payload:UserRolePayload)=>api.put(`/user-role/update/${id}`, payload),
    create: (data: UserRolePayload)=> api.post("/user-role/create", data),
    delete: (userId: string)=> api.delete(`/user-role/delete/${userId}`)
}