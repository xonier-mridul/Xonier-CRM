import { ParamValue } from "next/dist/server/request/params";
import api from "../lib/axios";
import { GetTeamCategoryParams, TeamCreatePayload, TeamUpdatePayload } from "../types/team/team.types";




export const TeamService = {
    create: (payload: TeamCreatePayload)=> api.post("/team/create", payload),
    getAll: (params: GetTeamCategoryParams) => api.get(`/team/all?${params.page && `page=${params.page}`}${params.limit &&`&limit=${params.limit}`}`),
    getById: (id:ParamValue)=> api.get(`/team/get-by-id/${id}`),
    update:(id: ParamValue, payload: TeamUpdatePayload)=> api.put(`/team/update/${id}`, payload),
    delete: (id:string)=> api.delete(`/team/delete/${id}`)
}