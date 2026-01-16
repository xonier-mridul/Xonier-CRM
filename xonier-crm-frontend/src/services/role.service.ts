import api from "../lib/axios";
import { GetAllRolesPayload, UserRolePayload } from "../types/roles/roles.types";


export const RoleService = {
    getRoles : (data: GetAllRolesPayload)=> api.get(`/user-role/all?${`page=${data.currentPage}`}&${`limit=${data.pageLimit}`}`),
    getRolesWithoutPagination: ()=> api.get("/user-role/all/active/without-pagination"),
    create: (data: UserRolePayload)=> api.post("/user-role/create", data)
}