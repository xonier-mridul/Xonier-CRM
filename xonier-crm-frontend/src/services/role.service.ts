import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { GetAllRolesPayload, UserRolePayload } from "../types/roles/roles.types";


export const RoleService = {
    getRoles: (data?: GetAllRolesPayload) => {
  const params = new URLSearchParams();

  params.set("page", String(data?.currentPage ?? 1));
  params.set("limit", String(data?.pageLimit ?? 10));

  if (data?.filter?.search) {
    params.set("search", data.filter.search);
  }

  if (data?.filter?.name) {
    params.set("name", data.filter.name);
  }

  if (data?.filter?.code) {
    params.set("code", data.filter.code);
  }

  if (data?.filter?.action) {
    params.set("action", data.filter.action);
  }

  return api.get(`/user-role/all?${params.toString()}`);
},
    getRolesWithoutPagination: ()=> api.get("/user-role/all/active/without-pagination"),
    getRoleById: (id: ParamValue)=> api.get(`/user-role/get-by-id/${id}`),
    update: (id: ParamValue,payload:UserRolePayload)=>api.put(`/user-role/update/${id}`, payload),
    create: (data: UserRolePayload)=> api.post("/user-role/create", data),
    delete: (userId: string)=> api.delete(`/user-role/delete/${userId}`)
}