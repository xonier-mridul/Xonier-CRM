import api from "../lib/axios";
import { GetTeamCategoryParams, TeamCategoryCreatePayload } from "../types/team/team.types";



export const TeamCategoryService = {
    create: (payload: TeamCategoryCreatePayload)=> api.post("/team-category/create", payload),
    getAll:(params: GetTeamCategoryParams)=> api.get(`/team-category/all?${params.page && `page=${params.page}`}${params.limit &&`&limit=${params.limit}`}`),
    getAllWithoutPagination: ()=>api.get("/team-category/get-all-without-pagination"),
    delete: (id: string)=> api.delete(`/team-category/delete/${id}`)

}